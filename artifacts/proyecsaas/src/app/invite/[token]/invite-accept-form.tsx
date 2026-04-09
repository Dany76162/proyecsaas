"use client";

import { useActionState } from "react";

import { acceptInviteAction } from "./actions";

type InviteAcceptFormProps = {
  token: string;
  email: string;
  organizationName: string;
  organizationSlug: string;
};

export function InviteAcceptForm({
  token,
  email,
  organizationName,
  organizationSlug,
}: InviteAcceptFormProps) {
  const [state, action, isPending] = useActionState(acceptInviteAction, null);

  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="token" value={token} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Organizacion
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{organizationName}</p>
        <p className="mt-1 text-xs text-slate-500">/{organizationSlug}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Email invitado</label>
        <p className="mt-1.5 text-base font-semibold text-slate-950">{email}</p>
        <p className="mt-1 text-xs text-slate-500">
          Este acceso queda asociado a este email exacto. Si usas otro correo, no vas a poder
          entrar.
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Crea tu clave
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          minLength={8}
          className="mt-1.5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-950 placeholder:text-slate-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          placeholder="Minimo 8 caracteres"
        />
      </div>

      <button
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-[1.25rem] bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition-all hover:bg-brand-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Activando...
          </span>
        ) : (
          "Activar acceso"
        )}
      </button>

      {state?.success === false ? (
        <p className="mt-4 text-center text-sm font-medium text-red-600">{state.message}</p>
      ) : null}
    </form>
  );
}
