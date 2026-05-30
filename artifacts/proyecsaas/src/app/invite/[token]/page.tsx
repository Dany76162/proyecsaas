import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap, AlertCircle, Building2, ArrowLeft } from "lucide-react";
import { Montserrat } from "next/font/google";

import { prisma } from "@/server/db/prisma";
import { InviteAcceptForm } from "./invite-accept-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getWhatsAppLink } from "@/lib/constants";

const montserrat = Montserrat({ subsets: ["latin"] });

type InvitePageState = {
  usedAt: Date | null;
  expiresAt: Date;
  organization: { name: string; slug: string } | null;
  user: { email: string; fullName: string } | null;
};

async function getInvitePageState(token: string): Promise<InvitePageState | null> {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      organizationId: true,
      user: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
  });

  if (!invite) {
    return null;
  }

  const organization = invite.organizationId
    ? await prisma.organization.findUnique({
        where: { id: invite.organizationId },
        select: {
          name: true,
          slug: true,
        },
      })
    : null;

  return {
    usedAt: invite.usedAt,
    expiresAt: invite.expiresAt,
    organization,
    user: invite.user,
  };
}

function buildInvalidState(invite: Pick<InvitePageState, "usedAt" | "expiresAt" | "organization"> | null) {
  if (!invite) {
    return {
      title: "Invitación inválida",
      message:
        "Este enlace no existe o fue modificado. Pedí un nuevo acceso a la inmobiliaria.",
      actionLabel: "Volver al login",
      actionHref: "/login",
    };
  }

  if (invite.usedAt) {
    return {
      title: "Invitación ya utilizada",
      message:
        "Este acceso ya fue activado anteriormente. Iniciá sesión con el email invitado y tu clave.",
      actionLabel: "Ir a login",
      actionHref: "/login",
    };
  }

  return {
    title: "Invitación expirada",
    message:
      "El enlace de acceso venció. Pedí a la inmobiliaria o al administrador que genere una nueva invitación.",
    actionLabel: "Ir a login",
    actionHref: "/login",
  };
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInvitePageState(token);

  const isInvalid = !invite;
  const isUsed = !!invite?.usedAt;
  const isExpired = !!invite && invite.expiresAt < new Date();

  const invalidState = (isInvalid || isUsed || isExpired) ? buildInvalidState(
    invite
      ? {
          usedAt: invite.usedAt,
          expiresAt: invite.expiresAt,
          organization: invite.organization,
        }
      : null,
  ) : null;

  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row bg-white", montserrat.className)}>
      {/* Lado Izquierdo - Institucional (60%) */}
      <div className="relative hidden lg:flex lg:w-[60%] flex-col items-center justify-center bg-[#020617] px-24 py-12 text-white overflow-hidden border-r border-white/5">
        {/* Fondo abstracto institucional refinado */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] h-[800px] w-[800px] rounded-full bg-brand-900/10 blur-[160px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[700px] w-[700px] rounded-full bg-slate-900/30 blur-[140px]" />
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.015) 1px, transparent 0)`,
              backgroundSize: '64px 64px' 
            }} 
          />
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
          {/* Logo Oficial RaícesPilot (Tamaño Imponente) */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 -mt-36 -mb-36">
            <Image
              src="/brand/raices_pilot_logo_transparent.png"
              alt="RaícesPilot"
              width={1000}
              height={500}
              className="h-auto w-[750px] max-w-full opacity-100 drop-shadow-2xl pointer-events-none"
              priority
            />
          </div>
          
          <p className="-mt-12 text-xl text-slate-400 leading-relaxed font-medium max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 relative z-20">
            Unite a la inmobiliaria y empezá a gestionar tus operaciones con la infraestructura comercial más avanzada.
          </p>

          <div className="mt-24 grid grid-cols-2 gap-12 w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <div className="flex flex-col items-center group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-xl transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20">
                <CheckCircle2 className="h-7 w-7 text-brand-400" />
              </div>
              <div className="mt-5">
                <h3 className="font-bold text-lg text-slate-100">Atención 24/7</h3>
                <p className="mt-1.5 text-sm text-slate-500 font-medium">CRM, WhatsApp e IA integrados.</p>
              </div>
            </div>

            <div className="flex flex-col items-center group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-xl transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20">
                <Zap className="h-7 w-7 text-brand-400" />
              </div>
              <div className="mt-5">
                <h3 className="font-bold text-lg text-slate-100">Conversión</h3>
                <p className="mt-1.5 text-sm text-slate-500 font-medium">Respondé en segundos y vendé más.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer institucional */}
        <div className="absolute bottom-12 inset-x-0 flex items-center justify-center gap-12 text-[10px] font-bold uppercase tracking-[0.5em] text-slate-600/80">
          <span>v3.1 Stable</span>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <span>Inmuebles Digitales © 2026</span>
        </div>
      </div>

      {/* Lado Derecho - Formulario / Estado (40%) */}
      <div className="flex flex-1 flex-col items-center justify-center px-12 py-12 lg:w-[40%] bg-slate-50/20">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="mb-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Ícono de Brújula Oscuro */}
            <div className="-mb-4">
              <Image 
                src="/brand/logo_transparent_icon.png" 
                alt="Logo RaícesPilot" 
                width={300} 
                height={300} 
                className="h-auto w-[240px] brightness-0 opacity-95 pointer-events-none" 
              />
            </div>
            
            {invalidState ? (
              <>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-4xl font-black tracking-tight text-slate-950">
                  {invalidState.title}
                </h3>
                <p className="mt-3 text-slate-500 font-medium text-lg">
                  {invalidState.message}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-4xl font-black tracking-tight text-slate-950">
                  Activá tu acceso
                </h3>
                <p className="mt-3 text-slate-500 font-medium text-lg">
                  Completá tu perfil para ingresar al workspace.
                </p>
              </>
            )}
          </div>

          <Card variant="default" className="border-none bg-transparent shadow-none p-0">
            {!invalidState ? (
              <InviteAcceptForm
                token={token}
                email={invite!.user?.email ?? ""}
                organizationName={invite!.organization?.name ?? "Inmobiliaria"}
                organizationSlug={invite!.organization?.slug ?? ""}
              />
            ) : (
              <div className="space-y-8">
                {invite?.organization && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-2">Inmobiliaria</p>
                    <p className="text-xl font-black text-slate-900">{invite.organization.name}</p>
                    <p className="text-sm font-medium text-brand-600">/{invite.organization.slug}</p>
                  </div>
                )}
                <div className="pt-4">
                  <Button asChild size="lg" className="w-full h-14 text-sm font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-500/15 active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 rounded-xl">
                    <Link href={invalidState.actionHref}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {invalidState.actionLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="mt-20 pt-10 border-t border-slate-200/60">
            <p className="text-center text-[13px] text-slate-400 font-medium">
              ¿Tenés problemas? <a href={getWhatsAppLink("Hola, tengo un problema con mi invitación a Raíces Pilot.")} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:text-brand-600 transition-colors underline decoration-slate-300 underline-offset-8 decoration-2">Contactá a soporte</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
