import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { MembershipRole, PropertyImageCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const MAX_STANDARD_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_PANORAMA_IMAGE_SIZE = 512 * 1024 * 1024;
const MAX_FLOOR_PLAN_SIZE = 50 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_FLOOR_PLAN_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES, 
  "application/pdf", 
  "image/vnd.dxf", 
  "application/dxf", 
  "application/x-dxf", 
  "text/plain", 
  "text/x-dxf", 
  "application/octet-stream"
]);

type PropertyMediaUploadCategory = PropertyImageCategory | "FLOOR_PLAN";

const folderByCategory: Record<PropertyMediaUploadCategory, string> = {
  PANORAMA: "panoramas360",
  REAL: "property-images",
  RENDER: "property-renders",
  PROGRESS: "property-progress",
  FLOOR_PLAN: "property-floor-plans",
};

const PANORAMA_VIEWER_WIDTHS = [8192, 6144, 4096] as const;

const roleRank: Record<MembershipRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  AGENT: 2,
  ASSISTANT: 1,
};

function sanitizeFilename(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 50);

  return `${randomUUID()}-${base}.${ext}`;
}

function getPanoramaViewerFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, ".jpg");
}

function isUploadCategory(value: string): value is PropertyMediaUploadCategory {
  return value === "FLOOR_PLAN" || Object.values(PropertyImageCategory).includes(value as PropertyImageCategory);
}

function getMaxImageSize(category: PropertyMediaUploadCategory) {
  if (category === "FLOOR_PLAN") return MAX_FLOOR_PLAN_SIZE;
  return category === "PANORAMA" ? MAX_PANORAMA_IMAGE_SIZE : MAX_STANDARD_IMAGE_SIZE;
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function uploadError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

async function writePanoramaViewerImages(buffer: Buffer, uploadDir: string, filename: string) {
  try {
    const sharp = (await import("sharp")).default;
    const viewerDir = join(uploadDir, "viewer");
    await mkdir(viewerDir, { recursive: true });

    await Promise.all(
      PANORAMA_VIEWER_WIDTHS.map(async (width) => {
        const widthDir = join(viewerDir, String(width));
        await mkdir(widthDir, { recursive: true });

        return sharp(buffer, { limitInputPixels: false })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality: 92, mozjpeg: true })
          .toFile(join(widthDir, getPanoramaViewerFilename(filename)));
      }),
    );
  } catch (error) {
    console.error("[property-media-upload] Panorama viewer image error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "No autenticado." }, { status: 401 });
    }

    const hintedCategory = String(request.headers.get("x-property-media-category") ?? "REAL");
    const validHintedCategory: PropertyMediaUploadCategory = isUploadCategory(hintedCategory) ? hintedCategory : "REAL";
    const maxRequestBodySize = getMaxImageSize(validHintedCategory) + MULTIPART_OVERHEAD_BYTES;
    const contentLength = Number(request.headers.get("content-length") ?? 0);

    if (contentLength > maxRequestBodySize) {
      return uploadError(
        `La imagen supera el maximo permitido de ${formatMegabytes(maxRequestBodySize - MULTIPART_OVERHEAD_BYTES)}.`,
        413,
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[property-media-upload] FormData error:", error);
      return uploadError("No se pudo leer la imagen. Si es panoramica, proba con una version JPG comprimida.", 413);
    }
    const file = formData.get("file");
    const orgSlug = String(formData.get("orgSlug") ?? "");
    const propertyId = String(formData.get("propertyId") ?? "");
    const rawCategory = String(formData.get("category") ?? "REAL");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Archivo inválido." }, { status: 400 });
    }

    if (!isUploadCategory(rawCategory)) {
      return NextResponse.json({ success: false, error: "Categoría inválida." }, { status: 400 });
    }

    const maxImageSize = getMaxImageSize(rawCategory);
    if (file.size <= 0 || file.size > maxImageSize) {
      return uploadError(`La imagen supera el maximo permitido de ${formatMegabytes(maxImageSize)}.`, 413);
    }

    const allowedFileTypes = rawCategory === "FLOOR_PLAN" ? ALLOWED_FLOOR_PLAN_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowedFileTypes.has(file.type)) {
      return NextResponse.json({ success: false, error: "Tipo de archivo no permitido." }, { status: 400 });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: sessionUser.id,
        user: { isActive: true },
        organization: { slug: orgSlug, deletedAt: null },
      },
      select: {
        role: true,
        organization: { select: { id: true } },
      },
    });

    const isPlatformAdmin = sessionUser.isPlatformAdmin;
    if (!membership && !isPlatformAdmin) {
      return NextResponse.json({ success: false, error: "Sin permisos para esta organización." }, { status: 403 });
    }

    if (membership && roleRank[membership.role] < roleRank.AGENT) {
      return NextResponse.json({ success: false, error: "Sin permisos para subir medios." }, { status: 403 });
    }

    const organizationId =
      membership?.organization.id ??
      (
        await prisma.organization.findFirst({
          where: { slug: orgSlug, deletedAt: null },
          select: { id: true },
        })
      )?.id;

    if (!organizationId) {
      return NextResponse.json({ success: false, error: "Organización no encontrada." }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Propiedad no encontrada." }, { status: 404 });
    }

    const folder = folderByCategory[rawCategory];
    const filename = sanitizeFilename(file.name);
    const uploadDir = join(process.cwd(), "public", "uploads", "property-media", folder);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, filename), buffer);
    if (rawCategory === "PANORAMA") {
      await writePanoramaViewerImages(buffer, uploadDir, filename);
    }

    return NextResponse.json({
      success: true,
      url: `/uploads/property-media/${folder}/${filename}`,
      filename,
      size: buffer.length,
    });
  } catch (error) {
    console.error("[property-media-upload] Error:", error);
    return NextResponse.json({ success: false, error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
