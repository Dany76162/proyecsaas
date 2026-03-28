import Link from "next/link";

import { requirePlatformAdmin } from "@/server/auth/access";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";

export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PlatformSidebar />
      <div className="flex flex-1 flex-col ml-64">
        {/* Topbar compacta */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Workspace Superadmin
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Ir a RaicesPilot Público
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900">{sessionUser.fullName}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">{sessionUser.email}</span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
