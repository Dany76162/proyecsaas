import { NextResponse } from "next/server";
import { requireOrganizationMembership, assertMinimumRole } from "@/server/auth/access";
import { generateR2PresignedUrl, isR2Configured } from "@/lib/storage/r2";
import { prisma } from "@/server/db/prisma";
import { MembershipRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, size, category, orgSlug, propertyId } = body;
    let { contentType } = body;

    // Normalizar contentType vacío/null — algunos browsers no detectan MIME de PDF
    if (!contentType || contentType === "application/octet-stream") {
      const ext = (filename || "").split(".").pop()?.toLowerCase();
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "webp") contentType = "image/webp";
    }

    if (!filename || !contentType || !category || !orgSlug || !propertyId) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios." },
        { status: 400 }
      );
    }

    // 1. Requerir membresía/sesión para el tenant específico orgSlug
    let session;
    try {
      session = await requireOrganizationMembership(orgSlug);
    } catch (err) {
      return NextResponse.json(
        { error: "No autorizado. Sesión o membresía inválida para la inmobiliaria." },
        { status: 401 }
      );
    }

    const { membership } = session;
    try {
      assertMinimumRole(membership.role, MembershipRole.AGENT);
    } catch (err) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol de Agente o superior." },
        { status: 403 }
      );
    }

    // 2. Verificar que la propiedad pertenece al tenant/organización
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: membership.organization.id,
      },
      select: { id: true },
    });

    if (!property) {
      return NextResponse.json(
        { error: "La propiedad no existe o no pertenece a tu organización." },
        { status: 404 }
      );
    }

    // 3. Validar categorías permitidas y tipos MIME / extensiones
    const allowedCategories = ["FLOOR_PLAN", "PANORAMA", "REAL", "RENDER", "PROGRESS"];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        { error: `Categoría '${category}' no permitida.` },
        { status: 400 }
      );
    }

    // Validar PDF para planos, e imágenes para panoramas
    const isPdfContent = contentType === "application/pdf" || contentType === "application/x-pdf";
    if (category === "FLOOR_PLAN" && !isPdfContent) {
      return NextResponse.json(
        { error: "Los planos técnicos deben ser en formato PDF." },
        { status: 400 }
      );
    }
    // Normalizar variante no estándar
    if (category === "FLOOR_PLAN") contentType = "application/pdf";

    if (category === "PANORAMA") {
      const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedImageTypes.includes(contentType)) {
        return NextResponse.json(
          { error: "Las panorámicas deben ser en formato de imagen (JPEG, PNG o WebP)." },
          { status: 400 }
        );
      }
    }

    // 4. Verificar configuración de R2 si el proveedor es R2
    const provider = process.env.STORAGE_PROVIDER || "r2";
    if (provider === "r2" && !isR2Configured()) {
      return NextResponse.json(
        { error: "El storage Cloudflare R2 no está configurado. Revisá las variables de entorno STORAGE_* en Railway." },
        { status: 503 }
      );
    }

    // 5. Generar key/path seguro para R2 (sanitizar el nombre para evitar path traversal/inyecciones)
    const uuid = crypto.randomUUID();
    const extension = filename.split(".").pop() || (category === "FLOOR_PLAN" ? "pdf" : "jpg");
    
    let subfolder = "images";
    if (category === "FLOOR_PLAN") subfolder = "floor-plans";
    else if (category === "PANORAMA") subfolder = "panoramas";
    else if (category === "RENDER") subfolder = "renders";

    const safeKey = `organizations/${membership.organization.id}/properties/${propertyId}/${subfolder}/${uuid}.${extension}`;

    // 6. Obtener url firmada de R2
    const { uploadUrl, publicUrl } = await generateR2PresignedUrl(safeKey, contentType);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      method: "PUT",
      // Solo Content-Type como header del PUT. Cache-Control eliminado para evitar que el
      // preflight CORS requiera ese header en AllowedHeaders del bucket R2.
      headers: {
        "Content-Type": contentType,
      },
    });

  } catch (error: any) {
    console.error("[api/storage/sign] Error generating presigned URL:", error);
    return NextResponse.json(
      { error: `Ocurrió un error inesperado al firmar la petición: ${error.message || error}` },
      { status: 500 }
    );
  }
}
