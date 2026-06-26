import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { syncOrganizationProperties } from "@/server/property-sync/run";

const SyncSchema = z.object({
  orgSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    return await handleSync(req);
  } catch (err) {
    console.error("[sync-from-source] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}

async function handleSync(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "orgSlug requerido" }, { status: 400 });
  }

  const { orgSlug } = parsed.data;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug },
    select: {
      id: true,
      propertySourceUrl: true,
      propertySourceType: true,
      website: true,
      subscription: { select: { plan: { select: { canUsePropertySync: true } } } },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  // Gate por plan: la sincronización de propiedades requiere un plan habilitado.
  if (!org.subscription?.plan?.canUsePropertySync) {
    console.warn(`[sync-from-source] ${orgSlug}: bloqueado (canUsePropertySync=false)`);
    return NextResponse.json(
      {
        error:
          "Tu plan no incluye la sincronización de propiedades. Contactá a soporte para habilitarla.",
      },
      { status: 403 }
    );
  }

  // Use propertySourceUrl first; fall back to the org website URL if not set.
  const sourceUrl = org.propertySourceUrl || org.website;

  if (!sourceUrl) {
    return NextResponse.json(
      {
        error:
          "No hay URL configurada. Ingresá la URL del listado de propiedades en Configuración → Organización → Fuente de propiedades.",
      },
      { status: 422 }
    );
  }

  // If we're using the website fallback, persist it as propertySourceUrl.
  if (!org.propertySourceUrl && org.website) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { propertySourceUrl: org.website },
    });
  }

  try {
    const result = await syncOrganizationProperties({
      orgId: org.id,
      sourceUrl,
      sourceType: org.propertySourceType,
    });
    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      total: result.created + result.updated,
      strategy: result.strategy,
      totalFetched: result.totalFetched,
      message: `Sync completo (${result.strategy}): ${result.created} nuevas, ${result.updated} actualizadas, ${result.skipped} preservadas (ya revisadas/publicadas).`,
    });
  } catch (err) {
    console.error("[sync-from-source] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno al sincronizar" },
      { status: 500 }
    );
  }
}
