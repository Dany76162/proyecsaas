"use server";

import { revalidatePath } from "next/cache";
import { BillingMode, BillingStatus, InvoiceStatus, Prisma, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";

import type { ActionResult } from "@/modules/types";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { createMercadoPagoPreference } from "@/server/billing/mercadopago";
import { logAudit } from "@/server/audit/log";

const createBillingRecordSchema = z.object({
  organizationId: z.string().min(1, "SeleccionÃ¡ una organizaciÃ³n."),
  description: z.string().trim().min(2, "La descripciÃ³n es requerida.").max(200),
  amountARS: z
    .number({ invalid_type_error: "IngresÃ¡ un monto vÃ¡lido." })
    .positive("El monto debe ser mayor a 0."),
  notes: z.string().trim().max(500).optional(),
  // Plan this payment is intended to activate. When set, the MP webhook will
  // automatically create or renew the organization's Subscription on payment confirmation.
  planId: z.string().trim().min(1).optional(),
});

const updateCommercialStateSchema = z.object({
  organizationId: z.string().min(1, "OrganizaciÃ³n invÃ¡lida."),
  planId: z.string().trim().min(1, "SeleccionÃ¡ un plan."),
  subscriptionStatus: z.nativeEnum(SubscriptionStatus),
  billingMode: z.nativeEnum(BillingMode),
  currentPeriodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "IngresÃ¡ una fecha de vencimiento vÃ¡lida."),
  internalBillingNotes: z.string().trim().max(1000).optional(),
});

function parseEndOfDayUTC(input: string) {
  const [year, month, day] = input.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

/**
 * Creates a new billing record for an organization.
 */
export async function createBillingRecordAction(input: unknown): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = createBillingRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Datos invÃ¡lidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { organizationId, description, amountARS, notes, planId } = parsed.data;

  try {
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, isActive: true },
      select: { id: true },
    });
    if (!org) {
      return { success: false, message: "OrganizaciÃ³n no encontrada o inactiva." };
    }

    await prisma.orgBillingRecord.create({
      data: {
        organizationId,
        description,
        amountCents: Math.round(amountARS * 100),
        notes: notes || null,
        planId: planId || null,
      },
    });

    revalidatePath("/platform/billing");
    const actor = await requirePlatformAdmin();
    await logAudit({
      event: "billing.record_created",
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: "Organization",
      entityId: organizationId,
      metadata: { description, amountARS },
    });
    return { success: true, message: "Registro de cobro creado correctamente." };
  } catch (error) {
    console.error("[createBillingRecordAction]", error);
    return { success: false, message: "Error al crear el registro. IntentÃ¡ nuevamente." };
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
      return { success: false, message: "Este cobro ya estÃ¡ marcado como pagado." };
    }

    if (record.status === BillingStatus.CANCELLED) {
      return { success: false, message: "Este cobro estÃ¡ cancelado." };
    }

    const { preferenceId, checkoutUrl } = await createMercadoPagoPreference({
      title: `${record.organization.name} â€” ${record.description}`,
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
        ? "Mercado Pago no estÃ¡ configurado. AgregÃ¡ MERCADO_PAGO_ACCESS_TOKEN."
        : "Error al generar el link de pago.";
    return { success: false, message };
  }
}

/**
 * Updates the payment status of a billing record (PENDING â†’ PAID | CANCELLED).
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
    const actor = await requirePlatformAdmin();
    await logAudit({
      event: status === "PAID" ? "billing.paid" : status === "CANCELLED" ? "billing.cancelled" : "billing.status_changed",
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: "OrgBillingRecord",
      entityId: recordId,
      metadata: { status, manual: true },
    });
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

export async function setOrganizationCommercialStateAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePlatformAdmin();

  const parsed = updateCommercialStateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Datos comerciales invÃ¡lidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    organizationId,
    planId,
    subscriptionStatus,
    billingMode,
    currentPeriodEnd: currentPeriodEndInput,
    internalBillingNotes,
  } = parsed.data;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      slug: true,
      name: true,
      subscription: {
        select: {
          currentPeriodStart: true,
        },
      },
    },
  });

  if (!org) {
    return { success: false, message: "OrganizaciÃ³n no encontrada." };
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId, isActive: true },
    select: { id: true, name: true },
  });

  if (!plan) {
    return { success: false, message: "El plan seleccionado no estÃ¡ disponible." };
  }

  const currentPeriodEnd = parseEndOfDayUTC(currentPeriodEndInput);
  const now = new Date();
  const currentPeriodStart = org.subscription?.currentPeriodStart ?? now;

  if (
    (subscriptionStatus === SubscriptionStatus.ACTIVE ||
      subscriptionStatus === SubscriptionStatus.TRIALING) &&
    currentPeriodEnd.getTime() <= now.getTime()
  ) {
    return {
      success: false,
      message: "La fecha de vencimiento debe quedar en el futuro para una cuenta activa o en trial.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { organizationId: org.id },
        create: {
          organizationId: org.id,
          planId: plan.id,
          status: subscriptionStatus,
          billingMode,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionStatus === SubscriptionStatus.CANCELLED,
          internalBillingNotes: internalBillingNotes || null,
        },
        update: {
          planId: plan.id,
          status: subscriptionStatus,
          billingMode,
          currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionStatus === SubscriptionStatus.CANCELLED,
          internalBillingNotes: internalBillingNotes || null,
        },
      });

      await tx.organization.update({
        where: { id: org.id },
        data: {
          planLabel: plan.name,
          ...(subscriptionStatus === SubscriptionStatus.ACTIVE ||
          subscriptionStatus === SubscriptionStatus.TRIALING
            ? { isActive: true }
            : {}),
        },
      });
    });

    revalidatePath("/platform/organizations");
    revalidatePath("/platform/billing");
    revalidatePath(`/${org.slug}`);

    await logAudit({
      event: "subscription.updated_manual",
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: "Organization",
      entityId: org.id,
      entityName: org.name,
      metadata: {
        planId: plan.id,
        subscriptionStatus,
        billingMode,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        internalBillingNotes: internalBillingNotes || null,
      },
    });

    return {
      success: true,
      message:
        subscriptionStatus === SubscriptionStatus.SUSPENDED
          ? `La organizaciÃ³n "${org.name}" quedÃ³ suspendida manualmente.`
          : `Estado comercial actualizado para "${org.name}".`,
    };
  } catch (error) {
    console.error("[setOrganizationCommercialStateAction]", error);
    return { success: false, message: "No se pudo actualizar el estado comercial." };
  }
}
