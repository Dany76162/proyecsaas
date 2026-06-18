export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, PencilRuler } from "lucide-react";

import { requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { cn } from "@/lib/utils";
import DevelopmentWizardClient from "./development-wizard-client";

interface PageProps {
  params: Promise<{ orgSlug: string; developmentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function DevelopmentDetailPage({ params, searchParams }: PageProps) {
  const { orgSlug, developmentId } = await params;
  const resolvedSearchParams = await searchParams;
  const { membership } = await requireOrganizationMembership(orgSlug);

  const activeTab = resolvedSearchParams.tab || "info";

  const developmentRaw = await prisma.development.findFirst({
    where: { id: developmentId, organizationId: membership.organization.id },
    include: {
      DevelopmentLot: {
        orderBy: { lotNumber: "asc" },
      },
    },
  });

  if (!developmentRaw) notFound();

  // CRM del desarrollo (paridad con propiedades): oportunidades y visitas
  // vinculadas a este desarrollo. developmentId es escalar en Lead/Visit.
  const [crmLeadsRaw, crmVisitsRaw, crmSlotsRaw] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId: membership.organization.id, developmentId },
      select: {
        id: true,
        fullName: true,
        status: true,
        lastContactAt: true,
        owner: { select: { fullName: true } },
      },
      orderBy: [{ lastContactAt: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.visit.findMany({
      where: { organizationId: membership.organization.id, developmentId },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        lead: { select: { fullName: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
    // Horarios de visita que el agente IA usa para coordinar visitas a este loteo.
    prisma.availabilitySlot.findMany({
      where: { organizationId: membership.organization.id, developmentId, isActive: true },
      select: { id: true, label: true, weekday: true, startMinute: true, endMinute: true },
      orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
      take: 20,
    }),
  ]);

  const crm = {
    leads: crmLeadsRaw.map((l) => ({
      id: l.id,
      fullName: l.fullName,
      status: l.status as string,
      ownerName: l.owner?.fullName ?? "Sin asignar",
      lastContactAt: l.lastContactAt ? l.lastContactAt.toISOString() : null,
    })),
    visits: crmVisitsRaw.map((v) => ({
      id: v.id,
      status: v.status as string,
      scheduledAt: v.scheduledAt.toISOString(),
      leadName: v.lead?.fullName ?? "Contacto",
    })),
    availability: crmSlotsRaw.map((s) => ({
      id: s.id,
      label: s.label,
      weekday: s.weekday,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
    })),
  };

  const development = {
    ...developmentRaw,
    lots: developmentRaw.DevelopmentLot,
  };

  // Statistics calculation from loaded lots
  const total = development.lots.length;
  let disponibles = 0;
  let reservadas = 0;
  let vendidas = 0;
  let bloqueados = 0;
  let valorTotal = 0;
  let valorVendido = 0;
  let valorReservado = 0;

  development.lots.forEach((lot: any) => {
    const price = lot.priceCents ? lot.priceCents / 100 : 0;
    valorTotal += price;

    if (lot.status === "AVAILABLE") disponibles++;
    if (lot.status === "RESERVED" || lot.status === "RESERVED_PENDING") {
      reservadas++;
      valorReservado += price;
    }
    if (lot.status === "SOLD") {
      vendidas++;
      valorVendido += price;
    }
    if (lot.status === "BLOCKED") bloqueados++;
  });

  const pctVendido = total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0;

  // Step completion flags (5 pasos)
  const step1Done = !!(development.name && (development.city || development.province));
  const step2Done = !!development.masterplanSVG;
  const step3Done = total > 0;
  // Paso 4 — Editor Visual: se considera completo cuando hay lotes y plano subido.
  // El editor es una herramienta opcional; no bloqueamos el progreso si solo falta calibrar.
  const step4Done = step2Done && step3Done;
  // Paso 5 — Mapa Interactivo: completo cuando el plano está georreferenciado.
  const step5Done = !!development.overlayBounds;

  const stepsCompletion = [step1Done, step2Done, step3Done, step4Done, step5Done];
  const completedCount = stepsCompletion.filter(Boolean).length;

  const stats = {
    total,
    disponibles,
    reservadas,
    vendidas,
    bloqueados,
    pctVendido,
  };

  const stepCompletion = {
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    step5Done,
    completedCount,
  };

  const isFullCanvas = ["blueprint", "masterplan", "editor", "mapa"].includes(activeTab);

  return (
    <div className={cn(
      "animate-fade-in flex flex-col overflow-hidden transition-all duration-200",
      "h-[calc(100dvh-3.5rem)] -mx-4 -my-5 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8"
    )}>
      {/* Header */}
      <div className={cn(
        "shrink-0 flex items-center justify-between gap-3",
        "px-4 pt-4 sm:px-6 lg:px-8 pb-1"
      )}>
        <div className="flex items-center gap-3">
          <Link
            href={`/${orgSlug}/developments`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a proyectos
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white">
              {development.name}
            </h1>
            {(development.city || development.province) && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {[development.city, development.province].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Acceso al Editor de Plano Pro + Progress */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${orgSlug}/developments/${developmentId}/plan-editor`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700 shrink-0"
            title="Editor de plano (Pro)"
          >
            <PencilRuler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editor de plano</span>
            <span className="rounded bg-white/20 px-1 text-[9px] font-black uppercase tracking-wider">Pro</span>
          </Link>
          <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-tight">
              {completedCount}
              <span className="text-slate-400 font-semibold text-xs">/5</span>
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">completados</div>
          </div>
          <div className="w-24 sm:w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.round((completedCount / 5) * 100)}%`,
                background: "linear-gradient(90deg, #f97316 0%, #fb923c 100%)",
              }}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Render Wizard Client wrapper */}
      <DevelopmentWizardClient
        orgSlug={orgSlug}
        development={development}
        activeTab={activeTab}
        stats={stats}
        stepCompletion={stepCompletion}
        crm={crm}
      />
    </div>
  );
}
