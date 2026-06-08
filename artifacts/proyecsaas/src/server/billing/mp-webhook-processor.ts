import "server-only";

import { BillingMode, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { logAudit } from "@/server/audit/log";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MPWebhookPayload = {
  action?: string;
  type?: string;
  data?: {
    id?: string | number;
  };
};

type MPPaymentAPIResponse = {
  id: number;
  status: string;
  external_reference: string | null;
  // Payment amount fields — present on approved payments.
  transaction_amount?: number;
  currency_id?: string;
};

export type WebhookOutcome =
  | { outcome: "processed"; organizationId: string }
  | { outcome: "skipped"; reason: string }
  | { outcome: "error"; reason: string };

// â”€â”€â”€ MP Payment fetch (fetch-back validation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchMPPayment(
  paymentId: string,
): Promise<MPPaymentAPIResponse | null> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    console.error(
      JSON.stringify({
        scope: "mp-webhook",
        event: "fetch-payment-no-token",
        reason: "MERCADO_PAGO_ACCESS_TOKEN is not configured",
      }),
    );
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "mp-webhook",
        event: "fetch-payment-network-error",
        paymentId,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return null;
  }

  if (!response.ok) {
    console.error(
      JSON.stringify({
        scope: "mp-webhook",
        event: "fetch-payment-api-error",
        paymentId,
        httpStatus: response.status,
      }),
    );
    return null;
  }

  return response.json() as Promise<MPPaymentAPIResponse>;
}

// â”€â”€â”€ Subscription period calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computeNewPeriod(
  existing: { status: SubscriptionStatus; currentPeriodEnd: Date } | null,
  now: Date,
): { newPeriodStart: Date; newPeriodEnd: Date; isRenewal: boolean } {
  const isRenewal =
    existing?.status === SubscriptionStatus.ACTIVE &&
    existing.currentPeriodEnd > now;

  const newPeriodStart = isRenewal ? existing!.currentPeriodEnd : now;
  const newPeriodEnd = new Date(newPeriodStart.getTime() + THIRTY_DAYS_MS);

  return { newPeriodStart, newPeriodEnd, isRenewal };
}

// â”€â”€â”€ Main processor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Processes an incoming Mercado Pago webhook payload.
 *
 * Flow:
 * 1. Filter: only handle approved payment events.
 * 2. Fetch-back: independently verify payment status via MP API.
 * 3. Correlate: find OrgBillingRecord by external_reference.
 * 4. Idempotency: skip if mpPaymentId already matches (already processed).
 * 5. Transaction: mark record as PAID + upsert Subscription (if planId set).
 *
 * Returns a structured outcome â€” the route handler decides the HTTP response.
 */
export async function processMPPaymentWebhook(
  payload: MPWebhookPayload,
): Promise<WebhookOutcome> {
  // â”€â”€ 1. Event filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (payload.type !== "payment") {
    return { outcome: "skipped", reason: `type-not-payment:${payload.type ?? "undefined"}` };
  }

  if (payload.action !== "payment.created" && payload.action !== "payment.updated") {
    return {
      outcome: "skipped",
      reason: `action-not-relevant:${payload.action ?? "undefined"}`,
    };
  }

  const rawPaymentId = payload.data?.id;
  if (!rawPaymentId) {
    return { outcome: "error", reason: "missing-payment-id" };
  }

  const paymentId = String(rawPaymentId);

  // â”€â”€ 2. Fetch-back validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Always verify status independently â€” never trust the webhook body alone.

  const payment = await fetchMPPayment(paymentId);
  if (!payment) {
    return { outcome: "error", reason: "payment-fetch-failed" };
  }

  if (payment.status !== "approved") {
    return {
      outcome: "skipped",
      reason: `payment-not-approved:${payment.status}`,
    };
  }

  const externalReference = payment.external_reference;
  if (!externalReference) {
    return { outcome: "error", reason: "missing-external-reference" };
  }

  // â”€â”€ 3. Correlate with OrgBillingRecord â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // external_reference was set to OrgBillingRecord.id when the preference was created.

  const record = await prisma.orgBillingRecord.findUnique({
    where: { id: externalReference },
    select: {
      id: true,
      organizationId: true,
      status: true,
      mpPaymentId: true,
      planId: true,
    },
  });

  if (!record) {
    // Check if it corresponds to a DevelopmentReservation (centralized Raíces Pilot payment model)
    const reservation = await prisma.developmentReservation.findUnique({
      where: { id: externalReference },
      include: {
        DevelopmentLot: {
          include: {
            Development: {
              include: {
                Organization: { select: { slug: true } },
              },
            },
          },
        },
      },
    });

    if (reservation) {
      // ── Strong idempotency (Fase 2): check mpPaymentId first ──────────────────
      // mpPaymentId is stored when this webhook successfully processes a payment.
      // If the same paymentId arrives again, skip cleanly (duplicate webhook from MP).
      // If a DIFFERENT paymentId is stored, something is wrong — log and skip safely.
      //
      // "as any" cast is temporary: mpPaymentId exists in DB but not in generated Prisma
      // types because prisma generate is blocked by a locked query engine DLL on Windows.
      // Run `npx prisma generate` once the dev server is stopped to restore full types.
      const existingMpPaymentId = (reservation as any).mpPaymentId as string | null | undefined;

      if (existingMpPaymentId === paymentId) {
        console.log(
          JSON.stringify({
            scope: "mp-webhook",
            event: "reservation-already-processed",
            reason: "mpPaymentId-matches",
            reservationId: reservation.id,
            paymentId,
          }),
        );
        return { outcome: "skipped", reason: "reservation-already-processed" };
      }

      if (existingMpPaymentId != null && existingMpPaymentId !== paymentId) {
        console.error(
          JSON.stringify({
            scope: "mp-webhook",
            event: "reservation-payment-id-conflict",
            reason: "different-mpPaymentId-already-stored",
            reservationId: reservation.id,
          }),
        );
        return { outcome: "error", reason: "reservation-payment-id-conflict" };
      }

      // ── Status idempotency: only process reservations awaiting payment ──
      // - ACTIVE / SOLD: already processed, skip cleanly.
      // - CANCELLED: do NOT reactivate via a late webhook — lot may have been re-sold.
      // - Only PENDING_APPROVAL is safe to confirm.
      if (reservation.status !== "PENDING_APPROVAL" || reservation.approvedAt != null) {
        console.log(
          JSON.stringify({
            scope: "mp-webhook",
            event: "reservation-skipped",
            reason: `status-not-pending-approval:${reservation.status}`,
            reservationId: reservation.id,
          }),
        );
        return { outcome: "skipped", reason: `reservation-status-not-pending:${reservation.status}` };
      }

      const lot = reservation.DevelopmentLot;

      // ── Cross-tenant guard ──
      if (!lot || lot.organizationId !== reservation.organizationId) {
        console.error(
          JSON.stringify({
            scope: "mp-webhook",
            event: "reservation-org-mismatch",
            reservationId: reservation.id,
          }),
        );
        return { outcome: "error", reason: "reservation-lot-org-mismatch" };
      }

      // ── Integrity guard: don't overwrite a lot that moved to SOLD ──
      if (lot.status === "SOLD") {
        console.warn(
          JSON.stringify({
            scope: "mp-webhook",
            event: "reservation-lot-already-sold",
            reservationId: reservation.id,
            lotId: lot.id,
          }),
        );
        return { outcome: "skipped", reason: "lot-already-sold" };
      }

      // Capture the actual current status before the transaction changes it
      const previousLotStatus = lot.status;

      // Derive gross amount from MP payment response (convert ARS to centavos).
      // Falls back to the reservation's depositCents if transaction_amount is absent.
      const confirmedGrossCents =
        payment.transaction_amount != null
          ? Math.round(payment.transaction_amount * 100)
          : (reservation.depositCents ?? null);

      await prisma.$transaction([
        prisma.developmentReservation.update({
          where: { id: reservation.id },
          // "as any" is temporary — see mpPaymentId note above.
          data: {
            status: "ACTIVE",
            approvedAt: new Date(),
            mpPaymentId: paymentId,
            mpCurrency: payment.currency_id ?? "ARS",
            grossAmountCents: confirmedGrossCents,
            // Settlement starts as PENDING: Raíces Pilot received funds, transfer to developer pending.
            settlementStatus: "PENDING",
          } as any,
        }),
        prisma.developmentLot.update({
          where: { id: reservation.lotId },
          data: { status: "RESERVED" },
        }),
        prisma.developmentLotHistory.create({
          data: {
            id: `his_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            lotId: reservation.lotId,
            organizationId: reservation.organizationId,
            previousStatus: previousLotStatus, // real status (RESERVED_PENDING), not hardcoded AVAILABLE
            newStatus: "RESERVED",
            reason: "Pago de reserva online confirmado vía Mercado Pago",
          },
        }),
      ]);

      // Audit log for payment traceability
      await logAudit({
        event: "reservation.payment_confirmed",
        entityType: "DevelopmentReservation",
        entityId: reservation.id,
        entityName: reservation.lotId,
        metadata: {
          paymentId,
          lotId: reservation.lotId,
          organizationId: reservation.organizationId,
          grossAmountCents: confirmedGrossCents,
          mpCurrency: payment.currency_id ?? "ARS",
          source: "mercadopago",
        },
      });

      // Notify workspace — non-blocking
      try {
        const orgSlug = lot.Development?.Organization?.slug;
        await prisma.notification.create({
          data: {
            organizationId: reservation.organizationId,
            type: "OPERATOR_ACTION_REQUIRED",
            title: `Pago de reserva confirmado: Lote ${lot.lotNumber}`,
            body: `Se confirmó el pago de seña vía Mercado Pago para el Lote ${lot.lotNumber}. La reserva está activa.`,
            link: orgSlug ? `/${orgSlug}/developments/${lot.developmentId}` : undefined,
            entityType: "developmentReservation",
            entityId: reservation.id,
          },
        });
      } catch (notifError) {
        console.error(
          JSON.stringify({
            scope: "mp-webhook",
            event: "notification-failed",
            reservationId: reservation.id,
            error: notifError instanceof Error ? notifError.message : "unknown",
          }),
        );
      }

      return { outcome: "processed", organizationId: reservation.organizationId };
    }

    console.warn(
      JSON.stringify({
        scope: "mp-webhook",
        event: "billing-record-not-found",
        externalReference,
        paymentId,
      }),
    );
    return { outcome: "error", reason: "billing-record-not-found" };
  }

  // â”€â”€ 4. Idempotency guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // If this exact payment ID was already stored, the transaction completed before.

  if (record.mpPaymentId === paymentId) {
    console.log(
      JSON.stringify({
        scope: "mp-webhook",
        event: "already-processed",
        recordId: record.id,
        paymentId,
      }),
    );
    return { outcome: "skipped", reason: "already-processed" };
  }

  // â”€â”€ 5. Compute subscription period â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const now = new Date();

  const existingSubscription = await prisma.subscription.findUnique({
    where: { organizationId: record.organizationId },
    select: { status: true, currentPeriodEnd: true },
  });

  const { newPeriodStart, newPeriodEnd, isRenewal } = computeNewPeriod(
    existingSubscription,
    now,
  );

  // â”€â”€ 6. Transactional write â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const nextStatus =
    existingSubscription?.status === SubscriptionStatus.SUSPENDED
      ? SubscriptionStatus.SUSPENDED
      : SubscriptionStatus.ACTIVE;

  await prisma.$transaction(async (tx) => {
    // Always mark the billing record as paid
    await tx.orgBillingRecord.update({
      where: { id: record.id },
      data: {
        status: "PAID",
        mpPaymentId: paymentId,
      },
    });

    // Create or renew Subscription only when planId is explicitly set on the record.
    if (record.planId) {
      await tx.subscription.upsert({
        where: { organizationId: record.organizationId },
        create: {
          organizationId: record.organizationId,
          planId: record.planId,
          status: nextStatus,
          billingMode: BillingMode.ONLINE,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false,
          activatedByRecordId: record.id,
        },
        update: {
          planId: record.planId,
          status: nextStatus,
          billingMode: BillingMode.ONLINE,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false,
          activatedByRecordId: record.id,
        },
      });
    } else {
      console.warn(
        JSON.stringify({
          scope: "mp-webhook",
          event: "subscription-skipped-no-planid",
          recordId: record.id,
          organizationId: record.organizationId,
          note: "Set planId on OrgBillingRecord to enable automatic subscription activation.",
        }),
      );
    }
  });

  console.log(
    JSON.stringify({
      scope: "mp-webhook",
      event: "processed",
      recordId: record.id,
      paymentId,
      organizationId: record.organizationId,
      planId: record.planId ?? "not-set",
      isRenewal,
      newPeriodEnd: newPeriodEnd.toISOString(),
    }),
  );

  await logAudit({
    event: "billing.paid",
    entityType: "OrgBillingRecord",
    entityId: record.id,
    entityName: record.organizationId,
    metadata: { paymentId, planId: record.planId ?? null, isRenewal, source: "mercadopago" },
  });

  if (record.planId && nextStatus === SubscriptionStatus.ACTIVE) {
    await logAudit({
      event: "org.reactivated",
      entityType: "Organization",
      entityId: record.organizationId,
      metadata: { trigger: "payment", recordId: record.id, statusApplied: nextStatus },
    });
  }

  return { outcome: "processed", organizationId: record.organizationId };
}
