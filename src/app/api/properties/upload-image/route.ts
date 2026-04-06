import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // ── Parse form data ───────────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  const orgSlug = String(formData.get("orgSlug") ?? "").trim();
  const propertyId = String(formData.get("propertyId") ?? "").trim();

  if (!file || !(file instanceof File) || !orgSlug || !propertyId) {
    return NextResponse.json(
      { error: "Se requieren: archivo, orgSlug y propertyId." },
      { status: 400 },
    );
  }

  // ── Validate file ─────────────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Usá JPG, PNG o WEBP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 8 MB." },
      { status: 400 },
    );
  }

  // ── Verify org membership ─────────────────────────────────────────────────────
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: orgSlug } },
    select: { organization: { select: { id: true } } },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "No tenés acceso a esta organización." },
      { status: 403 },
    );
  }

  // ── Verify property belongs to org ────────────────────────────────────────────
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: membership.organization.id },
    select: { id: true },
  });

  if (!property) {
    return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
  }

  // ── Save file ─────────────────────────────────────────────────────────────────
  const ext = extname(file.name).toLowerCase() || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  // Use forward slashes for the URL; join handles OS-specific path for FS operations.
  const relDir = `uploads/properties/${property.id}`;
  const absDir = join(process.cwd(), "public", relDir);
  const absPath = join(absDir, filename);

  try {
    await mkdir(absDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(absPath, Buffer.from(bytes));
  } catch (err) {
    console.error("[upload-image] Error al guardar archivo:", err);
    return NextResponse.json(
      { error: "Error interno al guardar el archivo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: `/${relDir}/${filename}` });
}
