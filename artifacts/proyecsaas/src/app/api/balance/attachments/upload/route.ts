import { NextResponse } from "next/server";

import { requireOrganizationMembership } from "@/server/auth/access";
import { getFinancialVaultSessionForVault } from "@/server/auth/financial-vault";
import { isR2Configured, uploadBufferToR2 } from "@/lib/storage/r2";
import { prisma } from "@/server/db/prisma";
import { registerAttachmentAction } from "@/modules/developments/financial-expense-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function uploadError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    if (!isR2Configured()) {
      return uploadError("El storage R2 no está configurado.", 503);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return uploadError("No se pudo leer el archivo enviado.", 413);
    }

    const file = formData.get("file");
    const orgSlug = String(formData.get("orgSlug") ?? "");
    const developmentId = String(formData.get("developmentId") ?? "");
    const expenseId = String(formData.get("expenseId") ?? "");
    const description = String(formData.get("description") ?? "");

    if (!(file instanceof File)) return uploadError("Archivo inválido.");
    if (!orgSlug || !developmentId || !expenseId) {
      return uploadError("Parámetros inválidos.");
    }

    // Auth: membership
    const { user, membership } = await requireOrganizationMembership(orgSlug);
    if (user.isPlatformAdmin) {
      return uploadError("Acceso no permitido desde Superadmin.", 403);
    }
    const organizationId = membership.organization.id;

    // Auth: vault session
    const vault = await prisma.developmentFinancialVault.findFirst({
      where: { developmentId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!vault) return uploadError("Módulo financiero no encontrado.", 404);

    const session = await getFinancialVaultSessionForVault(vault.id, developmentId, organizationId);
    if (!session) return uploadError("Sesión financiera inválida o expirada.", 401);

    // Validate file
    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(contentType)) {
      return uploadError("Tipo de archivo no permitido. Usá PDF, JPEG, PNG o WebP.");
    }
    if (file.size <= 0 || file.size > MAX_SIZE) {
      return uploadError(`El archivo supera el máximo de ${MAX_SIZE / 1024 / 1024} MB.`, 413);
    }

    // Build R2 key — private, not publicly guessable
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const r2Key = `organizations/${organizationId}/financial/${vault.id}/expenses/${expenseId}/${crypto.randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadBufferToR2(r2Key, buffer, contentType);

    // Register in DB via action (handles audit log)
    const result = await registerAttachmentAction(orgSlug, developmentId, expenseId, {
      filename: file.name,
      contentType,
      sizeBytes: buffer.length,
      r2Key,
      description: description || undefined,
    });

    if (!result.ok) {
      return uploadError(result.error);
    }

    return NextResponse.json({
      success: true,
      attachmentId: result.data?.attachmentId,
      filename: file.name,
      sizeBytes: buffer.length,
      // viewUrl uses r2Key via proxy — no direct R2 URL exposed
      viewUrl: `/api/storage/view?key=${encodeURIComponent(r2Key)}`,
    });
  } catch (error: any) {
    console.error("[api/balance/attachments/upload] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al subir el comprobante." },
      { status: 500 }
    );
  }
}
