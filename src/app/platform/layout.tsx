import Link from "next/link";

import { logoutAction } from "@/server/auth/actions";
import { requirePlatformAdmin } from "@/server/auth/platform";

export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/platform" className="text-base font-semibold text-slate-900">
              RaicesPilot <span className="text-slate-400 font-normal">| Panel de Plataforma</span>
            </Link>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Superadmin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{sessionUser.email}</span>
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Volver al inicio
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
