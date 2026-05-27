"use server";

import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

export type InitializeSandboxResult = {
  success: boolean;
  message: string;
  createdOrganization: boolean;
  createdSubscription: boolean;
  createdMembership: boolean;
  orgId: string | null;
  subscriptionId: string | null;
  membershipId: string | null;
  error?: string;
};

export async function initializeProductionSandboxAction(): Promise<InitializeSandboxResult> {
  try {
    // 1. Rigorous security check - only Superadmins
    const sessionUser = await requirePlatformAdmin();
    const targetSlug = "raicespilot-qa-test";

    // 2. Query existing sandbox organization
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: targetSlug },
      include: { subscription: true, memberships: true }
    });

    let orgId: string | null = existingOrg?.id || null;
    let subscriptionId: string | null = existingOrg?.subscription?.id || null;
    let membershipId: string | null = null;

    let createdOrganization = false;
    let createdSubscription = false;
    let createdMembership = false;

    // A) If Organization does not exist, create it!
    if (!existingOrg) {
      // Find available plans in DB
      const availablePlans = await prisma.plan.findMany({ select: { id: true } });
      const preferredPlan = availablePlans.find(p => 
        p.id.toLowerCase().includes("piloto") || 
        p.id.toLowerCase().includes("founder") || 
        p.id.toLowerCase().includes("starter")
      );
      const planIdToUse = preferredPlan ? preferredPlan.id : (availablePlans[0]?.id || "piloto");

      const createdOrg = await prisma.organization.create({
        data: {
          name: "RaicesPilot QA Test",
          slug: targetSlug,
          city: "Buenos Aires",
          isActive: true,
          description: "Organización de pruebas y sandbox interno del sistema QA Operativo.",
          planLabel: "$65.000 + impuestos",
          subscription: {
            create: {
              planId: planIdToUse,
              status: "ACTIVE",
              billingMode: "COURTESY",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              planCode: "FOUNDER",
              paidCycles: 1,
              aiStatus: "ACTIVE",
              aiMonthlyConversationLimit: 300,
              aiMonthlyConversationsUsed: 0,
              lifetimeGrantedAt: null,
              internalBillingNotes: "internal-sandbox: RaicesPilot QA Test. No contabilizar en métricas comerciales reales."
            }
          },
          memberships: {
            create: {
              userId: sessionUser.id,
              role: "OWNER"
            }
          }
        },
        include: {
          subscription: true,
          memberships: true
        }
      });

      orgId = createdOrg.id;
      subscriptionId = createdOrg.subscription?.id || null;
      membershipId = createdOrg.memberships[0]?.id || null;
      createdOrganization = true;
      createdSubscription = true;
      createdMembership = true;
    } else {
      // B) Organization exists. Check and heal subscription
      if (!existingOrg.subscription) {
        const availablePlans = await prisma.plan.findMany({ select: { id: true } });
        const preferredPlan = availablePlans.find(p => 
          p.id.toLowerCase().includes("piloto") || 
          p.id.toLowerCase().includes("founder") || 
          p.id.toLowerCase().includes("starter")
        );
        const planIdToUse = preferredPlan ? preferredPlan.id : (availablePlans[0]?.id || "piloto");

        const newSub = await prisma.subscription.create({
          data: {
            organizationId: existingOrg.id,
            planId: planIdToUse,
            status: "ACTIVE",
            billingMode: "COURTESY",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            planCode: "FOUNDER",
            paidCycles: 1,
            aiStatus: "ACTIVE",
            aiMonthlyConversationLimit: 300,
            aiMonthlyConversationsUsed: 0,
            lifetimeGrantedAt: null,
            internalBillingNotes: "internal-sandbox: RaicesPilot QA Test. No contabilizar en métricas comerciales reales."
          }
        });

        subscriptionId = newSub.id;
        createdSubscription = true;
      }

      // C) Organization exists. Check and heal Owner Membership for current user
      const existingUserMembership = existingOrg.memberships.find(m => m.userId === sessionUser.id);
      if (!existingUserMembership) {
        const newMembership = await prisma.membership.create({
          data: {
            userId: sessionUser.id,
            organizationId: existingOrg.id,
            role: "OWNER"
          }
        });
        membershipId = newMembership.id;
        createdMembership = true;
      } else {
        membershipId = existingUserMembership.id;
      }
    }

    // 3. Register a structured DB Audit Log
    const auditData = {
      createdOrganization,
      createdSubscription,
      createdMembership,
      orgId,
      slug: targetSlug,
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-initialized",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: orgId,
        entityName: "RaicesPilot QA Test",
        metadata: auditData
      }
    });

    // 4. Log a structured JSON string in Railway/console
    console.log(JSON.stringify({
      scope: "qa-sandbox-initializer",
      event: "qa-sandbox-initialized",
      userId: sessionUser.id,
      email: sessionUser.email,
      ...auditData
    }));

    return {
      success: true,
      message: createdOrganization
        ? "Organización sandbox, suscripción y membresía OWNER creadas con éxito."
        : createdSubscription || createdMembership
          ? "La organización ya existía. Se inicializó la suscripción o membresía OWNER faltante con éxito."
          : "El sandbox y tu membresía OWNER ya están completamente activos e inicializados en la plataforma.",
      createdOrganization,
      createdSubscription,
      createdMembership,
      orgId,
      subscriptionId,
      membershipId
    };
  } catch (err: any) {
    console.error("Error in initializeProductionSandboxAction:", err);
    return {
      success: false,
      message: err.message || String(err),
      createdOrganization: false,
      createdSubscription: false,
      createdMembership: false,
      orgId: null,
      subscriptionId: null,
      membershipId: null,
      error: err.message || String(err)
    };
  }
}
