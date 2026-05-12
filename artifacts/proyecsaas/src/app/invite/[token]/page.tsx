export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap, AlertCircle, Building2, ArrowLeft } from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { InviteAcceptForm } from "./invite-accept-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen flex-col lg:flex-row bg-white">
      {/* Lado Izquierdo - Institucional (60%) */}
      <div className="relative hidden lg:flex lg:w-[60%] flex-col justify-center bg-slate-950 px-16 py-12 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand-600 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-brand-900 blur-[100px]" />
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
              backgroundSize: '32px 32px' 
            }} 
          />
        </div>

        <div className="relative z-10 max-w-xl">
          <Badge variant="brand" className="mb-6 border-brand-500/30 bg-brand-500/10 text-brand-400">
            Bienvenida Enterprise
          </Badge>
          
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1]">
            Estás a un paso de<br />
            <span className="text-brand-400">potenciar tu equipo.</span>
          </h1>
          
          <p className="mt-6 text-xl text-slate-400 leading-relaxed">
            Unite a la inmobiliaria y empezá a gestionar tus operaciones con la infraestructura comercial más avanzada.
          </p>

          <div className="mt-12 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Todo en un solo lugar</h3>
                <p className="text-sm text-slate-400">CRM, WhatsApp e IA integrados para que no pierdas ningún lead.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <Zap className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Velocidad de respuesta</h3>
                <p className="text-sm text-slate-400">Respondé en segundos y aumentá tu tasa de conversión.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-16 right-16 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          <span>RaícesPilot v2.0</span>
          <span>© 2026 Inmuebles Digitales</span>
        </div>
      </div>

      {/* Lado Derecho - Formulario / Estado (40%) */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:w-[40%] bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center lg:items-start">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-500/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900">
                Raíces<span className="text-brand-600">Pilot</span>
              </span>
            </div>
            
            {invalidState ? (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {invalidState.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {invalidState.message}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Activá tu acceso
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Completá tu perfil para ingresar al workspace.
                </p>
              </>
            )}
          </div>

          {!invalidState ? (
            <InviteAcceptForm
              token={token}
              email={invite!.user?.email ?? ""}
              organizationName={invite!.organization?.name ?? "Inmobiliaria"}
              organizationSlug={invite!.organization?.slug ?? ""}
            />
          ) : (
            <div className="space-y-6">
              {invite?.organization && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inmobiliaria</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{invite.organization.name}</p>
                  <p className="text-xs text-slate-500">/{invite.organization.slug}</p>
                </div>
              )}
              <Button asChild variant="outline" className="w-full h-11">
                <Link href={invalidState.actionHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {invalidState.actionLabel}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
