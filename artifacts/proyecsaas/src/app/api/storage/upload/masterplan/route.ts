import { NextResponse } from "next/server";
import { MembershipRole } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { uploadBufferToR2, isR2Configured } from "@/lib/storage/r2";
import { validateBlueprintFile } from "@/modules/developments/blueprint-utils";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

async function saveMasterplanLocally(key: string, buffer: Buffer): Promise<{ publicUrl: string }> {
  const safeParts = key.split("/").map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const relativePath = path.join("uploads", ...safeParts);
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return { publicUrl: `/${relativePath.replace(/\\/g, "/")}` };
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const orgSlug = url.searchParams.get("orgSlug");
    const developmentId = url.searchParams.get("developmentId");

    if (!orgSlug || !developmentId) {
      return NextResponse.json({ error: "Faltan parámetros orgSlug o developmentId." }, { status: 400 });
    }

    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.ADMIN);

    const development = await prisma.development.findFirst({
      where: { id: developmentId, organizationId: membership.organization.id },
      select: { id: true },
    });
    if (!development) {
      return NextResponse.json({ error: "Desarrollo no encontrado." }, { status: 404 });
    }

    const isProduction = process.env.NODE_ENV === "production";
    if (!isR2Configured() && isProduction) {
      return NextResponse.json(
        { error: "El storage R2 no esta configurado. Revisa las variables STORAGE_* en Railway." },
        { status: 503 },
      );
    }
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `El archivo supera el máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB.` }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateBlueprintFile(buffer, file.name, file.type);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error ?? "Archivo inválido." }, { status: 422 });
    }

    const uuid = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const key = `organizations/${membership.organization.id}/developments/${developmentId}/masterplan/${uuid}.${ext}`;

    const { publicUrl } = isR2Configured()
      ? await uploadBufferToR2(key, buffer, file.type || `application/octet-stream`)
      : await saveMasterplanLocally(key, buffer);

    return NextResponse.json({
      publicUrl,
      sourceKind: validation.detectedType,
      filename: file.name,
    });
  } catch (error: any) {
    console.error("[api/storage/upload/masterplan] Error:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}

