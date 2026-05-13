"use client";

import { useActionState } from "react";
import { requestWhatsAppConnectionAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

export function RequestConnectionForm({ orgSlug }: { orgSlug: string }) {
  const [state, action, isPending] = useActionState(requestWhatsAppConnectionAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900">Solicitud enviada</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Recibimos tu solicitud para conectar un número propio de WhatsApp Business. 
          Nuestro equipo se pondrá en contacto con vos al email de contacto para coordinar los pasos técnicos con Meta.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">
            Número de WhatsApp a conectar
          </label>
          <Input 
            name="requestedPhoneNumber" 
            placeholder="+54 9 11 ..." 
            required 
            className="rounded-xl border-slate-200 focus:border-brand-500"
          />
          <p className="text-[10px] text-slate-400 font-medium">Incluí código de país y área.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">
            Nombre comercial (Display Name)
          </label>
          <Input 
            name="businessName" 
            placeholder="Ej: Inmobiliaria Central" 
            required 
            className="rounded-xl border-slate-200 focus:border-brand-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">
            Persona de contacto
          </label>
          <Input 
            name="contactName" 
            placeholder="Nombre y apellido" 
            required 
            className="rounded-xl border-slate-200 focus:border-brand-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">
            Email de contacto
          </label>
          <Input 
            name="contactEmail" 
            type="email"
            placeholder="email@empresa.com" 
            required 
            className="rounded-xl border-slate-200 focus:border-brand-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-slate-500">
          Notas adicionales (opcional)
        </label>
        <textarea 
          name="notes" 
          placeholder="Comentanos si ya tenés una cuenta de Meta Business configurada o cualquier otro detalle..." 
          className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {state?.message && !state.success && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-600 border border-rose-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={isPending}
        className="w-full md:w-auto h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando solicitud...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Solicitar conexión de número propio
          </>
        )}
      </Button>
    </form>
  );
}
