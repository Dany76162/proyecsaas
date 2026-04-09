import Link from "next/link";
import { resetPasswordAction } from "@/app/auth/reset-password/actions";

export const dynamic = "force-dynamic";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const token = resolvedParams?.token ?? "";
  const success = resolvedParams?.success === "1";
  const errorMsg = resolvedParams?.error;

  if (!token && !success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[2rem] border bg-white/90 p-8 shadow-soft">
          <h1 className="text-2xl font-semibold text-slate-950">Enlace inválido</h1>
          <p className="mt-3 text-slate-600">
            El enlace de restablecimiento no es válido. Solicitá uno nuevo.
          </p>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-slate-700 hover:text-slate-900 underline"
            >
              Solicitar nuevo enlace
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[2rem] border bg-white/90 p-8 shadow-soft">
          <h1 className="text-2xl font-semibold text-slate-950">Contraseña actualizada</h1>
          <p className="mt-3 text-slate-600">
            Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.
          </p>
          <p className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-block rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ir al inicio de sesión
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] border bg-white/90 p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Nueva contraseña</h1>
        <p className="mt-3 text-slate-600">Ingresá tu nueva contraseña.</p>

        {errorMsg ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {decodeURIComponent(errorMsg)}
          </p>
        ) : null}

        <form action={resetPasswordAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Nueva contraseña</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Confirmar contraseña</span>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={6}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              placeholder="Repetí la contraseña"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Restablecer contraseña
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900 underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
