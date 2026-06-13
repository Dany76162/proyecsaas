"use server";

import { prisma } from "@/server/db/prisma";
import { requireOrganizationMembership } from "@/server/auth/access";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  createFinancialVaultSession,
  clearFinancialVaultSession,
} from "@/server/auth/financial-vault";
import {
  FinancialEntityType,
  FinancialRole,
  FinancialAuditEvent,
} from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ── activateFinancialVault ────────────────────────────────────────────────────

export async function activateFinancialVaultAction(
  orgSlug: string,
  developmentId: string,
  input: {
    ownerName: string;
    ownerEmail: string;
    ownerEntityType: FinancialEntityType;
    vaultKey: string;
  },
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);

  // P0 — Superadmin cannot activate the financial vault
  if (user.isPlatformAdmin) {
    return {
      ok: false,
      error:
        "Balance y Rendición es un área financiera privada del tenant. El acceso desde Superadmin no está habilitado.",
    };
  }

  const organizationId = membership.organization.id;

  // Verify development belongs to this org
  const development = await prisma.development.findFirst({
    where: { id: developmentId, organizationId },
    select: { id: true, name: true },
  });
  if (!development) {
    return { ok: false, error: "Desarrollo no encontrado." };
  }

  // Validate inputs
  if (!input.ownerName.trim()) {
    return { ok: false, error: "El nombre del responsable es requerido." };
  }
  if (!input.ownerEmail.trim() || !input.ownerEmail.includes("@")) {
    return { ok: false, error: "El email del responsable es inválido." };
  }
  if (!input.vaultKey || input.vaultKey.length < 8) {
    return { ok: false, error: "La clave privada debe tener al menos 8 caracteres." };
  }

  // Prevent double-activation
  const existing = await prisma.developmentFinancialVault.findUnique({
    where: { developmentId },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "El módulo financiero ya está activado para este desarrollo." };
  }

  // Hash the vault key
  const vaultKeyHash = await hashPassword(input.vaultKey);

  // Create vault + audit in a transaction
  const vault = await prisma.$transaction(async (tx) => {
    const newVault = await tx.developmentFinancialVault.create({
      data: {
        developmentId,
        organizationId,
        ownerUserId: user.id,
        ownerName: input.ownerName.trim(),
        ownerEmail: input.ownerEmail.trim().toLowerCase(),
        ownerEntityType: input.ownerEntityType,
        vaultKeyHash,
      },
    });

    await tx.developmentFinancialAccess.create({
      data: {
        vaultId: newVault.id,
        userId: user.id,
        role: FinancialRole.OWNER,
      },
    });

    await tx.developmentFinancialAuditLog.create({
      data: {
        vaultId: newVault.id,
        organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.VAULT_ACTIVATED,
        entityType: "development",
        entityId: developmentId,
        metadata: {
          developmentName: development.name,
          ownerEmail: input.ownerEmail.trim().toLowerCase(),
          ownerEntityType: input.ownerEntityType,
        },
      },
    });

    return newVault;
  });

  // Create financial session (logged-in immediately after activation)
  await createFinancialVaultSession({
    vaultId: vault.id,
    userId: user.id,
    organizationId,
    developmentId,
    role: "OWNER",
  });

  return { ok: true };
}

// ── loginFinancialVault ───────────────────────────────────────────────────────

export async function loginFinancialVaultAction(
  orgSlug: string,
  developmentId: string,
  vaultKey: string,
): Promise<ActionResult> {
  const { user, membership } = await requireOrganizationMembership(orgSlug);

  // P0 — Superadmin blocked
  if (user.isPlatformAdmin) {
    return {
      ok: false,
      error:
        "Balance y Rendición es un área financiera privada del tenant. El acceso desde Superadmin no está habilitado.",
    };
  }

  const organizationId = membership.organization.id;

  // Load vault — must belong to this org
  const vault = await prisma.developmentFinancialVault.findFirst({
    where: { developmentId, organizationId, isActive: true },
    select: { id: true, vaultKeyHash: true, ownerEmail: true },
  });

  if (!vault) {
    return { ok: false, error: "Módulo financiero no encontrado o inactivo." };
  }

  // Verify key
  const valid = await verifyPassword(vaultKey, vault.vaultKeyHash);

  if (!valid) {
    // Log failed attempt
    await prisma.developmentFinancialAuditLog.create({
      data: {
        vaultId: vault.id,
        organizationId,
        actorId: user.id,
        actorEmail: user.email,
        event: FinancialAuditEvent.MODULE_ACCESS_FAILED,
        metadata: { developmentId },
      },
    });
    return { ok: false, error: "Clave incorrecta. El acceso ha sido registrado." };
  }

  // Log success + update stats
  await prisma.$transaction([
    prisma.developmentFinancialVault.update({
      where: { id: vault.id },
      data: {
        lastAccessAt: new Date(),
        accessCount: { increment: 1 },
      },
    }),
    prisma.developmentFinancialAccess.create({
      data: {
        vaultId: vault.id,
        userId: user.id,
        role: FinancialRole.OWNER,
      },
    }),
    prisma.developmentFinancialAuditLog.create({
      data: {
        vaultId: vault.id,
        organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: FinancialRole.OWNER,
        event: FinancialAuditEvent.MODULE_ACCESS,
        metadata: { developmentId },
      },
    }),
  ]);

  // Create financial session
  await createFinancialVaultSession({
    vaultId: vault.id,
    userId: user.id,
    organizationId,
    developmentId,
    role: "OWNER",
  });

  return { ok: true };
}

// ── logoutFinancialVault ──────────────────────────────────────────────────────

export async function logoutFinancialVaultAction(): Promise<ActionResult> {
  await clearFinancialVaultSession();
  return { ok: true };
}
