import { MembershipRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { isR2Configured, uploadBufferToR2 } from "@/lib/storage/r2";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_VIDEO_SIZE = 30 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/webm", "video/mp4", "video/quicktime"]);

function uploadError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function inferContentType(filename: string, contentType: string) {
  if (contentType && contentType !== "application/octet-stream") return contentType.split(";")[0] ?? contentType;

  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return contentType;
}

function extensionFor(filename: string, contentType: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ["webm", "mp4", "mov"].includes(ext)) return ext;
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/quicktime") return "mov";
  return "webm";
}

export async function POST(req: Request) {
  try {
    if (!isR2Configured()) {
      return uploadError("El storage Cloudflare R2 no esta configurado para videos temporales.", 503);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return uploadError("No se pudo leer el video enviado.", 413);
    }

    const file = formData.get("file");
    const orgSlug = String(formData.get("orgSlug") ?? "");
    const propertyId = String(formData.get("propertyId") ?? "");
    const roomName = String(formData.get("roomName") ?? "").trim().slice(0, 80);

    if (!(file instanceof File)) {
      return uploadError("Archivo invalido.");
    }
    if (!orgSlug || !propertyId) {
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

    if (file.size <= 0 || file.size > MAX_VIDEO_SIZE) {
      return uploadError("El video supera el maximo permitido de 30 MB.", 413);
    }

    const contentType = inferContentType(file.name, file.type);
    if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
      return uploadError("Formato de video no permitido. Usá WebM, MP4 o QuickTime.");
    }

    const jobId = crypto.randomUUID();
    const extension = extensionFor(file.name, contentType);
    const key = `organizations/${membership.organization.id}/properties/${propertyId}/tour-video/tmp/${jobId}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await uploadBufferToR2(key, buffer, contentType);

    // TODO: agregar limpieza de objetos temporales tour-video/tmp con retencion de 24-72 horas.
    return NextResponse.json({
      success: true,
      jobId,
      url: publicUrl,
      key,
      roomName,
      size: buffer.length,
      status: "uploaded",
      message: "Video temporal subido. El procesamiento experimental continua en el cliente en esta fase.",
    });
  } catch (error: any) {
    console.error("[api/property-tour-video/upload] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "No se pudo subir el video temporal." },
      { status: 500 },
    );
  }
}
