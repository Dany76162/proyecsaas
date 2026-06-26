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
    select: { id: true, slug: true, propertySourceUrl: true },
  });

  const results: Array<Record<string, unknown>> = [];

  for (const org of orgs) {
    if (!org.propertySourceUrl) continue;
    try {
      const r = await syncOrganizationProperties({ orgId: org.id, sourceUrl: org.propertySourceUrl });
      results.push({ org: org.slug, ok: true, created: r.created, updated: r.updated, detected: r.detected });
    } catch (err) {
      // El status de la org ya quedó en ERROR dentro de syncOrganizationProperties.
      console.error(`[cron/sync-properties] ${org.slug} falló:`, err);
      results.push({ org: org.slug, ok: false, error: err instanceof Error ? err.message : "error" });
    }
  }

  console.info(`[cron/sync-properties] procesadas=${orgs.length}`);
  return NextResponse.json({ ok: true, processed: orgs.length, results });
}
