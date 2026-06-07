import { MembershipRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { isR2Configured, uploadBufferToR2 } from "@/lib/storage/r2";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PANORAMA_SIZE = 512 * 1024 * 1024;
const MAX_FLOOR_PLAN_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_FLOOR_PLAN_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES, 
  "application/pdf", 
  "application/x-pdf", 
  "image/vnd.dxf", 
  "application/dxf", 
  "application/x-dxf", 
  "text/plain", 
  "text/x-dxf", 
  "application/octet-stream"
]);
const ALLOWED_CATEGORIES = new Set(["PANORAMA", "FLOOR_PLAN"]);

function inferContentType(filename: string, contentType: string) {
  if (contentType && contentType !== "application/octet-stream") return contentType;

  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "dxf") return "image/vnd.dxf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return contentType;
}

function extensionFor(filename: string, contentType: string, category: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,8}$/.test(ext)) return ext === "jpeg" ? "jpg" : ext;
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/vnd.dxf" || contentType === "application/dxf" || contentType === "application/x-dxf" || ext === "dxf") return "dxf";
  return category === "FLOOR_PLAN" ? "pdf" : "jpg";
}

function uploadError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const provider = process.env.STORAGE_PROVIDER || "r2";
    if (provider === "r2" && !isR2Configured()) {
      return uploadError("El storage Cloudflare R2 no esta configurado. Revisa las variables STORAGE_* en Railway.", 503);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return uploadError("No se pudo leer el archivo enviado.", 413);
    }

    const file = formData.get("file");
    const orgSlug = String(formData.get("orgSlug") ?? "");
    const propertyId = String(formData.get("propertyId") ?? "");
    const category = String(formData.get("category") ?? "");

    if (!(file instanceof File)) {
      return uploadError("Archivo invalido.");
    }
    if (!orgSlug || !propertyId || !ALLOWED_CATEGORIES.has(category)) {
      return uploadError("Parametros de subida invalidos.");
    }

    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: membership.organization.id,
      },
      select: { id: true },
    });

    if (!property) {
      return uploadError("La propiedad no existe o no pertenece a tu organizacion.", 404);
    }

    const contentType = inferContentType(file.name, file.type);
    const maxSize = category === "PANORAMA" ? MAX_PANORAMA_SIZE : MAX_FLOOR_PLAN_SIZE;
    if (file.size <= 0 || file.size > maxSize) {
      return uploadError(`El archivo supera el maximo permitido de ${Math.round(maxSize / 1024 / 1024)} MB.`, 413);
    }

    if (category === "PANORAMA" && !ALLOWED_IMAGE_TYPES.has(contentType)) {
      return uploadError("Las panoramicas deben ser imagenes JPEG, PNG o WebP.");
    }

    if (category === "FLOOR_PLAN" && !ALLOWED_FLOOR_PLAN_TYPES.has(contentType)) {
      return uploadError("Los planos deben ser PDF o imagen JPEG, PNG o WebP.");
    }

    const subfolder = category === "PANORAMA" ? "panoramas" : "floor-plans";
    const extension = extensionFor(file.name, contentType, category);
    const key = `organizations/${membership.organization.id}/properties/${propertyId}/${subfolder}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await uploadBufferToR2(key, buffer, contentType);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("[api/storage/upload] Error uploading to R2:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "No se pudo subir el archivo al storage." },
      { status: 500 }
    );
  }
}
