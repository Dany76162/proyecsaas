import { Prisma, PrismaClient, MembershipRole, SubscriptionStatus, WhatsAppProvider, AiAgentMode, AiAgentTone } from "@prisma/client";
import { encryptToken, isEncryptedToken } from "../src/server/security/token-encryption";
import { resolveInboundByPhoneNumberId } from "../src/server/whatsapp/channel-resolver";

const prisma = new PrismaClient();

const DEMO_SLUG = "raicespilot-demo";
const DEMO_NAME = "Raíces Pilot Demo";
const DEMO_EMAIL = "demo@raicespilot.com";
const DEMO_PHONE_NUMBER_ID = "1138155372723730";
const DEMO_DISPLAY_PHONE = "+5491166037971";
const DEMO_PROVIDER = WhatsAppProvider.WHATSAPP_CLOUD;
const DRY_RUN_ORGANIZATION_ID = `DRY_RUN_ORG_ID_${DEMO_SLUG}`;

type SummaryState = {
  org: "created" | "updated" | "existing" | "planned-create" | "planned-update";
  channel: "created" | "updated" | "existing" | "planned-create" | "planned-update";
  aiAgent: "created" | "updated" | "existing" | "planned-create" | "planned-update";
  validations: Array<{ name: string; status: "passed" | "failed" | "warning"; detail: string }>;
};

type ExecutionContext = {
  execute: boolean;
  summary: SummaryState;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function maskEncrypted(value: string) {
  return `[encrypted, ${value.length} chars, ${isEncryptedToken(value) ? "aes-256-gcm" : "legacy"}]`;
}

function logInfo(message: string) {
  console.log(`[INFO] ${message}`);
}

function logOk(message: string) {
  console.log(`[OK] ${message}`);
}

function logWarn(message: string) {
  console.warn(`[WARNING] ${message}`);
}

function logFail(message: string) {
  console.error(`[FALLO] ${message}`);
}

async function pickPlanId() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ canUseAiAgents: "desc" }, { canUseAutomations: "desc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      canUseAiAgents: true,
      canUseAutomations: true,
    },
  });

  const preferred = plans.find((plan) => plan.canUseAiAgents && plan.canUseAutomations) ?? plans[0];
  if (!preferred) {
    throw new Error("No active Plan found to attach the demo subscription.");
  }
  return preferred;
}

async function ensureOrganization(tx: Prisma.TransactionClient, execute: boolean) {
  const existing = await tx.organization.findUnique({
    where: { slug: DEMO_SLUG },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!existing) {
    if (!execute) {
      return { organization: null, status: "planned-create" as const };
    }
    const created = await tx.organization.create({
      data: { slug: DEMO_SLUG, name: DEMO_NAME, isActive: true },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    return { organization: created, status: "created" as const };
  }

  if (existing.name !== DEMO_NAME || !existing.isActive) {
    if (!execute) {
      return { organization: existing, status: "planned-update" as const };
    }
    const updated = await tx.organization.update({
      where: { id: existing.id },
      data: { name: DEMO_NAME, isActive: true },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    return { organization: updated, status: "updated" as const };
  }

  return { organization: existing, status: "existing" as const };
}

async function ensureAdminAndMembership(
  tx: Prisma.TransactionClient,
  organizationId: string,
  execute: boolean,
) {
  const user = await tx.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, email: true, fullName: true, isActive: true },
  });

  const ensuredUser =
    user ??
    (execute
      ? await tx.user.create({
          data: {
            email: DEMO_EMAIL,
            fullName: DEMO_NAME,
            isActive: true,
          },
          select: { id: true, email: true, fullName: true, isActive: true },
        })
      : null);

  const userId = ensuredUser?.id ?? user?.id;
  if (!userId) {
    return { userStatus: "planned-create", membershipStatus: "planned-create" } as const;
  }

  if (!execute && organizationId === DRY_RUN_ORGANIZATION_ID) {
    return {
      userStatus: user ? "existing" : "planned-create",
      membershipStatus: "planned-create",
    } as const;
  }

  const membership = await tx.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: { id: true, role: true },
  });

  let membershipStatus: "created" | "updated" | "existing" | "planned-create" | "planned-update" = "existing";

  if (!membership) {
    if (execute) {
      await tx.membership.create({
        data: {
          userId,
          organizationId,
          role: MembershipRole.OWNER,
        },
      });
      membershipStatus = "created";
    } else {
      membershipStatus = "planned-create";
    }
  } else if (membership.role !== MembershipRole.OWNER) {
    if (execute) {
      await tx.membership.update({
        where: { id: membership.id },
        data: { role: MembershipRole.OWNER },
      });
      membershipStatus = "updated";
    } else {
      membershipStatus = "planned-update";
    }
  }

  return {
    userStatus: user ? "existing" : execute ? "created" : "planned-create",
    membershipStatus,
  } as const;
}

async function ensureSubscription(
  tx: Prisma.TransactionClient,
  organizationId: string,
  execute: boolean,
) {
  const plan = await pickPlanId();
  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setFullYear(now.getFullYear() + 1);

  const desired = {
    planId: plan.id,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: now,
    currentPeriodEnd: nextYear,
    planCode: plan.id.toUpperCase(),
    aiStatus: "ACTIVE",
    aiMonthlyConversationLimit: 1000000,
  };

  if (!execute && organizationId === DRY_RUN_ORGANIZATION_ID) {
    return { status: "planned-create" as const, planId: plan.id };
  }

  const existing = await tx.subscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      planId: true,
      status: true,
      aiStatus: true,
      aiMonthlyConversationLimit: true,
      aiMonthlyConversationsUsed: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  if (!existing) {
    if (!execute) {
      return { status: "planned-create" as const, planId: plan.id };
    }
    await tx.subscription.create({
      data: {
        organizationId,
        ...desired,
      },
    });
    return { status: "created" as const, planId: plan.id };
  }

  const needsUpdate =
    existing.planId !== desired.planId ||
    existing.status !== desired.status ||
    existing.aiStatus !== desired.aiStatus ||
    existing.aiMonthlyConversationLimit < desired.aiMonthlyConversationLimit;

  if (!needsUpdate) {
    return { status: "existing" as const, planId: plan.id };
  }

  if (!execute) {
    return { status: "planned-update" as const, planId: plan.id };
  }

  await tx.subscription.update({
    where: { organizationId },
    data: desired,
  });
  return { status: "updated" as const, planId: plan.id };
}

async function ensureWhatsAppChannel(
  tx: Prisma.TransactionClient,
  organizationId: string,
  execute: boolean,
) {
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");
  const encrypted = encryptToken(accessToken);
  const existing = await tx.whatsAppChannel.findUnique({
    where: { phoneNumberId: DEMO_PHONE_NUMBER_ID },
    select: {
      id: true,
      organizationId: true,
      provider: true,
      isPrimary: true,
      isActive: true,
      status: true,
      verificationStatus: true,
      webhookSubscribed: true,
      displayPhoneNumber: true,
      verifiedDisplayName: true,
      accessTokenEncrypted: true,
      phoneNumberId: true,
    },
  });

  const desired = {
    organizationId,
    provider: DEMO_PROVIDER,
    isPrimary: true,
    isActive: true,
    status: "ACTIVE" as const,
    displayPhoneNumber: DEMO_DISPLAY_PHONE,
    verifiedDisplayName: DEMO_NAME,
    accessTokenEncrypted: encrypted,
    name: DEMO_NAME,
    phoneNumberId: DEMO_PHONE_NUMBER_ID,
  };

  if (!existing) {
    if (!execute) {
      return { status: "planned-create" as const, encrypted, desired };
    }
    await tx.whatsAppChannel.create({ data: desired });
    return { status: "created" as const, encrypted, desired };
  }

  const needsUpdate =
    existing.organizationId !== desired.organizationId ||
    existing.provider !== desired.provider ||
    existing.isPrimary !== desired.isPrimary ||
    existing.isActive !== desired.isActive ||
    existing.status !== desired.status ||
    existing.displayPhoneNumber !== desired.displayPhoneNumber ||
    existing.verifiedDisplayName !== desired.verifiedDisplayName ||
    existing.accessTokenEncrypted !== desired.accessTokenEncrypted;

  if (!needsUpdate) {
    return { status: "existing" as const, encrypted, desired };
  }

  if (!execute) {
    return { status: "planned-update" as const, encrypted, desired };
  }

  await tx.whatsAppChannel.update({
    where: { phoneNumberId: DEMO_PHONE_NUMBER_ID },
    data: desired,
  });
  return { status: "updated" as const, encrypted, desired };
}

async function ensureDemoAiAgent(
  tx: Prisma.TransactionClient,
  organizationId: string,
  execute: boolean,
) {
  const desired = {
    organizationId,
    name: "Asistente de Recepción Raíces Pilot",
    status: "ACTIVE",
    mode: AiAgentMode.RECEPTION,
    tone: AiAgentTone.FRIENDLY,
    persona: "[[MODO_RECEPCION]]",
    language: "Spanish",
    escalateOnKeywords: [],
    humanHandoffMessage: null,
    escalateAfterMessages: 5,
    zoneFilters: [],
    propertyTypes: [],
    minBudget: null,
    maxBudget: null,
    isActive: true,
    whatsappChannelId: null,
  };

  if (!execute && organizationId === DRY_RUN_ORGANIZATION_ID) {
    return { status: "planned-create" as const, desired };
  }

  const existing = await tx.aiAgent.findUnique({
    where: { organizationId },
  });

  if (!existing) {
    if (!execute) {
      return { status: "planned-create" as const, desired };
    }
    await tx.aiAgent.create({ data: desired });
    return { status: "created" as const, desired };
  }

  const needsUpdate =
    existing.name !== desired.name ||
    existing.status !== desired.status ||
    existing.mode !== desired.mode ||
    existing.tone !== desired.tone ||
    existing.persona !== desired.persona ||
    existing.language !== desired.language ||
    JSON.stringify(existing.escalateOnKeywords) !== JSON.stringify(desired.escalateOnKeywords) ||
    existing.humanHandoffMessage !== desired.humanHandoffMessage ||
    existing.escalateAfterMessages !== desired.escalateAfterMessages ||
    JSON.stringify(existing.zoneFilters) !== JSON.stringify(desired.zoneFilters) ||
    JSON.stringify(existing.propertyTypes) !== JSON.stringify(desired.propertyTypes) ||
    existing.minBudget !== desired.minBudget ||
    existing.maxBudget !== desired.maxBudget ||
    existing.isActive !== desired.isActive ||
    existing.whatsappChannelId !== desired.whatsappChannelId;

  if (!needsUpdate) {
    return { status: "existing" as const, desired };
  }

  if (!execute) {
    return { status: "planned-update" as const, desired };
  }

  await tx.aiAgent.update({
    where: { organizationId },
    data: desired,
  });
  return { status: "updated" as const, desired };
}


async function validateDemoResolver(summary: SummaryState, execute: boolean) {
  const resolved = await resolveInboundByPhoneNumberId(prisma, DEMO_PHONE_NUMBER_ID);
  if (resolved?.organizationId && resolved.phoneNumberId === DEMO_PHONE_NUMBER_ID) {
    const org = await prisma.organization.findUnique({
      where: { id: resolved.organizationId },
      select: { slug: true },
    });
    if (org?.slug === DEMO_SLUG) {
    summary.validations.push({
      name: "resolver-demo",
      status: "passed",
      detail: `Canal demo resuelto para ${DEMO_SLUG}`,
    });
      logOk(`VALIDACIÓN 1 — Resolver demo: OK (${DEMO_SLUG})`);
      return;
    }
  }

  if (!execute) {
    const detail = `PENDIENTE_HASTA_EXECUTE: canal demo ${DEMO_PHONE_NUMBER_ID} para ${DEMO_SLUG} se valida contra DB real despuÃ©s de persistir`;
    summary.validations.push({ name: "resolver-demo", status: "warning", detail });
    logWarn(`VALIDACIÃ“N 1 â€” Resolver demo: ${detail}`);
    return;
  }

  const detail = resolved
    ? `retornó org=${resolved.organizationId}, source=${resolved.source}`
    : "no retornó canal";
  summary.validations.push({ name: "resolver-demo", status: "failed", detail });
  logFail(`VALIDACIÓN 1 — Resolver demo: ${detail}`);
}

async function validateProdResolver(summary: SummaryState) {
  const prodPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const prodOrganizationId = process.env.WHATSAPP_ORGANIZATION_ID?.trim();

  if (!prodPhoneNumberId || !prodOrganizationId) {
    const detail = "faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ORGANIZATION_ID";
    summary.validations.push({ name: "resolver-productivo", status: "warning", detail });
    logWarn(`VALIDACIÓN 2 — Resolver productivo intacto: ${detail}`);
    return;
  }

  const resolved = await resolveInboundByPhoneNumberId(prisma, prodPhoneNumberId);
  if (resolved?.organizationId === prodOrganizationId) {
    summary.validations.push({
      name: "resolver-productivo",
      status: "passed",
      detail: `Canal productivo intacto para org ${prodOrganizationId}`,
    });
    logOk(`VALIDACIÓN 2 — Resolver productivo intacto: OK (${prodOrganizationId})`);
    return;
  }

  const detail = resolved
    ? `retornó org=${resolved.organizationId}, source=${resolved.source}, esperado=${prodOrganizationId}`
    : `no retornó canal para ${prodPhoneNumberId}`;
  summary.validations.push({ name: "resolver-productivo", status: "failed", detail });
  logFail(`VALIDACIÓN 2 — Resolver productivo intacto: ${detail}`);
}

async function validateDbVsEnv(summary: SummaryState) {
  const prodPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const prodOrganizationId = process.env.WHATSAPP_ORGANIZATION_ID?.trim();
  const channels = await prisma.whatsAppChannel.findMany({
    select: {
      phoneNumberId: true,
      organizationId: true,
      isActive: true,
      provider: true,
    },
  });

  if (!prodPhoneNumberId || !prodOrganizationId) {
    const detail = "env incompleto para comparar DB vs env";
    summary.validations.push({ name: "db-vs-env", status: "warning", detail });
    logWarn(`VALIDACIÓN 3 — Detectar mismatch DB-vs-env: ${detail}`);
    return;
  }

  const envChannel = channels.find((channel) => channel.phoneNumberId === prodPhoneNumberId);
  if (!envChannel) {
    const detail = `phoneNumberId de env ${prodPhoneNumberId} no existe en DB`;
    summary.validations.push({ name: "db-vs-env", status: "warning", detail });
    logWarn(`VALIDACIÓN 3 — Detectar mismatch DB-vs-env: ${detail}`);
    return;
  }

  if (envChannel.organizationId !== prodOrganizationId) {
    const detail = `canal env apunta a org ${envChannel.organizationId} y env espera ${prodOrganizationId}`;
    summary.validations.push({ name: "db-vs-env", status: "warning", detail });
    logWarn(`VALIDACIÓN 3 — Detectar mismatch DB-vs-env: ${detail}`);
    return;
  }

  const detail = `DB y env consistentes para ${prodPhoneNumberId}`;
  summary.validations.push({ name: "db-vs-env", status: "passed", detail });
  logOk(`VALIDACIÓN 3 — Detectar mismatch DB-vs-env: OK (${detail})`);
}

async function main() {
  const execute = hasFlag("--execute");
  const summary: SummaryState = {
    org: "existing",
    channel: "existing",
    aiAgent: "existing",
    validations: [],
  };

  logInfo(`Modo ${execute ? "EXECUTE" : "DRY-RUN"} — no se imprimirán secretos.`);
  requireEnv("WHATSAPP_TOKEN_ENCRYPTION_KEY");

  const result = await prisma.$transaction(async (tx) => {
    const orgResult = await ensureOrganization(tx, execute);
    const organizationId =
      orgResult.organization?.id ??
      (await tx.organization.findUnique({
        where: { slug: DEMO_SLUG },
        select: { id: true },
      }))?.id;

    if (!organizationId) {
      if (!execute && orgResult.status === "planned-create") {
        const adminResult = await ensureAdminAndMembership(tx, DRY_RUN_ORGANIZATION_ID, execute);
        const subscriptionResult = await ensureSubscription(tx, DRY_RUN_ORGANIZATION_ID, execute);
        const channelResult = await ensureWhatsAppChannel(tx, DRY_RUN_ORGANIZATION_ID, execute);
        const aiAgentResult = await ensureDemoAiAgent(tx, DRY_RUN_ORGANIZATION_ID, execute);

        return {
          orgResult,
          adminResult,
          subscriptionResult,
          channelResult,
          aiAgentResult,
          organizationId: DRY_RUN_ORGANIZATION_ID,
        };
      }

      throw new Error("Could not resolve demo organization id.");
    }

    const adminResult = await ensureAdminAndMembership(tx, organizationId, execute);
    const subscriptionResult = await ensureSubscription(tx, organizationId, execute);
    const channelResult = await ensureWhatsAppChannel(tx, organizationId, execute);
    const aiAgentResult = await ensureDemoAiAgent(tx, organizationId, execute);

    return {
      orgResult,
      adminResult,
      subscriptionResult,
      channelResult,
      aiAgentResult,
      organizationId,
    };
  });

  summary.org = result.orgResult.status;
  summary.channel = result.channelResult.status;
  summary.aiAgent = result.aiAgentResult.status;

  logInfo(`Org demo: ${result.orgResult.status}`);
  logInfo(`Admin demo: user=${result.adminResult.userStatus}, membership=${result.adminResult.membershipStatus}`);
  logInfo(`Subscription demo: ${result.subscriptionResult.status}, plan=${result.subscriptionResult.planId}`);
  logInfo(`Canal demo: ${result.channelResult.status}, accessTokenEncrypted=${maskEncrypted(result.channelResult.encrypted)}`);
  logInfo(
    `Canal demo plan: slug=${DEMO_SLUG}, phone=${DEMO_DISPLAY_PHONE}, phoneNumberId=${DEMO_PHONE_NUMBER_ID}, provider=${DEMO_PROVIDER}, isPrimary=${result.channelResult.desired.isPrimary}, isActive=${result.channelResult.desired.isActive}`,
  );
  logInfo(`Agente IA demo: ${result.aiAgentResult.status}`);

  await validateDemoResolver(summary, execute);
  await validateProdResolver(summary);
  await validateDbVsEnv(summary);

  const passed = summary.validations.filter((item) => item.status === "passed").length;
  const failed = summary.validations.filter((item) => item.status === "failed").length;
  const warnings = summary.validations.filter((item) => item.status === "warning").length;

  console.log("");
  console.log("=== RESUMEN ===");
  console.log(`org: ${summary.org}`);
  console.log(`canal: ${summary.channel}`);
  console.log(`agente IA: ${summary.aiAgent}`);
  console.log(`validaciones: passed=${passed}, failed=${failed}, warnings=${warnings}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    logFail(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });