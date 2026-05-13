"use client";

import { useState } from "react";
import { EmailEditor } from "@/components/prospecting/email-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Info, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { createCampaignAction } from "@/modules/prospecting/campaign-actions";
import { Card } from "@/components/ui/card";

export function CampaignForm({ prospectCount }: { prospectCount: number }) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("body", body);
    
    try {
      await createCampaignAction(formData);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
      <div className="space-y-8">
        <Card className="p-8 rounded-[2.5rem] border-slate-200 shadow-soft bg-white">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nombre de la Campaña</label>
              <Input name="name" placeholder="Ej: Lanzamiento RaicesPilot - Inmobiliarias CABA" required />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Asunto del Email</label>
              <Input name="subject" placeholder="Ej: Nueva herramienta de gestión para tu inmobiliaria" required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Cuerpo del Mensaje (Enriquecido)</label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black text-brand-600 hover:bg-brand-50">
                  <Sparkles className="mr-1 h-3 w-3" /> Generar con IA
                </Button>
              </div>
              <EmailEditor 
                initialValue="" 
                onChange={setBody} 
                placeholder="Escribí aquí tu mensaje..." 
              />
              <p className="text-[11px] text-slate-400 font-medium italic mt-2">
                 Podés usar etiquetas como {"{{companyName}}"} y se incluirá un link de desuscripción automáticamente.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <aside className="space-y-6 sticky top-8">
        <Card className="p-8 rounded-[2rem] border-slate-200 bg-white shadow-soft">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-500" /> Resumen
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Destinatarios:</span>
              <span className="text-slate-900">{prospectCount}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Canal:</span>
              <span className="text-slate-900 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-500">Métricas:</span>
              <span className="text-emerald-600">Tracking Activo</span>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 bg-slate-900 hover:bg-black font-black rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Creando..." : "Continuar a revisión"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-slate-200 bg-emerald-50/30 border-emerald-100">
           <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                 Editor visual habilitado para campañas premium.
              </p>
           </div>
        </Card>
      </aside>
    </form>
  );
}
