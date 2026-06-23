"use client";

import { useState } from "react";
import { CreditCard, Loader2, MessageCircle, Lock } from "lucide-react";

interface LotPublicCTAProps {
  lotId: string;
  lotNumber: string;
  lotLabel: string;
  developmentName: string;
  status: string;
  contactPhone: string | null;
  /** Seña de la etapa del lote, resuelta en el server. null si no hay reserva online disponible. */
  senaAmount: number | null;
  senaCurrency: string | null;
}

/** Builds a wa.me link from a free-form phone + prefilled message. */
function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function LotPublicCTA({
  lotId,
  lotNumber,
  lotLabel,
  developmentName,
  status,
  contactPhone,
  senaAmount,
  senaCurrency,
}: LotPublicCTAProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError] = useState("");

  const isAvailable = status === "AVAILABLE";
  const hasSena = senaAmount != null && senaAmount > 0 && !!senaCurrency;
  const canReserveOnline = isAvailable && hasSena;

  const whatsappUrl = contactPhone
    ? buildWhatsAppUrl(
        contactPhone,
        `Hola, me interesa el ${lotLabel} del desarrollo ${developmentName}. ¿Podrían darme más información?`,
      )
    : null;

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      setError("Por favor completá todos los campos.");
      return;
    }
    setIsReserving(true);
    setError("");
    try {
      const res = await fetch(`/api/developments/lots/${lotId}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name, email, telefono: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar la reserva");
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || "Error al intentar realizar la reserva.");
    } finally {
      setIsReserving(false);
    }
  };

  const senaLabel = hasSena
    ? `${senaCurrency!.toUpperCase()} ${senaAmount!.toLocaleString("es-AR")}`
    : null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        ¿Te interesa este lote?
      </h3>

      {/* ── Estado no disponible: solo mensaje + contacto ── */}
      {!isAvailable && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-2">
          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            {status === "SOLD"
              ? "Este lote ya fue vendido. Consultá por otras unidades disponibles."
              : status === "RESERVED" || status === "RESERVED_PENDING"
                ? "Este lote tiene una reserva en curso. Dejanos tu consulta por si se libera o por otras unidades."
                : "Este lote no está disponible en este momento. Consultá por otras opciones."}
          </p>
        </div>
      )}

      {/* ── Reserva online (solo disponible + seña configurada) ── */}
      {canReserveOnline && !showForm && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-2">
          <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            Reservar online con seña
          </h4>
          <p className="text-[10px] text-emerald-700/80 leading-relaxed">
            El lote se bloquea por <strong>15 minutos</strong> mientras completás el pago de
            la seña. Si no se confirma en ese plazo, vuelve a estar disponible.
          </p>
          {senaLabel && (
            <div className="flex items-center justify-between bg-white/60 rounded-lg px-2.5 py-1.5 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 font-semibold">Seña de reserva</span>
              <span className="text-xs font-black text-emerald-800">{senaLabel}</span>
            </div>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition shadow-md shadow-emerald-600/10"
          >
            Iniciar reserva online
          </button>
        </div>
      )}

      {/* ── Formulario de reserva ── */}
      {canReserveOnline && showForm && (
        <form
          onSubmit={handleReserveSubmit}
          className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-2.5"
        >
          <h4 className="text-xs font-bold text-slate-700">Formulario de reserva</h4>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Nombre completo</label>
            <input
              type="text"
              required
              placeholder="Ej. Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Email</label>
            <input
              type="email"
              required
              placeholder="Ej. juan@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400">Teléfono</label>
            <input
              type="tel"
              required
              placeholder="Ej. +5491155556666"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-[10px] font-medium text-red-500 leading-tight">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="flex-1 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold py-1.5 rounded-lg text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isReserving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white font-bold py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1 shadow-md"
            >
              {isReserving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reservando...
                </>
              ) : (
                "Pagar seña"
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── Disponible pero sin seña configurada → contactar para coordinar ── */}
      {isAvailable && !hasSena && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Lote disponible. Contactá al vendedor para coordinar la reserva y la seña.
        </p>
      )}

      {/* ── WhatsApp (siempre que haya teléfono) ── */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-white shadow-sm"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle className="w-4 h-4" />
          Consultar por WhatsApp
        </a>
      )}
    </div>
  );
}
