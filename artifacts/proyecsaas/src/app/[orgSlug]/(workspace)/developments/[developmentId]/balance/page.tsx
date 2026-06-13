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

  // ── Caso: sesión válida → cargar gastos + lotes y mostrar dashboard ──────
  const [expenses, lots] = await Promise.all([
    prisma.developmentFinancialExpense.findMany({
      where: { vaultId: vault.id, organizationId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        category: true,
        description: true,
        provider: true,
        amountCents: true,
        currency: true,
        status: true,
        attachments: {
          where: { deletedAt: null },
          select: { id: true, filename: true, r2Key: true },
          orderBy: { uploadedAt: "asc" },
        },
      },
    }),
    prisma.developmentLot.findMany({
      where: { developmentId, organizationId },
      select: {
        id: true,
        status: true,
        priceCents: true,
        currency: true,
        areaSqm: true,
      },
    }),
  ]);

  const economicSummary = buildEconomicSummary(lots);

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
        expenses={expenses}
        economicSummary={economicSummary}
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

// ── Economic Summary ──────────────────────────────────────────────────────────

export interface LotStatusGroup {
  count: number;
  areaSqm: number;
  valueCents: number;
  percentOfGross: number;
}

export interface EconomicSummaryByCurrency {
  currency: string;
  totalLots: number;
  totalAreaSqm: number;
  grossValueCents: number;         // sum of all non-BLOCKED lots
  availableValueCents: number;     // AVAILABLE only
  reservedPendingValueCents: number;
  reservedValueCents: number;
  soldValueCents: number;
  blockedValueCents: number;
  averagePricePerSqm: number | null;
  byStatus: {
    available: LotStatusGroup;
    reservedPending: LotStatusGroup;
    reserved: LotStatusGroup;
    sold: LotStatusGroup;
    blocked: LotStatusGroup;
  };
}

export interface EconomicSummary {
  totalLots: number;
  lotsWithoutPrice: number;
  lotsWithoutArea: number;
  multipleCurrencies: boolean;
  byCurrency: EconomicSummaryByCurrency[];
}

type RawLot = {
  id: string;
  status: string;
  priceCents: number | null;
  currency: string | null;
  areaSqm: number | null;
};

function buildEconomicSummary(lots: RawLot[]): EconomicSummary {
  const totalLots = lots.length;
  const lotsWithoutPrice = lots.filter((l) => !l.priceCents || l.priceCents <= 0).length;
  const lotsWithoutArea = lots.filter((l) => !l.areaSqm || l.areaSqm <= 0).length;

  // Normalize currency: treat null as "USD" (schema default)
  const currencies = [...new Set(lots.map((l) => l.currency ?? "USD"))];
  const multipleCurrencies = currencies.length > 1;

  const byCurrency: EconomicSummaryByCurrency[] = currencies.map((cur) => {
    const curLots = lots.filter((l) => (l.currency ?? "USD") === cur);

    const makeGroup = (statuses: string[]): LotStatusGroup => {
      const subset = curLots.filter((l) => statuses.includes(l.status));
      return {
        count: subset.length,
        areaSqm: subset.reduce((s, l) => s + (l.areaSqm ?? 0), 0),
        valueCents: subset.reduce((s, l) => s + (l.priceCents ?? 0), 0),
        percentOfGross: 0, // filled in below
      };
    };

    const available = makeGroup(["AVAILABLE"]);
    const reservedPending = makeGroup(["RESERVED_PENDING"]);
    const reserved = makeGroup(["RESERVED"]);
    const sold = makeGroup(["SOLD"]);
    const blocked = makeGroup(["BLOCKED"]);

    // Gross = all lots except BLOCKED (commercial potential)
    const grossValueCents =
      available.valueCents +
      reservedPending.valueCents +
      reserved.valueCents +
      sold.valueCents;

    // Attach percentages
    const pct = (v: number) =>
      grossValueCents > 0 ? Math.round((v / grossValueCents) * 100) : 0;
    available.percentOfGross = pct(available.valueCents);
    reservedPending.percentOfGross = pct(reservedPending.valueCents);
    reserved.percentOfGross = pct(reserved.valueCents);
    sold.percentOfGross = pct(sold.valueCents);
    blocked.percentOfGross = 0; // excluded from gross

    const totalAreaSqm = curLots
      .filter((l) => l.status !== "BLOCKED")
      .reduce((s, l) => s + (l.areaSqm ?? 0), 0);

    const averagePricePerSqm =
      totalAreaSqm > 0 && grossValueCents > 0
        ? grossValueCents / 100 / totalAreaSqm
        : null;

    return {
      currency: cur,
      totalLots: curLots.length,
      totalAreaSqm,
      grossValueCents,
      availableValueCents: available.valueCents,
      reservedPendingValueCents: reservedPending.valueCents,
      reservedValueCents: reserved.valueCents,
      soldValueCents: sold.valueCents,
      blockedValueCents: blocked.valueCents,
      averagePricePerSqm,
      byStatus: { available, reservedPending, reserved, sold, blocked },
    };
  });

  return { totalLots, lotsWithoutPrice, lotsWithoutArea, multipleCurrencies, byCurrency };
}
