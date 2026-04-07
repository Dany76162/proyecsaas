import Link from "next/link";
import { requestPasswordReset } from "@/server/auth/password-reset";

export const dynamic = "force-dynamic";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    sent?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const sent = resolvedParams?.sent === "1";

  async function handleSubmit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (email) {
      await requestPasswordReset(email);
    }
    const { redirect } = await import("next/navigation");
    redirect("/auth/forgot-password?sent=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] border bg-white/90 p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Recuperar contraseña</h1>
        <p className="mt-3 text-slate-600">
          Ingresá tu email y te enviaremos instrucciones para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Si el email ingresado tiene una cuenta asociada, vas a recibir instrucciones para
            restablecer tu contraseña.
          </div>
        ) : (
          <form action={handleSubmit} className="mt-6 space-y-4">
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

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Enviar instrucciones
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900 underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
