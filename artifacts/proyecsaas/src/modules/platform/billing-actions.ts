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
  organizationId: z.string().min(1, "Seleccioná una organización."),
  description: z.string().trim().min(2, "La descripción es requerida.").max(200),
  amountARS: z
    .number({ invalid_type_error: "Ingresá un monto válido." })
    .positive("El monto debe ser mayor a 0."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de vencimiento inválida.").optional(),
  notes: z.string().trim().max(500).optional(),
  planId: z.string().trim().min(1).optional(),
});

const updateBillingProSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(BillingStatus).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.").optional().nullable(),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.").optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable(),
  receiptNumber: z.string().max(50).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
  reminderEnabled: z.boolean().optional(),
});

const updateCommercialStateSchema = z.object({
  organizationId: z.string().min(1, "Organización inválida."),
  planId: z.string().trim().min(1, "Seleccioná un plan."),
  subscriptionStatus: z.nativeEnum(SubscriptionStatus),
  billingMode: z.nativeEnum(BillingMode),
  currentPeriodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha de vencimiento válida."),
  internalBillingNotes: z.string().trim().max(1000).optional(),
  planLabel: z.string().trim().max(200).optional().nullable(),
});

function parseEndOfDayUTC(input: string) {
  const [year, month, day] = input.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

function parseDateUTC(input: string) {
  const [year, month, day] = input.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
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
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { organizationId, description, amountARS, dueDate, notes, planId } = parsed.data;

  try {
    const org = await prisma.organization.findFirst({
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
        dueDate: dueDate ? parseDateUTC(dueDate) : null,
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
      metadata: { description, amountARS, dueDate },
    });
    return { success: true, message: "Registro de cobro creado correctamente." };
  } catch (error) {
    console.error("[createBillingRecordAction]", error);
    return { success: false, message: "Error al crear el registro. Intentá nuevamente." };
  }
}

/**
 * Updates a billing record with Commercial Pro fields.
 */
export async function updateBillingProAction(input: unknown): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = updateBillingProSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Datos inválidos." };
  }

  const { id, status, dueDate, paidAt, paymentMethod, receiptNumber, internalNotes, reminderEnabled } = parsed.data;

  try {
    await prisma.orgBillingRecord.update({
      where: { id },
      data: {
        status,
        dueDate: dueDate ? parseDateUTC(dueDate) : dueDate === null ? null : undefined,
        paidAt: paidAt ? parseDateUTC(paidAt) : paidAt === null ? null : undefined,
        paymentMethod,
        receiptNumber,
        internalNotes,
        reminderEnabled,
        ...(status === "PAID" && !paidAt ? { paidAt: new Date() } : {}),
      },
    });

    revalidatePath("/platform/billing");
    return { success: true, message: "Registro actualizado correctamente." };
  } catch (error) {
    console.error("[updateBillingProAction]", error);
    return { success: false, message: "Error al actualizar el registro." };
  }
}

/**
 * Archives a billing record (soft delete / commercial off).
 */
export async function archiveBillingRecordAction(recordId: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    await prisma.orgBillingRecord.update({
      where: { id: recordId },
      data: {
        status: BillingStatus.ARCHIVED,
        archivedAt: new Date(),
        reminderEnabled: false,
      },
    });

    revalidatePath("/platform/billing");
    const actor = await requirePlatformAdmin();
    await logAudit({
      event: "billing.archived",
      actorId: actor.id,
      actorEmail: actor.email,
      entityType: "OrgBillingRecord",
      entityId: recordId,
    });
    return { success: true, message: "Registro archivado correctamente." };
  } catch (error) {
    console.error("[archiveBillingRecordAction]", error);
    return { success: false, message: "Error al archivar el registro." };
  }
}

/**
 * Pauses or resumes billing reminders for a record.
 */
export async function toggleBillingRemindersAction(recordId: string, enabled: boolean, reason?: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    await prisma.orgBillingRecord.update({
      where: { id: recordId },
      data: {
        reminderEnabled: enabled,
        reminderPausedAt: enabled ? null : new Date(),
        reminderPauseReason: enabled ? null : reason || "Pausado manualmente",
      },
    });

    revalidatePath("/platform/billing");
    return { success: true, message: enabled ? "Recordatorios activados." : "Recordatorios pausados." };
  } catch (error) {
    console.error("[toggleBillingRemindersAction]", error);
    return { success: false, message: "Error al cambiar estado de recordatorios." };
  }
}

/**
 * Agente de Cobranzas IA: Sugiere un mensaje de cobranza basado en el estado del registro.
 */
export async function suggestBillingMessageAction(recordId: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const record = await prisma.orgBillingRecord.findUnique({
      where: { id: recordId },
      include: { organization: true },
    });

    if (!record) return { success: false, message: "Registro no encontrado." };

    const now = new Date();
    const isOverdue = record.dueDate && record.dueDate < now && record.status !== "PAID";
    const daysOverdue = record.dueDate ? Math.floor((now.getTime() - record.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    const amountStr = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(record.amountCents / 100);
    const orgName = record.organization.name;
    const paymentLink = record.mpPaymentUrl || "[Link no generado]";

    let message = "";

    if (record.status === "PAID") {
      message = `Hola ${orgName}, recibimos tu pago de ${amountStr} correctamente. ¡Muchas gracias!`;
    } else if (isOverdue) {
      if (daysOverdue > 15) {
        message = `Estimados ${orgName}, el pago de su suscripción (${amountStr}) tiene un retraso importante de ${daysOverdue} días. Por favor, regularicen la situación a la brevedad para evitar la suspensión del servicio. Link: ${paymentLink}`;
      } else {
        message = `Hola ${orgName}, notamos que el pago de ${amountStr} se encuentra vencido hace unos días. Te adjuntamos el link para que puedas ponerte al día: ${paymentLink}. Saludos!`;
      }
    } else {
      message = `Hola ${orgName}, te recordamos que el próximo vencimiento de tu suscripción (${amountStr}) es el ${record.dueDate?.toLocaleDateString("es-AR")}. Podés abonar aquí: ${paymentLink}`;
    }

    return {
      success: true,
      message: "Sugerencia generada.",
      data: { message },
    };
  } catch (error) {
    console.error("[suggestBillingMessageAction]", error);
    return { success: false, message: "Error al sugerir mensaje." };
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
      title: `${record.organization.name} - ${record.description}`,
      amount: record.amountCents / 100,
      currency: "ARS",
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
      data: { 
        status: status as BillingStatus,
        ...(status === "PAID" ? { paidAt: new Date() } : {}),
      },
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
      message: parsed.error.issues[0]?.message ?? "Datos comerciales inválidos.",
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
    planLabel,
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
    return { success: false, message: "Organización no encontrada." };
  }

  let plan = await prisma.plan.findFirst({
    where: { id: planId, isActive: true },
    select: { id: true, name: true },
  });

  if (!plan) {
    plan = await prisma.plan.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });
  }

  if (!plan) {
    // Si no hay planes en la BD, creamos uno al vuelo para no fallar constraints
    plan = await prisma.plan.create({
      data: {
        id: "starter",
        name: "Inicial",
        description: "Plan Inicial por defecto",
        sortOrder: 1,
        isActive: true,
        canUseAiAgents: true,
      },
      select: { id: true, name: true },
    });
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
          planLabel: planLabel || plan.name,
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
          ? `La organización "${org.name}" quedó suspendida manualmente.`
          : `Estado comercial actualizado para "${org.name}".`,
    };
  } catch (error) {
    console.error("[setOrganizationCommercialStateAction]", error);
    return { success: false, message: "No se pudo actualizar el estado comercial." };
  }
}
