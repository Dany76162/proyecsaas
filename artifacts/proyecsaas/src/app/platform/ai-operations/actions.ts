"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";

export type TenantAiHealthStatus = 
  | "ONBOARDING_INCOMPLETE"
  | "ZERO_TRAFFIC"
  | "ATASCADO"
  | "READY_UPSELL"
  | "HEALTHY";

export type TenantAiHealth = {
  orgId: string;
  orgName: string;
  planLabel: string | null;
  whatsappStatus: string | null;
  aiStatus: string | null;
  metrics: {
    inbounds: number;
    outbounds: number;
    leadsCaptados: number;
    conversacionesDerivadas: number; // Handoffs
  };
  subscription: {
    status: string | null;
    daysLeft: number | null;
  };
  healthStatus: TenantAiHealthStatus;
};

export async function getTenantsAiHealth(): Promise<TenantAiHealth[]> {
  await requirePlatformAdmin();
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get all active orgs with their WA channel, AI agent, and subscription
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      planLabel: true,
      whatsappChannels: {
        where: { isPrimary: true },
        select: { status: true, lastInboundAt: true }
      },
      aiAgents: {
        select: { status: true }
      },
      subscription: {
        select: { status: true, currentPeriodEnd: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Get metrics in parallel
  const [inbounds, outbounds, leads, handoffs] = await Promise.all([
    // Inbound messages last 7 days
    prisma.message.groupBy({
      by: ["organizationId"],
      where: { direction: "INBOUND", createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true }
    }),
    // Outbound messages last 7 days (AI replies)
    prisma.message.groupBy({
      by: ["organizationId"],
      where: { direction: "OUTBOUND", createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true }
    }),
    // Leads captured last 7 days
    prisma.lead.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true }
    }),
    // Handoffs conversations
    prisma.conversation.groupBy({
      by: ["organizationId"],
      where: { isHumanControlled: true, updatedAt: { gte: sevenDaysAgo } },
      _count: { _all: true }
    })
  ]);

  const mapCount = (arr: any[]) => new Map(arr.map(r => [r.organizationId, r._count._all]));
  
  const inboundsMap = mapCount(inbounds);
  const outboundsMap = mapCount(outbounds);
  const leadsMap = mapCount(leads);
  const handoffsMap = mapCount(handoffs);

  return orgs.map(org => {
    const wa = org.whatsappChannels[0];
    const ai = org.aiAgents;
    const sub = org.subscription;
    
    let daysLeft = null;
    if (sub && sub.currentPeriodEnd) {
      daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    const tMetrics = {
      inbounds: inboundsMap.get(org.id) || 0,
      outbounds: outboundsMap.get(org.id) || 0,
      leadsCaptados: leadsMap.get(org.id) || 0,
      conversacionesDerivadas: handoffsMap.get(org.id) || 0,
    };

    // Calculate Health Status
    let healthStatus: TenantAiHealthStatus = "HEALTHY";
    
    if (!wa || wa.status !== "ACTIVE" || !ai || ai.status !== "ACTIVE") {
      healthStatus = "ONBOARDING_INCOMPLETE";
    } else if (tMetrics.inbounds === 0) {
      healthStatus = "ZERO_TRAFFIC";
    } else if (tMetrics.conversacionesDerivadas > 3 && tMetrics.outbounds < tMetrics.inbounds / 2) {
      healthStatus = "ATASCADO";
    } else if (sub?.status === "TRIALING" && daysLeft !== null && daysLeft <= 3 && tMetrics.leadsCaptados > 0) {
      healthStatus = "READY_UPSELL";
    }

    return {
      orgId: org.id,
      orgName: org.name,
      planLabel: org.planLabel || "Desconocido",
      whatsappStatus: wa?.status || "INACTIVE",
      aiStatus: ai?.status || "DRAFT",
      metrics: tMetrics,
      subscription: {
        status: sub?.status || null,
        daysLeft
      },
      healthStatus
    };
  });
}
