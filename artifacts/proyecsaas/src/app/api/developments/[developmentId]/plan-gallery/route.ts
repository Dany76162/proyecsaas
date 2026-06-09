import { NextResponse } from "next/server";
import { MembershipRole } from "@prisma/client";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { uploadFile } from "@/lib/storage-seven";

// Plan gallery items are stored in DevelopmentMapImage with a "gallery_" tipo prefix.
// This distinguishes them from geolocated map overlay images (lat/lng real values).
const GALLERY_PREFIX = "gallery_";
const VALID_TIPOS = ["render", "croquis", "subdivision", "catastral", "otro", "mensura", "comercial", "dxf"] as const;
type GalleryTipo = (typeof VALID_TIPOS)[number];
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

async function getDevOrgSlug(developmentId: string) {
  return prisma.development.findUnique({
    where: { id: developmentId },
    select: { Organization: { select: { slug: true } } },
  });
}

// ── GET /api/developments/[developmentId]/plan-gallery ─────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;

    const devCheck = await getDevOrgSlug(developmentId);
    if (!devCheck) {
      return NextResponse.json({ success: false, error: "Desarrollo no encontrado" }, { status: 404 });
    }

    await requireOrganizationMembership(devCheck.Organization.slug);

    const records = await prisma.developmentMapImage.findMany({
      where: {
        developmentId,
        tipo: { startsWith: GALLERY_PREFIX },
      },
      orderBy: { orden: "asc" },
      select: { id: true, titulo: true, url: true, tipo: true, createdAt: true },
    });

    const items = records.map((r) => ({
      id: r.id,
      nombre: r.titulo || "Plano",
      imageUrl: r.url,
      tipo: r.tipo.replace(GALLERY_PREFIX, "") as GalleryTipo,
      uploadedAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("[GET plan-gallery]", error);
    return NextResponse.json({ success: false, error: "Error al cargar la galería" }, { status: 500 });
  }
}

// ── POST /api/developments/[developmentId]/plan-gallery ────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;

    const devCheck = await getDevOrgSlug(developmentId);
    if (!devCheck) {
      return NextResponse.json({ success: false, error: "Desarrollo no encontrado" }, { status: 404 });
    }

    const { membership } = await requireOrganizationMembership(devCheck.Organization.slug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    const formData = await req.formData();
    const file = formData.get("file");
    const nombre = ((formData.get("nombre") as string | null) ?? "").trim() || "Plano";
    const rawTipo = ((formData.get("tipo") as string | null) ?? "").trim();
    const tipo: GalleryTipo = (VALID_TIPOS as readonly string[]).includes(rawTipo)
      ? (rawTipo as GalleryTipo)
      : "otro";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Archivo inválido" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "El archivo supera el límite de 15MB" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadFile({
      folder: `developments/${developmentId}/plan-gallery`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      buffer,
    });

    const orden = await prisma.developmentMapImage.count({ where: { developmentId } });

    const record = await prisma.developmentMapImage.create({
      data: {
        id: crypto.randomUUID(),
        developmentId,
        url: uploadResult.url,
        tipo: GALLERY_PREFIX + tipo,
        titulo: nombre,
        // lat/lng required by model — use 0 sentinel for non-geotagged plan docs
        lat: 0,
        lng: 0,
        orden,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: record.id,
        nombre: record.titulo ?? "Plano",
        imageUrl: record.url,
        tipo,
        uploadedAt: record.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[POST plan-gallery]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al subir el plano" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/developments/[developmentId]/plan-gallery?planId=... ───────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ developmentId: string }> },
) {
  try {
    const { developmentId } = await params;
    const planId = new URL(req.url).searchParams.get("planId");

    if (!planId) {
      return NextResponse.json({ success: false, error: "planId requerido" }, { status: 400 });
    }

    const devCheck = await getDevOrgSlug(developmentId);
    if (!devCheck) {
      return NextResponse.json({ success: false, error: "Desarrollo no encontrado" }, { status: 404 });
    }

    const { membership } = await requireOrganizationMembership(devCheck.Organization.slug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    // Verify ownership and that it is a gallery item before deleting
    const record = await prisma.developmentMapImage.findFirst({
      where: {
        id: planId,
        developmentId,
        tipo: { startsWith: GALLERY_PREFIX },
      },
      select: { id: true },
    });

    if (!record) {
      return NextResponse.json({ success: false, error: "Plano no encontrado" }, { status: 404 });
    }

    await prisma.developmentMapImage.delete({ where: { id: planId } });

    // Note: physical file cleanup in R2/S3 is intentionally deferred —
    // no safe delete helper exists yet. Orphaned files can be purged in a
    // future storage-cleanup task.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE plan-gallery]", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar el plano" },
      { status: 500 },
    );
  }
}
