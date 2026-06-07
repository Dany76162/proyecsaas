import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadFile } from "@/lib/storage-seven";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { MembershipRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
    MAX_FILE_SIZE_PLAN,
    sanitizeFilename,
    validatePlanFile,
} from "@/lib/upload-utils";

const uploadSchema = z.object({
    file: z.instanceof(File)
        .refine((file) => file.size > 0, "Archivo vacío")
        .refine(
            (file) => file.size <= MAX_FILE_SIZE_PLAN,
            `El archivo excede los ${MAX_FILE_SIZE_PLAN / (1024 * 1024)}MB`
        ),
    projectId: z.string().min(1, "projectId es obligatorio"),
    orgSlug: z.string().min(1, "orgSlug es obligatorio"),
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");
        const projectId = formData.get("projectId") as string | undefined;
        const orgSlug = formData.get("orgSlug") as string | undefined;

        const result = uploadSchema.safeParse({ file, projectId, orgSlug });
        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error.issues[0]?.message || "Validación fallida",
                },
                { status: 400 }
            );
        }

        const { file: validFile, projectId: validProjectId, orgSlug: validOrgSlug } = result.data;

        // Perform standard membership and role check
        const { membership } = await requireOrganizationMembership(validOrgSlug);
        assertMinimumRole(membership.role, MembershipRole.ADMIN);

        // Verify the development belongs to this organization
        const development = await prisma.development.findFirst({
            where: { id: validProjectId, organizationId: membership.organization.id },
            select: { id: true },
        });
        if (!development) {
            return NextResponse.json(
                { success: false, error: "El desarrollo no pertenece a esta organización." },
                { status: 403 }
            );
        }

        try {
            sanitizeFilename(validFile.name);
        } catch (error: any) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        const buffer = Buffer.from(await validFile.arrayBuffer());
        const validation = validatePlanFile(buffer, validFile.name, validFile.type);

        if (!validation.ok) {
            return NextResponse.json(
                { success: false, error: validation.error || "Archivo de plano inválido" },
                { status: 400 }
            );
        }

        let uploadResult;
        try {
            uploadResult = await uploadFile({
                folder: "masterplan",
                filename: validFile.name,
                contentType: validFile.type || "application/octet-stream",
                buffer,
            });
        } catch (error: any) {
            return NextResponse.json(
                {
                    success: false,
                    error: error?.message || "No se pudo guardar el archivo original",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: uploadResult.url,
            key: uploadResult.key,
            size: uploadResult.size,
            detectedType: validation.detectedType,
            mimeType: validFile.type || null,
        });
    } catch (error: any) {
        console.error("Error in masterplan upload:", error);
        return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 });
    }
}
