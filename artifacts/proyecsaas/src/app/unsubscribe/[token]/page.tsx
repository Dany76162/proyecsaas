import { Metadata } from "next";
import { verifyUnsubscribeToken } from "@/modules/prospecting/campaign-service";
import { prisma } from "@/server/db/prisma";
import { Globe, CheckCircle2, ShieldCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Desuscribirse - RaicesPilot",
  description: "Gestioná tus preferencias de contacto.",
};

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const prospectId = verifyUnsubscribeToken(token);

  if (!prospectId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl text-center">
           <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6">
              <MailX className="h-8 w-8" />
           </div>
           <h1 className="text-2xl font-black text-slate-900 mb-4">Enlace inválido</h1>
           <p className="text-slate-500 font-medium leading-relaxed">
             El enlace de desuscripción ya no es válido o ha expirado. Si seguís recibiendo correos, contactanos directamente.
           </p>
           <Button asChild className="mt-8 bg-slate-900 rounded-xl h-12 px-8">
              <Link href="/">Ir al inicio</Link>
           </Button>
        </div>
      </div>
    );
  }

  const prospect = await prisma.commercialProspect.findUnique({
    where: { id: prospectId }
  });

  if (!prospect) {
    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
         <p className="text-slate-400">Prospecto no encontrado.</p>
       </div>
    );
  }

  // Perform unsubscribe
  await prisma.$transaction([
    prisma.commercialProspect.update({
      where: { id: prospectId },
      data: {
        status: "DO_NOT_CONTACT",
        isDoNotContact: true,
        doNotContactReason: "Baja solicitada vía link público",
        manualStatus: "NO_CONTACTAR"
      }
    }),
    prisma.prospectingSuppression.upsert({
      where: { email: prospect.email || "" },
      update: { reason: "UNSUBSCRIBED", source: "Public Link" },
      create: { 
        email: prospect.email || "", 
        reason: "UNSUBSCRIBED", 
        source: "Public Link" 
      }
    })
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 text-center relative overflow-hidden border border-slate-100">
         <div className="absolute top-0 left-0 w-full h-2 bg-brand-500" />
         
         <div className="mx-auto w-20 h-20 rounded-[2rem] bg-emerald-50 flex items-center justify-center text-emerald-600 mb-8">
            <CheckCircle2 className="h-10 w-10" />
         </div>

         <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Desuscripción Exitosa</h1>
         <p className="text-slate-500 font-medium text-lg leading-relaxed mb-8">
            Hemos procesado tu solicitud. Tu correo <span className="font-bold text-slate-900">{prospect.email}</span> ha sido removido de nuestras listas de prospección.
         </p>

         <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
            <div className="flex gap-3 text-slate-400 mb-2">
               <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
               <p className="text-[11px] font-bold uppercase tracking-widest">Política de Privacidad</p>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
               En RaicesPilot respetamos tu tiempo y privacidad. No volverás a recibir correos automáticos de prospección desde esta plataforma.
            </p>
         </div>

         <div className="flex flex-col items-center gap-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
               Powered by RaicesPilot AgentOS
            </p>
         </div>
      </div>
    </div>
  );
}
