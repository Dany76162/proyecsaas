import { ArrowLeft, Target, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PROSPECT_COMPANY_TYPE_LABELS } from "@/modules/prospecting/types";
import { createProspectAction } from "@/modules/prospecting/actions";

export default function NewProspectPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Prospecto</h1>
          <p className="text-slate-500 font-medium mt-1">Ingresa los datos comerciales de la empresa.</p>
        </div>
      </div>

      <Card className="rounded-[2rem] border-slate-200 shadow-soft overflow-hidden">
        <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-400">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Datos de Identidad</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Información corporativa base</p>
          </div>
        </div>

        <form action={createProspectAction} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Nombre de la Empresa *</label>
              <Input name="companyName" required placeholder="Ej: Inmobiliaria Central" className="h-12 rounded-xl border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Tipo de Empresa</label>
              <select 
                name="companyType" 
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:border-brand-500 outline-none"
                defaultValue="REAL_ESTATE_AGENCY"
              >
                {Object.entries(PROSPECT_COMPANY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Sitio Web</label>
              <Input name="website" placeholder="www.empresa.com" className="h-12 rounded-xl border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Email Comercial</label>
              <Input name="email" type="email" placeholder="contacto@empresa.com" className="h-12 rounded-xl border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Teléfono / WhatsApp</label>
              <Input name="whatsapp" placeholder="+54 9 ..." className="h-12 rounded-xl border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">País</label>
              <Input name="country" placeholder="Argentina" className="h-12 rounded-xl border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Ciudad</label>
              <Input name="city" placeholder="Buenos Aires" className="h-12 rounded-xl border-slate-200" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Notas Internas</label>
            <Textarea name="notes" placeholder="Algún detalle relevante..." className="min-h-[100px] rounded-2xl border-slate-200" />
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Modo Superadmin Asistido</p>
            </div>
            <Button type="submit" className="h-12 px-10 bg-slate-900 font-bold">
              Crear Prospecto
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
