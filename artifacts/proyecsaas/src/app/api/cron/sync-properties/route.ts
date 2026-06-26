/**
 * CRON — Sincronización automática de propiedades.
 * -------------------------------------------------------------
 * Recorre todas las organizaciones que tengan `propertySourceUrl` configurada
 * y cuyo plan habilite `canUsePropertySync`, y ejecuta el sync de cada una
 * (mismo núcleo seguro que el trigger manual: importa a DRAFT + publicVisible:false).
 *
 * Disparo (paso de DEPLOY, NO incluido en este código):
 *   curl -X POST https://www.raicespilot.com/api/cron/sync-properties \
 *        -H "Authorization: Bearer $AGENTOS_CRON_SECRET"
 * Frecuencia sugerida: cada 1 hora (configurar en el scheduler de Railway/cron).
 *
 * LIMITACIÓN: no hay cola/worker dedicado en la app; este endpoint procesa las
 * organizaciones de forma secuencial dentro del request del cron. Para muchos
 * tenants conviene migrar a una cola real (Fase 2).
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { syncOrganizationProperties } from "@/server/property-sync/run";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.AGENTOS_CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret) {
    console.error("[cron/sync-properties] AGENTOS_CRON_SECRET no configurado");
    return NextResponse.json({ error: "Cron secret no configurado" }, { status: 500 });
  }
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Organizaciones elegibles: con URL fuente y con plan que habilita el sync.
  const orgs = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      propertySourceUrl: { not: null },
      subscription: { plan: { canUsePropertySync: true } },
    },
    select: {
      id: true,
      slug: true,
      propertySourceUrl: true,
      propertySourceType: true,
      propertySourceStatus: true,
      propertySourceSyncedAt: true,
      propertySourceAttemptCount: true,
    },
  });

  const results: Array<Record<string, unknown>> = [];
  let ran = 0;
  let skipped = 0;

  for (const org of orgs) {
    if (!org.propertySourceUrl) continue;

    // No pisar un sync en curso.
    if (org.propertySourceStatus === "SYNCING") {
      skipped++;
      results.push({ org: org.slug, skipped: "en-curso" });
      continue;
    }

    // Backoff exponencial tras error: min(2^intentos, 24) horas desde el último intento.
    if (org.propertySourceStatus === "ERROR" && org.propertySourceSyncedAt) {
      const backoffHours = Math.min(2 ** org.propertySourceAttemptCount, 24);
      const dueAt = org.propertySourceSyncedAt.getTime() + backoffHours * 3600_000;
      if (Date.now() < dueAt) {
        skipped++;
        results.push({ org: org.slug, skipped: `backoff ${backoffHours}h (intentos=${org.propertySourceAttemptCount})` });
        continue;
      }
    }

    ran++;
    try {
      const r = await syncOrganizationProperties({
        orgId: org.id,
        sourceUrl: org.propertySourceUrl,
        sourceType: org.propertySourceType,
      });
      results.push({ org: org.slug, ok: true, created: r.created, updated: r.updated, preserved: r.skipped, detected: r.detected });
    } catch (err) {
      // El status ya quedó en ERROR (+errorMessage +attemptCount) dentro de syncOrganizationProperties.
      console.error(`[cron/sync-properties] ${org.slug} falló:`, err);
      results.push({ org: org.slug, ok: false, error: err instanceof Error ? err.message : "error" });
    }
  }

  console.info(`[cron/sync-properties] elegibles=${orgs.length} ejecutadas=${ran} omitidas=${skipped}`);
  return NextResponse.json({ ok: true, eligible: orgs.length, ran, skipped, results });
}
