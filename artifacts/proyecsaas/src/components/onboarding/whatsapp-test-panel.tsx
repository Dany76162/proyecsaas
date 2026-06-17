"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { getOnboardingTestStatusAction } from "@/app/[orgSlug]/(workspace)/onboarding/actions";

const POLL_MS = 4000;

export function WhatsAppTestPanel({
  orgSlug,
  displayPhoneNumber,
  initialHasConversation,
}: {
  orgSlug: string;
  displayPhoneNumber: string | null;
  initialHasConversation: boolean;
}) {
  const router = useRouter();
  const [detected, setDetected] = useState(initialHasConversation);
  const redirected = useRef(false);

  const digits = displayPhoneNumber ? displayPhoneNumber.replace(/\D/g, "") : "";
  const waLink = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent("Hola, quiero probar el agente de mi inmobiliaria.")}`
    : null;

  // Polling: cuando entra la primera conversación, redirige al Inbox IA (el WOW).
  useEffect(() => {
    if (initialHasConversation) return; // ya probado: no auto-redirigir si vuelve a entrar
    let active = true;

    const tick = async () => {
      try {
        const res = await getOnboardingTestStatusAction(orgSlug);
        if (active && res.hasConversation && !redirected.current) {
          redirected.current = true;
          setDetected(true);
          setTimeout(() => router.push(`/${orgSlug}/conversations`), 1200);
        }
      } catch {
        // silencioso: reintenta en el próximo tick
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [orgSlug, initialHasConversation, router]);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
          <MessageCircle className="h-6 w-6" fill="currentColor" strokeWidth={0} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-950">Probá tu agente</h1>
          <p className="text-sm font-medium text-slate-500">
            Mandá un WhatsApp a tu propio número y mirá a la IA responder y crear la oportunidad sola.
          </p>
        </div>
      </div>

      {displayPhoneNumber ? (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tu número conectado</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{displayPhoneNumber}</p>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1fbb57]"
            >
              <MessageCircle className="h-4 w-4" fill="currentColor" strokeWidth={0} />
              Abrir WhatsApp y escribir
            </a>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-800">
          Todavía no detectamos un número de WhatsApp activo. Completá el paso “Conectá tu WhatsApp” antes de probar.
        </div>
      )}

      {/* Estado en vivo */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-100 p-4 text-sm font-semibold">
        {initialHasConversation ? (
          <span className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Ya recibiste mensajes. Entrá al Inbox IA cuando quieras.
          </span>
        ) : detected ? (
          <span className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            ¡Llegó tu primer mensaje! Llevándote al Inbox IA…
          </span>
        ) : (
          <span className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            Esperando tu primer mensaje…
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/${orgSlug}/conversations`}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
        >
          Ir al Inbox IA ahora <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/${orgSlug}/onboarding`}
          className="inline-flex items-center rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
        >
          Volver a la puesta en marcha
        </Link>
      </div>
    </div>
  );
}
