"use server";

import { revalidatePath } from "next/cache";
import { BillingStatus, InvoiceStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/modules/types";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { createMercadoPagoPreference } from "@/server/billing/mercadopago";

const createBillingRecordSchema = z.object({
  organizationId: z.string().min(1, "Seleccioná una organización."),
  description: z.string().trim().min(2, "La descripción es requerida.").max(200),
  amountARS: z
    .number({ invalid_type_error: "Ingresá un monto válido." })
    .positive("El monto debe ser mayor a 0."),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Creates a new billing record for an organization.
 */
export async function createBillingRecordAction(input: unknown): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = createBillingRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { organizationId, description, amountARS, notes } = parsed.data;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId, isActive: true },
      select: { id: true },
    });
    if (!org) {
      return { success: false, message: "Organización no encontrada o inactiva." };
    }

    await prisma.orgBillingRecord.create({
      data: {
        organizationId,
        description,
        amountCents: Math.round(amountARS * 100),
        notes: notes || null,
      },
    });

    revalidatePath("/platform/billing");
    return { success: true, message: "Registro de cobro creado correctamente." };
  } catch (error) {
    console.error("[createBillingRecordAction]", error);
    return { success: false, message: "Error al crear el registro. Intentá nuevamente." };
  }
}

/**
 * Generates a Mercado Pago payment link for an existing billing record.
 * Requires MERCADO_PAGO_ACCESS_TOKEN to be set.
 */
export async function generateMPPaymentLinkAction(recordId: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const record = await prisma.orgBillingRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        description: true,
        amountCents: true,
        status: true,
        organization: { select: { name: true } },
      },
    });

    if (!record) {
      return { success: false, message: "Registro no encontrado." };
    }

    if (record.status === BillingStatus.PAID) {
      return { success: false, message: "Este cobro ya está marcado como pagado." };
    }

    if (record.status === BillingStatus.CANCELLED) {
      return { success: false, message: "Este cobro está cancelado." };
    }

    const { preferenceId, checkoutUrl } = await createMercadoPagoPreference({
      title: `${record.organization.name} — ${record.description}`,
      amountARS: record.amountCents / 100,
      externalReference: record.id,
    });

    await prisma.orgBillingRecord.update({
      where: { id: recordId },
      data: { mpPreferenceId: preferenceId, mpPaymentUrl: checkoutUrl },
    });

    revalidatePath("/platform/billing");
    return {
      success: true,
      message: "Link de pago generado correctamente.",
      data: { checkoutUrl },
    };
  } catch (error) {
    console.error("[generateMPPaymentLinkAction]", error);
    const message =
      error instanceof Error && error.message.startsWith("MERCADO_PAGO_ACCESS_TOKEN")
        ? "Mercado Pago no está configurado. Agregá MERCADO_PAGO_ACCESS_TOKEN."
        : "Error al generar el link de pago.";
    return { success: false, message };
  }
}

/**
 * Updates the payment status of a billing record (PENDING → PAID | CANCELLED).
 */
export async function updateBillingStatusAction(
  recordId: string,
  status: "PAID" | "CANCELLED" | "PENDING",
): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    await prisma.orgBillingRecord.update({
      where: { id: recordId },
      data: { status: status as BillingStatus },
    });
    revalidatePath("/platform/billing");
    return { success: true, message: "Estado actualizado." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, message: "Registro no encontrado." };
    }
    return { success: false, message: "Error al actualizar el estado." };
  }
}

/**
 * Updates the invoice status of a billing record.
 */
export async function updateInvoiceStatusAction(
  recordId: string,
  invoiceStatus: "PENDING" | "ISSUED" | "EXEMPT",
  invoiceNumber?: string,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    await prisma.orgBillingRecord.update({
      where: { id: recordId },
      data: {
        invoiceStatus: invoiceStatus as InvoiceStatus,
        invoiceNumber: invoiceNumber?.trim() || null,
      },
    });
    revalidatePath("/platform/billing");
    return { success: true, message: "Estado de factura actualizado." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, message: "Registro no encontrado." };
    }
    return { success: false, message: "Error al actualizar la factura." };
  }
}
