export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

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
  await requireOrganizationMembership(orgSlug);

  const activeTab = resolvedSearchParams.tab || "info";

  const developmentRaw = await prisma.development.findUnique({
    where: { id: developmentId },
    include: {
      DevelopmentLot: {
        orderBy: { lotNumber: "asc" },
      },
    },
  });

  if (!developmentRaw) notFound();

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

  // Step completion flags
  const step1Done = !!(development.name && (development.city || development.province));
  const step2Done = !!development.masterplanSVG;
  const step3Done = total > 0;
  const step4Done = !!development.overlayBounds;

  const stepsCompletion = [step1Done, step2Done, step3Done, step4Done];
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
    completedCount,
  };

  const isFullCanvas = ["blueprint", "masterplan", "mapa"].includes(activeTab);

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

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-tight">
              {completedCount}
              <span className="text-slate-400 font-semibold text-xs">/4</span>
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">completados</div>
          </div>
          <div className="w-24 sm:w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.round((completedCount / 4) * 100)}%`,
                background: "linear-gradient(90deg, #f97316 0%, #fb923c 100%)",
              }}
            />
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
      />
    </div>
  );
}
