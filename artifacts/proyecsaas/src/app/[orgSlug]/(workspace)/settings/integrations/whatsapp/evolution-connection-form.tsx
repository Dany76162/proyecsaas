"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getEvolutionQrAction, 
  checkEvolutionStatusAction, 
  disconnectEvolutionAction 
} from "./actions";

type Props = {
  orgSlug: string;
  initialStatus?: string;
};

export function EvolutionConnectionForm({ orgSlug, initialStatus = "INACTIVE" }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!confirm("¿Estás seguro de desconectar tu número?")) return;
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
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="rounded-xl bg-white border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
          >
            {loading ? "Procesando..." : "Desconectar número"}
          </button>
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
