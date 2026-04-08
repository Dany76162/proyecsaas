export const dynamic = "force-dynamic";

import Link from "next/link";

import { prisma } from "@/server/db/prisma";

import { InviteAcceptForm } from "./invite-accept-form";

function buildInvalidState(invite: {
  usedAt: Date | null;
  expiresAt: Date;
  organization: { name: string; slug: string } | null;
} | null) {
  if (!invite) {
    return {
      title: "Invitacion invalida",
      message:
        "Este enlace no existe o fue modificado. Pedi un nuevo acceso a la inmobiliaria.",
      actionLabel: "Volver al login",
      actionHref: "/login",
    };
  }

  if (invite.usedAt) {
    return {
      title: "Invitacion ya utilizada",
      message:
        "Este acceso ya fue activado anteriormente. Inicia sesion con el email invitado y tu clave.",
      actionLabel: "Ir a login",
      actionHref: "/login",
    };
  }

  return {
    title: "Invitacion expirada",
    message:
      "El enlace de acceso vencio. Pedi a la inmobiliaria o al administrador que genere una nueva invitacion.",
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

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
  });

  const isInvalid = !invite;
  const isUsed = !!invite?.usedAt;
  const isExpired = !!invite && invite.expiresAt < new Date();

  if (isInvalid || isUsed || isExpired) {
    const state = buildInvalidState(
      invite
        ? {
            usedAt: invite.usedAt,
            expiresAt: invite.expiresAt,
            organization: invite.organization,
          }
        : null,
    );

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-slate-950">{state.title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{state.message}</p>

          {invite?.organization ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Organizacion
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {invite.organization.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">/{invite.organization.slug}</p>
            </div>
          ) : null}

          <div className="mt-8">
            <Link
              href={state.actionHref}
              className="inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              {state.actionLabel}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-slate-950">Activa tu acceso</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Esta invitacion corresponde a <strong>{invite.organization.name}</strong>. El acceso
          quedara vinculado al email invitado y luego entraras directamente a ese workspace.
        </p>

        <InviteAcceptForm
          token={token}
          email={invite.user.email}
          organizationName={invite.organization.name}
          organizationSlug={invite.organization.slug}
        />
      </div>
    </main>
  );
}
