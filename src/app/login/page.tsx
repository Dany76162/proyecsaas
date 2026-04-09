import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/server/auth/actions";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    signedOut?: string;
  }>;
};

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid-credentials":
      return "Email o clave de acceso inválidos.";
    case "no-memberships":
      return "Tu usuario no tiene membresías activas.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolvedSearchParams?.next ?? "";
  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] border bg-white/90 p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Ingresar al workspace</h1>
        <p className="mt-3 text-slate-600">
          Ingresá con tu email de usuario y la clave interna de acceso para abrir los workspaces donde tenés membresía activa.
        </p>

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              placeholder="equipo@empresa.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Clave de acceso</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              placeholder="••••••••"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          {resolvedSearchParams?.signedOut ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              La sesión se cerró correctamente.
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continuar
          </button>

          <p className="text-center text-sm">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-slate-500 hover:text-slate-700 underline"
            >
              Olvidé mi contraseña
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
