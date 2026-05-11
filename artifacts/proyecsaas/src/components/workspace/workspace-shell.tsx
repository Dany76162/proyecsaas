"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { MembershipRole } from "@prisma/client";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { OrganizationSummary } from "@/modules/organizations/types";

export function WorkspaceShell({
  organization,
  role,
  userName,
  userEmail,
  children,
}: {
  organization: OrganizationSummary;
  role: MembershipRole;
  userName: string;
  userEmail: string;
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

      <WorkspaceSidebar
        organization={organization}
        role={role}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/95 backdrop-blur-sm px-4 lg:px-6 print:hidden">
          <div className="flex items-center gap-3">
            {/* Hamburger — visible only on mobile/tablet */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-150 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-600">
              Panel de Inmobiliaria
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="hidden sm:block text-sm font-bold text-slate-900 truncate max-w-[160px]">
              {userName}
            </span>
            <span className="hidden sm:block text-slate-300 text-sm">·</span>
            <span className="hidden sm:block text-sm text-slate-500 font-medium truncate max-w-[200px]">
              {userEmail}
            </span>
            <span className="block sm:hidden text-sm font-bold text-slate-900 truncate max-w-[130px]">
              {userName}
            </span>
          </div>
        </header>

        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
