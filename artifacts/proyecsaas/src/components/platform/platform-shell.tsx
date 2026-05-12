"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";

type SessionInfo = {
  fullName: string;
  email: string;
};

export function PlatformShell({
  sessionUser,
  children,
}: {
  sessionUser: SessionInfo;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <PlatformSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 lg:ml-72">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-6 print:hidden">
          <div className="flex items-center gap-3">
            {/* Hamburger â€” visible only on mobile/tablet */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="rounded border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
              Panel Superadmin
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="hidden sm:block text-sm font-bold text-slate-900 truncate max-w-[160px]">
              {sessionUser.fullName}
            </span>
            <span className="hidden sm:block text-slate-300">Â·</span>
            <span className="hidden sm:block text-sm text-slate-500 font-medium truncate max-w-[200px]">
              {sessionUser.email}
            </span>
            {/* Mobile: name only */}
            <span className="block sm:hidden text-sm font-semibold text-slate-900 truncate max-w-[130px]">
              {sessionUser.fullName}
            </span>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
