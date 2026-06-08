import "server-only";
import { prisma } from "@/server/db/prisma";

export type AuditEvent =
  | "billing.record_created"
  | "billing.paid"
  | "billing.cancelled"
  | "billing.mp_link_generated"
  | "billing.status_changed"
  | "billing.archived"
  | "org.reactivated"
  | "org.restored"
  | "org.trashed"
  | "org.deleted_permanently"
  | "org.suspended"
  | "settings.updated"
  | "admin.access_granted"
  | "admin.access_revoked"
  | "subscription.updated_manual"
  | "subscription.payment_registered"
  | "subscription.lifetime_granted"
  | "subscription.ai_toggled"
  | "subscription.config_updated"
  | "user.deleted_completely"
  | "user.password_reset"
  | "reservation.payment_confirmed"
  | "reservation.settlement_registered"
  | "reservation.settlement_status_updated";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "outline";
}

export async function logAudit(params: {
  event: AuditEvent;
  actorId?: string;
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event: params.event,
        actorId: params.actorId ?? null,
        actorEmail: params.actorEmail ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        metadata: params.metadata
          ? JSON.parse(JSON.stringify(params.metadata))
          : undefined,
      },
    });
  } catch {
    // Fail silently â€” audit logging must never break the main flow
  }
}
