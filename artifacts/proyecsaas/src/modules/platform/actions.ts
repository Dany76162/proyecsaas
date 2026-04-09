"use server";

import crypto from "node:crypto";
import { MembershipRole, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/modules/types";
import { requirePlatformAdmin } from "@/server/auth/access";
import { logAudit } from "@/server/audit/log";
import { prisma } from "@/server/db/prisma";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "El slug debe tener al menos 2 caracteres.")
    .max(60, "El slug no puede superar los 60 caracteres.")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones."),
  city: z.string().trim().max(100).optional(),
  planLabel: z.string().trim().max(60).optional(),
});

/**
 * Superadmin Action: Creates a new tenant organization.
 */
export async function createOrganizationAction(input: unknown): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, slug, city, planLabel } = parsed.data;

  try {
    await prisma.organization.create({
      data: {
        name,
        slug,
        city: city || null,
        planLabel: planLabel || null,
        isActive: true,
      },
    });

    return {
      success: true,
      message: `Inmobiliaria "${name}" creada correctamente.`,
      data: { slug },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: `El slug "${slug}" ya está en uso. Elegí otro.`,
        fieldErrors: { slug: [`El slug "${slug}" ya está en uso.`] },
      };
    }
    console.error("[createOrganizationAction]", error);
    return { success: false, message: "Error al crear la inmobiliaria. Intentá nuevamente." };
  }
}

const generateInviteSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

/**
 * Superadmin Action: Removes all Memberships from a specific organization.
 * It strictly cuts human access but leaves the operational data intact.
 */
export async function clearOrganizationMembershipsAction(orgSlug: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    const result = await prisma.membership.deleteMany({
      where: { organizationId: org.id },
    });

    return {
      success: true,
      message: `Membresías limpiadas correctamente de "${org.name}". Se eliminaron ${result.count} accesos.`,
    };
  } catch (error) {
    console.error("[clearOrganizationMembershipsAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al intentar limpiar las membresías. Verifica los logs.",
    };
  }
}

/**
 * Superadmin Action: Deactivates an organization (soft delete / baja de cliente).
 * Sets isActive = false, preserving all data but blocking tenant access.
 */
export async function deactivateOrganizationAction(orgSlug: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (org.deletedAt) {
      return {
        success: false,
        message: "Esta inmobiliaria está en papelera. Restaurala antes de volver a operarla.",
      };
    }

    if (!org.isActive) {
      return { success: false, message: "Esta cuenta ya está desactivada." };
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: `La cuenta "${org.name}" fue dada de baja. Los usuarios ya no podrán acceder al workspace.`,
    };
  } catch (error) {
    console.error("[deactivateOrganizationAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al desactivar la cuenta. Verifica los logs.",
    };
  }
}

/**
 * Superadmin Action: Reactivates a previously deactivated organization.
 * Restores workspace access for all existing members.
 */
export async function reactivateOrganizationAction(orgSlug: string): Promise<ActionResult> {
  await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (org.deletedAt) {
      return {
        success: false,
        message: "Esta inmobiliaria está en papelera. Restaurala antes de reactivarla.",
      };
    }

    if (org.isActive) {
      return { success: false, message: "Esta cuenta ya está activa." };
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { isActive: true },
    });

    return {
      success: true,
      message: `La cuenta "${org.name}" fue reactivada. Los usuarios ya pueden acceder al workspace.`,
    };
  } catch (error) {
    console.error("[reactivateOrganizationAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al reactivar la cuenta. Verifica los logs.",
    };
  }
}

/**
 * Superadmin Action: Permanently deletes a tenant organization and all of its
 * tenant-scoped data. Intended only for test orgs or accidental creations.
 */
export async function deleteOrganizationPermanentlyAction(orgSlug: string): Promise<ActionResult> {
  const sessionUser = await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        _count: {
          select: {
            memberships: true,
            inviteTokens: true,
            leads: true,
            properties: true,
            conversations: true,
            visits: true,
            availability: true,
            notifications: true,
            automations: true,
            whatsappChannels: true,
            billingRecords: true,
            aiAgents: true,
          },
        },
        subscription: {
          select: { id: true },
        },
      },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    const platformOrgId = process.env.WHATSAPP_ORGANIZATION_ID?.trim();
    if (platformOrgId && org.id === platformOrgId) {
      return {
        success: false,
        message:
          "No se puede eliminar la organización de plataforma porque sostiene soporte y captación central.",
      };
    }

    if (!org.deletedAt) {
      return {
        success: false,
        message:
          "Para eliminar definitivamente una inmobiliaria primero debe enviarse a papelera.",
      };
    }

    const [propertyIds, leadIds, conversationIds] = await Promise.all([
      prisma.property.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      }),
      prisma.lead.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      }),
      prisma.conversation.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      }),
    ]);

    const propertyIdList = propertyIds.map((item) => item.id);
    const leadIdList = leadIds.map((item) => item.id);
    const conversationIdList = conversationIds.map((item) => item.id);

    const deletedCounts = await prisma.$transaction(async (tx) => {
      
      const inviteTokens = await tx.inviteToken.deleteMany({
        where: { organizationId: org.id },
      });
      const memberships = await tx.membership.deleteMany({
        where: { organizationId: org.id },
      });
      const notifications = await tx.notification.deleteMany({
        where: { organizationId: org.id },
      });
      const automations = await tx.automationRule.deleteMany({
        where: { organizationId: org.id },
      });
      const billingRecords = await tx.orgBillingRecord.deleteMany({
        where: { organizationId: org.id },
      });
      const subscription = await tx.subscription.deleteMany({
        where: { organizationId: org.id },
      });
      const aiAgents = await tx.aiAgent.deleteMany({
        where: { organizationId: org.id },
      });
      const whatsappChannels = await tx.whatsAppChannel.deleteMany({
        where: { organizationId: org.id },
      });
      const propertyImages = await tx.propertyImage.deleteMany({
        where: {
          organizationId: org.id,
          ...(propertyIdList.length ? { propertyId: { in: propertyIdList } } : {}),
        },
      });
      const availability = await tx.availabilitySlot.deleteMany({
        where: {
          organizationId: org.id,
        },
      });
      const messages = await tx.message.deleteMany({
        where: {
          organizationId: org.id,
          ...(conversationIdList.length ? { conversationId: { in: conversationIdList } } : {}),
        },
      });
      const conversations = await tx.conversation.deleteMany({
        where: {
          organizationId: org.id,
        },
      });
      const visits = await tx.visit.deleteMany({
        where: {
          organizationId: org.id,
        },
      });
      const leads = await tx.lead.deleteMany({
        where: {
          organizationId: org.id,
          ...(leadIdList.length ? { id: { in: leadIdList } } : {}),
        },
      });
      const properties = await tx.property.deleteMany({
        where: {
          organizationId: org.id,
          ...(propertyIdList.length ? { id: { in: propertyIdList } } : {}),
        },
      });

      await tx.organization.delete({
        where: { id: org.id },
      });

      return {
        inviteTokens: inviteTokens.count,
        memberships: memberships.count,
        notifications: notifications.count,
        automations: automations.count,
        billingRecords: billingRecords.count,
        subscription: subscription.count,
        aiAgents: aiAgents.count,
        whatsappChannels: whatsappChannels.count,
        propertyImages: propertyImages.count,
        availability: availability.count,
        messages: messages.count,
        conversations: conversations.count,
        visits: visits.count,
        leads: leads.count,
        properties: properties.count,
      };
    }, {
      timeout: 20000,
      maxWait: 10000,
    });

    await logAudit({
      event: "org.deleted_permanently",
      actorId: sessionUser.id,
      actorEmail: sessionUser.email,
      entityType: "Organization",
      entityId: org.id,
      entityName: org.name,
      metadata: {
        slug: org.slug,
        deletedCounts,
      },
    });

    revalidatePath("/platform/organizations");

    return {
      success: true,
      message: `La inmobiliaria "${org.name}" fue eliminada definitivamente.`,
      data: deletedCounts,
    };
  } catch (error) {
    console.error("DELETE ORG ERROR:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[deleteOrganizationPermanentlyAction] Prisma details:", {
        code: error.code,
        meta: error.meta,
        message: error.message,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        message:
          "No se pudo eliminar definitivamente la inmobiliaria por una restricción de integridad.",
      };
    }

    return {
      success: false,
      message: "Hubo un error al eliminar definitivamente la inmobiliaria.",
    };
  }
}

/**
 * Superadmin Action: Moves an organization to trash without deleting data.
 */
export async function moveOrganizationToTrashAction(orgSlug: string): Promise<ActionResult> {
  const sessionUser = await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, slug: true, deletedAt: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    const platformOrgId = process.env.WHATSAPP_ORGANIZATION_ID?.trim();
    if (platformOrgId && org.id === platformOrgId) {
      return {
        success: false,
        message:
          "No se puede mover a papelera la organización de plataforma porque sostiene soporte y captación central.",
      };
    }

    if (org.deletedAt) {
      return { success: false, message: "Esta inmobiliaria ya está en papelera." };
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await logAudit({
      event: "org.trashed",
      actorId: sessionUser.id,
      actorEmail: sessionUser.email,
      entityType: "Organization",
      entityId: org.id,
      entityName: org.name,
      metadata: { slug: org.slug },
    });

    revalidatePath("/platform/organizations");

    return {
      success: true,
      message: `La inmobiliaria "${org.name}" fue movida a papelera.`,
    };
  } catch (error) {
    console.error("[moveOrganizationToTrashAction] Falló:", error);
    return {
      success: false,
      message: "No se pudo mover la inmobiliaria a papelera.",
    };
  }
}

/**
 * Superadmin Action: Restores an organization from trash.
 */
export async function restoreOrganizationFromTrashAction(orgSlug: string): Promise<ActionResult> {
  const sessionUser = await requirePlatformAdmin();

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, slug: true, deletedAt: true },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (!org.deletedAt) {
      return { success: false, message: "Esta inmobiliaria no está en papelera." };
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });

    await logAudit({
      event: "org.restored",
      actorId: sessionUser.id,
      actorEmail: sessionUser.email,
      entityType: "Organization",
      entityId: org.id,
      entityName: org.name,
      metadata: { slug: org.slug },
    });

    revalidatePath("/platform/organizations");

    return {
      success: true,
      message: `La inmobiliaria "${org.name}" fue restaurada desde papelera.`,
    };
  } catch (error) {
    console.error("[restoreOrganizationFromTrashAction] Falló:", error);
    return {
      success: false,
      message: "No se pudo restaurar la inmobiliaria.",
    };
  }
}

/**
 * Superadmin Action: Bootstraps the first user (OWNER) for an organization
 * and generates a direct invite link for them to set their password.
 */
export async function generateInitialAdminInviteAction(
  orgSlug: string,
  input: { email: string; fullName: string }
): Promise<ActionResult> {
  await requirePlatformAdmin();

  const parsed = generateInviteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Datos de usuario inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const normalizedInviteEmail = parsed.success ? parsed.data.email.trim().toLowerCase() : "";

  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, _count: { select: { memberships: true } } },
    });

    if (!org) {
      return { success: false, message: "Inmobiliaria no encontrada." };
    }

    if (org._count.memberships > 0) {
      return {
        success: false,
        message: "Esta inmobiliaria ya posee usuarios asignados. No se puede generar el primer acceso.",
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 168); // 7 días de validez para el 1º acceso

    const { inviteUrl } = await prisma.$transaction(async (tx) => {
      // 1. Crear o actualizar el registro del User global (por si era un invite abandonado)
      const user = await tx.user.upsert({
        where: { email: normalizedInviteEmail },
        create: {
          email: normalizedInviteEmail,
          fullName: parsed.data.fullName,
          isActive: true,
        },
        update: {
          fullName: parsed.data.fullName,
        },
      });

      // 2. Anclarlo a la organización con permisos absolutos (OWNER)
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: MembershipRole.OWNER,
        },
      });

      // 3. Generar token de invitación
      await tx.inviteToken.create({
        data: {
          token,
          userId: user.id,
          organizationId: org.id,
          expiresAt,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (!baseUrl) {
        throw new Error("[generateInitialAdminInviteAction] NEXT_PUBLIC_APP_URL is not configured.");
      }
      const inviteUrl = `${baseUrl}/invite/${token}`;

      return { inviteUrl };
    });

    return {
      success: true,
      message: "Primer acceso admin generado correctamente.",
      data: { inviteUrl },
    };
  } catch (error) {
    console.error("[generateInitialAdminInviteAction] Falló:", error);
    return {
      success: false,
      message: "Hubo un error al generar la invitación. Intenta nuevamente.",
    };
  }
}

/**
 * Superadmin Action: Adjusts the AI agent quota for an org.
 * Called when an agency pays for additional agent slots.
 */
export async function setOrgAgentQuotaAction(
  orgSlug: string,
  quota: number,
  note: string,
): Promise<ActionResult> {
  await requirePlatformAdmin();

  if (!Number.isInteger(quota) || quota < 1 || quota > 20) {
    return { success: false, message: "La cuota debe ser un número entre 1 y 20." };
  }

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) {
    return { success: false, message: "Organización no encontrada." };
  }

  const trimmedNote = note.trim();
  const timestamp = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const noteWithDate = trimmedNote ? `${timestamp} — ${trimmedNote}` : null;

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      maxAiAgents: quota,
      agentQuotaNote: noteWithDate,
    },
  });

  return { success: true, message: `Cuota actualizada a ${quota} agente${quota !== 1 ? "s" : ""}.` };
}

/**
 * Superadmin Action: Creates a new org + bootstraps first OWNER invite in one step.
 * The slug is auto-derived from the org name. Returns the invite URL.
 */
export async function quickOnboardOrgAction(input: {
  orgName: string;
  ownerEmail: string;
}): Promise<ActionResult> {
  await requirePlatformAdmin();

  const orgName = input.orgName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();

  if (!orgName || orgName.length < 2) {
    return { success: false, message: "El nombre de la inmobiliaria es obligatorio." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(ownerEmail)) {
    return { success: false, message: "El email del titular no es válido." };
  }

  // Auto-generate slug from org name
  const baseSlug = orgName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  // Find a unique slug (append -2, -3 if taken)
  let slug = baseSlug;
  let attempt = 1;
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 168); // 7 días

  try {
    const inviteUrl = await prisma.$transaction(async (tx) => {
      // 1. Crear organización
      const org = await tx.organization.create({
        data: { name: orgName, slug, isActive: true },
      });

      // 2. Crear o reusar usuario
      const user = await tx.user.upsert({
        where: { email: ownerEmail },
        create: { email: ownerEmail, fullName: "Titular", isActive: true },
        update: {},
      });

      // Check if already has membership
      const existingMembership = await tx.membership.findFirst({
        where: { userId: user.id, organizationId: org.id },
      });
      if (!existingMembership) {
        await tx.membership.create({
          data: { userId: user.id, organizationId: org.id, role: MembershipRole.OWNER },
        });
      }

      // 3. Crear invite token
      await tx.inviteToken.create({
        data: { token, userId: user.id, organizationId: org.id, expiresAt },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
      if (!baseUrl) {
        throw new Error("[quickOnboardOrgAction] NEXT_PUBLIC_APP_URL is not configured.");
      }
      return `${baseUrl}/invite/${token}`;
    });

    return {
      success: true,
      message: `Inmobiliaria "${orgName}" creada. Link de acceso listo.`,
      data: { inviteUrl, slug },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "El email ya está registrado en otra organización." };
    }
    console.error("[quickOnboardOrgAction]", error);
    return { success: false, message: "Error al crear la inmobiliaria. Intentá nuevamente." };
  }
}
