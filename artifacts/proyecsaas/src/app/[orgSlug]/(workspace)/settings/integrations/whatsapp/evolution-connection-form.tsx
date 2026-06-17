"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getEvolutionQrAction,
  checkEvolutionStatusAction,
  disconnectEvolutionAction,
  resubscribeWhatsappWebhookAction,
  setWhatsappNumberAction
} from "./actions";

type Props = {
  orgSlug: string;
  initialStatus?: string;
  initialNumber?: string | null;
};

// Un número válido tiene dígitos (no el id falso "org_...").
function isValidNumber(n?: string | null): boolean {
  return Boolean(n && /\d/.test(n) && !n.includes("org_"));
}

export function EvolutionConnectionForm({ orgSlug, initialStatus = "INACTIVE", initialNumber = null }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [webhookState, setWebhookState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const [number, setNumber] = useState<string | null>(isValidNumber(initialNumber) ? initialNumber! : null);
  const [numberInput, setNumberInput] = useState("");
  const [numberState, setNumberState] = useState<"idle" | "loading" | "saving">("idle");
  const [numberAutoTried, setNumberAutoTried] = useState(false);

  const captureNumber = useCallback(async (manual?: string) => {
    setNumberState(manual ? "saving" : "loading");
    try {
      const res = await setWhatsappNumberAction(orgSlug, manual);
      if (res.success && res.number) setNumber(res.number);
    } finally {
      setNumberState("idle");
    }
  }, [orgSlug]);

  // Si está conectado pero sin número válido, intentar capturarlo automáticamente una vez.
  useEffect(() => {
    if (status === "ACTIVE" && !number && !numberAutoTried) {
      setNumberAutoTried(true);
      void captureNumber();
    }
  }, [status, number, numberAutoTried, captureNumber]);

  const activateWebhook = useCallback(async () => {
    setWebhookState("loading");
    setWebhookMsg(null);
    try {
      const res = await resubscribeWhatsappWebhookAction(orgSlug);
      setWebhookState(res.success ? "ok" : "error");
      setWebhookMsg(res.message);
    } catch {
      setWebhookState("error");
      setWebhookMsg("No se pudo activar la recepción de mensajes.");
    }
  }, [orgSlug]);

  // Al abrir la página con el WhatsApp ya conectado, asegurar el webhook de
  // recepción (autorrepara instancias conectadas que quedaron sin webhook).
  useEffect(() => {
    if (status === "ACTIVE" && webhookState === "idle") {
      void activateWebhook();
    }
  }, [status, webhookState, activateWebhook]);

  const fetchQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEvolutionQrAction(orgSlug);
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
      } else {
        // More descriptive error for the user
        const displayError = result.message?.includes("Configuración") 
          ? "El servidor no está configurado correctamente (faltan variables)." 
          : result.message || "No se pudo generar el QR. Reintentá en unos segundos.";
        setError(displayError);
      }
    } catch (err) {
      setError("Error de conexión con el puente de WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  // Polling for connection status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status !== "ACTIVE" && qrCode) {
      interval = setInterval(async () => {
        const result = await checkEvolutionStatusAction(orgSlug);
        if (result.success && result.status === "CONNECTED") {
          setStatus("ACTIVE");
          setQrCode(null);
          clearInterval(interval);
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [status, qrCode, orgSlug]);

  async function handleDisconnect() {
    setShowDisconnectConfirm(false);
    setLoading(true);
    try {
      await disconnectEvolutionAction(orgSlug);
      setStatus("INACTIVE");
      setQrCode(null);
    } catch (err) {
      setError("Error al desconectar");
    } finally {
      setLoading(false);
    }
  }

  if (status === "ACTIVE") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-soft">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">WhatsApp Conectado</p>
              <p className="text-xs text-emerald-700">Tu número personal está vinculado y la IA está activa.</p>
              <div className="mt-1.5 text-xs font-semibold">
                {webhookState === "loading" && <span className="text-slate-500">Activando recepción de mensajes…</span>}
                {webhookState === "ok" && <span className="text-emerald-700">✓ Recepción de mensajes activa</span>}
                {webhookState === "error" && (
                  <span className="text-rose-600">
                    ⚠ La recepción de mensajes no quedó activa.{" "}
                    <button onClick={activateWebhook} className="underline hover:text-rose-700">Reintentar</button>
                    {webhookMsg ? <span className="block font-normal text-rose-500">{webhookMsg}</span> : null}
                  </span>
                )}
              </div>

              {/* Número propio — necesario para el enlace/QR para compartir */}
              <div className="mt-1 text-xs">
                {number ? (
                  <span className="font-semibold text-emerald-800">📞 Tu número: +{number.replace(/\D/g, "")}</span>
                ) : numberState === "loading" ? (
                  <span className="text-slate-500">Detectando tu número…</span>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                    <span className="font-semibold text-amber-800">Confirmá tu número para que el enlace y el QR funcionen:</span>
                    <input
                      value={numberInput}
                      onChange={(e) => setNumberInput(e.target.value)}
                      placeholder="+54 9 11 2577-7901"
                      className="w-44 rounded-md border border-amber-300 px-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={() => captureNumber(numberInput)}
                      disabled={numberState === "saving" || !numberInput.trim()}
                      className="rounded-md bg-amber-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                    >
                      {numberState === "saving" ? "Guardando…" : "Guardar número"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {!showDisconnectConfirm ? (
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              disabled={loading}
              className="rounded-xl bg-white border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
            >
              {loading ? "Procesando..." : "Desconectar número"}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <span className="text-xs font-semibold text-rose-700">¿Confirmar desconexión?</span>
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >Cancelar</button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >Sí, desconectar</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!qrCode ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-white border border-slate-100 flex items-center justify-center text-2xl mb-4 shadow-sm">📱</div>
          <h3 className="text-lg font-bold text-slate-900">Conectá tu propio WhatsApp</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Escaneá un código QR para que la IA responda desde tu propio número. Sin trámites en Meta Business.
          </p>
          <button
            onClick={fetchQr}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Generando QR..." : "Vincular con QR"}
          </button>
          {error && <p className="mt-4 text-xs font-bold text-rose-600">{error}</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-3xl border-4 border-slate-50 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 block" />
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Esperando escaneo...</span>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-slate-900">Pasos para vincular:</h4>
              <ol className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">1</span>
                  Abrí WhatsApp en tu teléfono.
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">2</span>
                  Tocá Menú o Configuración y seleccioná <b>Dispositivos vinculados</b>.
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">3</span>
                  Tocá <b>Vincular un dispositivo</b> y apuntá tu cámara a este código.
                </li>
              </ol>

              {/* Banner de mitigación B2B sobre advertencia de San Francisco */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                <div className="flex gap-3">
                  <span className="text-xl select-none">🔒</span>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900">Nota de seguridad importante:</h5>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Al escanear el código, WhatsApp podría advertirte que estás vinculando un dispositivo en <b>San Francisco, California</b>. Esto es <b>100% normal y seguro</b>: se debe a que nuestros servidores de procesamiento de IA de alta velocidad están alojados en la nube de Railway en EE.UU. Hacé clic en <b>"Vincular dispositivo"</b> en tu celular con absoluta confianza.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={fetchQr}
                  disabled={loading}
                  className="mt-4 text-xs font-bold text-brand-600 hover:text-brand-700 underline flex items-center gap-1"
                >
                  {loading ? "Generando..." : "Generar nuevo QR"}
                </button>
                <button
                  onClick={() => setQrCode(null)}
                  className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
