export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { getFinancialVaultSessionForVault } from "@/server/auth/financial-vault";
import BalanceActivationForm from "./balance-activation-form";
import BalanceLoginForm from "./balance-login-form";
import BalanceDashboard from "./balance-dashboard";

interface PageProps {
  params: Promise<{ orgSlug: string; developmentId: string }>;
}

export default async function BalancePage({ params }: PageProps) {
  const { orgSlug, developmentId } = await params;
  const { user, membership } = await requireOrganizationMembership(orgSlug);

  // ── P0: Superadmin explicito bloqueado ────────────────────────────────────
  if (user.isPlatformAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-base font-black text-slate-800 dark:text-white mb-2">
            Acceso no permitido
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Balance y Rendición es un área financiera privada del tenant. El acceso desde
            Superadmin no está habilitado. El responsable financiero puede autorizar soporte
            temporal en una fase futura.
          </p>
        </div>
      </div>
    );
  }

  const organizationId = membership.organization.id;

  // ── Verificar que el desarrollo pertenece a la org ────────────────────────
  const development = await prisma.development.findFirst({
    where: { id: developmentId, organizationId },
    select: { id: true, name: true, city: true, province: true },
  });
  if (!development) notFound();

  // ── Buscar vault existente ────────────────────────────────────────────────
  const vault = await prisma.developmentFinancialVault.findUnique({
    where: { developmentId },
    select: {
      id: true,
      ownerEmail: true,
      ownerName: true,
      ownerEntityType: true,
      isActive: true,
      lastAccessAt: true,
      accessCount: true,
      activatedAt: true,
    },
  });

  const backHref = `/${orgSlug}/developments/${developmentId}`;

  // ── Caso: no hay vault → pantalla de activación ───────────────────────────
  if (!vault) {
    return (
      <BalancePage_Layout orgSlug={orgSlug} development={development} backHref={backHref}>
        <BalanceActivationForm
          orgSlug={orgSlug}
          developmentId={developmentId}
        />
      </BalancePage_Layout>
    );
  }

  // ── Caso: vault existe → verificar sesión financiera ─────────────────────
  const financialSession = await getFinancialVaultSessionForVault(
    vault.id,
    developmentId,
    organizationId,
  );

  if (!financialSession) {
    // No hay sesión o expiró → mostrar pantalla de ingreso
    return (
      <BalancePage_Layout orgSlug={orgSlug} development={development} backHref={backHref}>
        <BalanceLoginForm
          orgSlug={orgSlug}
          developmentId={developmentId}
          ownerEmailMasked={maskEmail(vault.ownerEmail)}
        />
      </BalancePage_Layout>
    );
  }

  // ── Caso: sesión válida → mostrar dashboard protegido ────────────────────
  return (
    <BalancePage_Layout orgSlug={orgSlug} development={development} backHref={backHref}>
      <BalanceDashboard
        orgSlug={orgSlug}
        developmentId={developmentId}
        vault={{
          ownerName: vault.ownerName,
          ownerEmail: vault.ownerEmail,
          ownerEntityType: vault.ownerEntityType,
          lastAccessAt: vault.lastAccessAt,
          accessCount: vault.accessCount,
          activatedAt: vault.activatedAt,
        }}
        userEmail={user.email}
      />
    </BalancePage_Layout>
  );
}

// ── Layout wrapper ─────────────────────────────────────────────────────────────

function BalancePage_Layout({
  orgSlug,
  development,
  backHref,
  children,
}: {
  orgSlug: string;
  development: { name: string; city?: string | null; province?: string | null };
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in flex flex-col gap-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al desarrollo
        </Link>
        <div>
          <h1 className="text-sm font-bold text-slate-800 dark:text-white">
            Balance y Rendición
          </h1>
          <p className="text-[11px] text-slate-500">{development.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">{children}</div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}
