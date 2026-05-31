"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createLeadFromPublicPropertyAction } from "@/modules/leads/actions";

type PublicLeadFormProps = {
  orgSlug: string;
  propertyId: string;
};

export function PublicLeadForm({ orgSlug, propertyId }: PublicLeadFormProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Client-side validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Por favor, ingresá tu nombre completo (mínimo 2 caracteres).");
      return;
    }

    if (!phone.trim() || phone.trim().length < 6) {
      setError("Por favor, ingresá un número de teléfono o WhatsApp válido.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Por favor, ingresá una dirección de email válida.");
      return;
    }

    if (message.length > 1000) {
      setError("El mensaje no puede superar los 1000 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createLeadFromPublicPropertyAction({
        orgSlug,
        propertyId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        honeypot: honeypot || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setFullName("");
        setPhone("");
        setEmail("");
        setMessage("");
      } else {
        setError(res.error ?? "Ocurrió un error inesperado al enviar la consulta.");
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error de red o de servidor. Por favor, intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-green-100 bg-green-50/50 p-6 text-center space-y-4 shadow-sm animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-150 text-green-600 mx-auto">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-green-900">Consulta enviada con éxito</h4>
          <p className="text-xs font-semibold text-green-700 leading-relaxed max-w-xs mx-auto">
            La inmobiliaria se pondrá en contacto pronto para asesorarte.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-green-600 hover:bg-green-700 px-4 text-xs font-bold text-white transition-all shadow-sm"
        >
          Enviar otra consulta
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-start gap-2 animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Honeypot anti-spam invisible field */}
      <div style={{ display: "none" }} aria-hidden="true">
        <label htmlFor="website">Confirmá tu sitio web si eres humano</label>
        <input
          id="website"
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="fullName">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          placeholder="Ej: Orlando Diaz"
          required
          disabled={isSubmitting}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-semibold transition-all duration-200 outline-none disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="phone">
          Teléfono / WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="Ej: +54 9 11 1234-5678"
          required
          disabled={isSubmitting}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-semibold transition-all duration-200 outline-none disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="email">
          Email <span className="text-slate-400 font-normal">(Opcional)</span>
        </label>
        <input
          id="email"
          type="email"
          placeholder="Ej: orlando@ejemplo.com"
          disabled={isSubmitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-semibold transition-all duration-200 outline-none disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="message">
            Mensaje <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <span className="text-[9px] font-bold text-slate-400">{message.length}/1000</span>
        </div>
        <textarea
          id="message"
          rows={3}
          placeholder="Contanos tu consulta o disponibilidad para coordinar visita..."
          disabled={isSubmitting}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-semibold transition-all duration-200 outline-none resize-none disabled:opacity-50"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-bold tracking-wider uppercase text-white shadow-md transition-all duration-200 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4.5 w-4.5" />
              Enviar consulta
            </>
          )}
        </button>
      </div>
    </form>
  );
}
