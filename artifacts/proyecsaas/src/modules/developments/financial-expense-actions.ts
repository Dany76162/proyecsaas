"use server";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { getFinancialVaultSessionForVault } from "@/server/auth/financial-vault";
import {
  FinancialRole,
  FinancialAuditEvent,
  ExpenseCategory,
  ExpenseStatus,
} from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validates user membership, blocks superadmin, resolves vault,
 * and checks the financial vault session.
 */
type VaultCtxError = { error: string };
type VaultCtxOk = { user: Awaited<ReturnType<typeof requireOrganizationMembership>>["user"]; organizationId: string; vaultId: string; session: NonNullable<Awaited<ReturnType<typeof getFinancialVaultSessionForVault>>> };

async function resolveVaultContext(orgSlug: string, developmentId: string): Promise<VaultCtxError | VaultCtxOk> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);

  if (user.isPlatformAdmin) {
    return { error: "Balance y Rendición es un área financiera privada del tenant. El acceso desde Superadmin no está habilitado." };
  }

  const organizationId = membership.organization.id;

  const vault = await prisma.developmentFinancialVault.findFirst({
    where: { developmentId, organizationId, isActive: true },
    select: { id: true },
  });

  if (!vault) {
    return { error: "Módulo financiero no encontrado o inactivo." };
  }

  const session = await getFinancialVaultSessionForVault(vault.id, developmentId, organizationId);
  if (!session) {
    return { error: "Sesión financiera inválida o expirada. Ingresá nuevamente." };
  }

  return { user, organizationId, vaultId: vault.id, session };
}

// ── createExpense ─────────────────────────────────────────────────────────────

export interface CreateExpenseInput {
  date: string; // ISO date string
  amountCents: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  provider?: string;
  paidBy?: string;
  paymentMethod?: string;
  paymentReference?: string;
  internalNotes?: string;
}

export async function createExpenseAction(
  orgSlug: string,
  developmentId: string,
  input: CreateExpenseInput,
): Promise<ActionResult<{ expenseId: string }>> {
  const ctx = await resolveVaultContext(orgSlug, developmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, organizationId, vaultId } = ctx;

  // Validate input
  if (!input.description?.trim()) {
    return { ok: false, error: "La descripción es requerida." };
  }
  if (!input.amountCents || input.amountCents <= 0) {
    return { ok: false, error: "El monto debe ser mayor a cero." };
  }
  if (!input.date) {
    return { ok: false, error: "La fecha es requerida." };
  }
  const parsedDate = new Date(input.date);
  if (isNaN(parsedDate.getTime())) {
    return { ok: false, error: "La fecha no es válida." };
  }

  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.developmentFinancialExpense.create({
      data: {
        vaultId,
        organizationId,
        developmentId,
        date: parsedDate,
        amountCents: input.amountCents,
        currency: input.currency || "ARS",
        category: input.category,
        description: input.description.trim(),
        provider: input.provider?.trim() || null,
        paidBy: input.paidBy?.trim() || null,
        paymentMethod: input.paymentMethod?.trim() || null,
        paymentReference: input.paymentReference?.trim() || null,
        internalNotes: input.internalNotes?.trim() || null,
        createdById: user.id,
      },
    });

    await tx.developmentFinancialAuditLog.create({
      data: {
        vaultId,
        organizationId,
        actorId: user.id,
        actorEmail: user.email ?? "",
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.EXPENSE_CREATED,
        entityType: "expense",
        entityId: newExpense.id,
        metadata: {
          amountCents: input.amountCents,
          currency: input.currency,
          category: input.category,
          description: input.description.trim(),
        },
      },
    });

    return newExpense;
  });

  return { ok: true, data: { expenseId: expense.id } };
}

// ── approveExpense ────────────────────────────────────────────────────────────

export async function approveExpenseAction(
  orgSlug: string,
  developmentId: string,
  expenseId: string,
): Promise<ActionResult> {
  const ctx = await resolveVaultContext(orgSlug, developmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, organizationId, vaultId } = ctx;

  const expense = await prisma.developmentFinancialExpense.findFirst({
    where: { id: expenseId, vaultId, organizationId },
    select: { id: true, status: true },
  });

  if (!expense) return { ok: false, error: "Gasto no encontrado." };
  if (expense.status !== ExpenseStatus.PENDING) {
    return { ok: false, error: "Solo se pueden aprobar gastos en estado PENDIENTE." };
  }

  await prisma.$transaction([
    prisma.developmentFinancialExpense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    }),
    prisma.developmentFinancialAuditLog.create({
      data: {
        vaultId,
        organizationId,
        actorId: user.id,
        actorEmail: user.email ?? "",
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.EXPENSE_APPROVED,
        entityType: "expense",
        entityId: expenseId,
      },
    }),
  ]);

  return { ok: true };
}

// ── rejectExpense ─────────────────────────────────────────────────────────────

export async function rejectExpenseAction(
  orgSlug: string,
  developmentId: string,
  expenseId: string,
  rejectionReason: string,
): Promise<ActionResult> {
  const ctx = await resolveVaultContext(orgSlug, developmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, organizationId, vaultId } = ctx;

  if (!rejectionReason?.trim()) {
    return { ok: false, error: "El motivo de rechazo es requerido." };
  }

  const expense = await prisma.developmentFinancialExpense.findFirst({
    where: { id: expenseId, vaultId, organizationId },
    select: { id: true, status: true },
  });

  if (!expense) return { ok: false, error: "Gasto no encontrado." };
  if (expense.status !== ExpenseStatus.PENDING) {
    return { ok: false, error: "Solo se pueden rechazar gastos en estado PENDIENTE." };
  }

  await prisma.$transaction([
    prisma.developmentFinancialExpense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.REJECTED,
        rejectedById: user.id,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
    }),
    prisma.developmentFinancialAuditLog.create({
      data: {
        vaultId,
        organizationId,
        actorId: user.id,
        actorEmail: user.email ?? "",
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.EXPENSE_REJECTED,
        entityType: "expense",
        entityId: expenseId,
        metadata: { rejectionReason: rejectionReason.trim() },
      },
    }),
  ]);

  return { ok: true };
}

// ── voidExpense ───────────────────────────────────────────────────────────────

export async function voidExpenseAction(
  orgSlug: string,
  developmentId: string,
  expenseId: string,
  voidReason: string,
): Promise<ActionResult> {
  const ctx = await resolveVaultContext(orgSlug, developmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, organizationId, vaultId } = ctx;

  if (!voidReason?.trim()) {
    return { ok: false, error: "El motivo de anulación es requerido." };
  }

  const expense = await prisma.developmentFinancialExpense.findFirst({
    where: { id: expenseId, vaultId, organizationId },
    select: { id: true, status: true },
  });

  if (!expense) return { ok: false, error: "Gasto no encontrado." };
  if (expense.status === ExpenseStatus.VOIDED) {
    return { ok: false, error: "El gasto ya está anulado." };
  }

  await prisma.$transaction([
    prisma.developmentFinancialExpense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.VOIDED,
        voidedById: user.id,
        voidedAt: new Date(),
        voidReason: voidReason.trim(),
      },
    }),
    prisma.developmentFinancialAuditLog.create({
      data: {
        vaultId,
        organizationId,
        actorId: user.id,
        actorEmail: user.email ?? "",
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.EXPENSE_VOIDED,
        entityType: "expense",
        entityId: expenseId,
        metadata: { voidReason: voidReason.trim() },
      },
    }),
  ]);

  return { ok: true };
}

// ── registerAttachment ────────────────────────────────────────────────────────

export async function registerAttachmentAction(
  orgSlug: string,
  developmentId: string,
  expenseId: string,
  attachment: {
    filename: string;
    contentType: string;
    sizeBytes: number;
    r2Key: string;
    description?: string;
  },
): Promise<ActionResult<{ attachmentId: string }>> {
  const ctx = await resolveVaultContext(orgSlug, developmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, organizationId, vaultId } = ctx;

  // Confirm expense belongs to this vault
  const expense = await prisma.developmentFinancialExpense.findFirst({
    where: { id: expenseId, vaultId, organizationId },
    select: { id: true, status: true },
  });

  if (!expense) return { ok: false, error: "Gasto no encontrado." };
  if (expense.status === ExpenseStatus.VOIDED) {
    return { ok: false, error: "No se pueden agregar comprobantes a un gasto anulado." };
  }

  const record = await prisma.$transaction(async (tx) => {
    const att = await tx.developmentFinancialAttachment.create({
      data: {
        expenseId,
        vaultId,
        organizationId,
        filename: attachment.filename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        r2Key: attachment.r2Key,
        description: attachment.description?.trim() || null,
        uploadedById: user.id,
      },
    });

    await tx.developmentFinancialAuditLog.create({
      data: {
        vaultId,
        organizationId,
        actorId: user.id,
        actorEmail: user.email ?? "",
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.ATTACHMENT_UPLOADED,
        entityType: "attachment",
        entityId: att.id,
        metadata: { filename: attachment.filename, expenseId },
      },
    });

    return att;
  });

  return { ok: true, data: { attachmentId: record.id } };
}
