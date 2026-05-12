import "server-only";
import { prisma } from "@/server/db/prisma";
import { encryptToken, decryptToken } from "@/server/security/token-encryption";
import { AgentScope, MetaIntegrationStatus, MetaPlatformType, PublicationStatus } from "@prisma/client";
import { createAgentLog } from "./service";
import { AgentLogLevel } from "@prisma/client";

const META_GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_GRAPH_VERSION = "v22.0";

export type MetaAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphVersion: string;
  flags: {
    readonly: boolean;
    publishing: boolean;
    scheduled: boolean;
  };
};

export function getMetaAuthConfig(): MetaAuthConfig | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  const graphVersion = process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;

  const flags = {
    readonly: process.env.AGENTOS_ENABLE_META_READONLY === "true",
    publishing: process.env.AGENTOS_ENABLE_META_PUBLISHING === "true",
    scheduled: process.env.AGENTOS_ENABLE_SCHEDULED_PUBLISHING === "true",
  };

  if (!appId || !appSecret || !redirectUri) {
    return { appId: "", appSecret: "", redirectUri: "", graphVersion, flags: { ...flags, readonly: false, publishing: false, scheduled: false } };
  }

  return { appId, appSecret, redirectUri, graphVersion, flags };
}

export function buildMetaOAuthUrl(): string {
  const config = getMetaAuthConfig();
  if (!config) throw new Error("Meta configuration incomplete (Missing Env Vars)");

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "business_management",
    "public_profile"
  ].join(",");

  const url = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", "agentos-meta-connect"); // Basic CSRF protection/context

  return url.toString();
}

export async function handleMetaOAuthCallback(code: string) {
  const config = getMetaAuthConfig();
  if (!config) throw new Error("Meta configuration incomplete");

  // 1. Exchange code for access token
  const tokenUrl = new URL(`${META_GRAPH_BASE_URL}/${config.graphVersion}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", config.appId);
  tokenUrl.searchParams.set("client_secret", config.appSecret);
  tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
  tokenUrl.searchParams.set("code", code);

  const response = await fetch(tokenUrl.toString());
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Meta OAuth failed: ${data.error?.message || "Unknown error"}`);
  }

  const { access_token, expires_in } = data;
  const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

  // 2. Get available scopes (permissions)
  const debugTokenUrl = new URL(`${META_GRAPH_BASE_URL}/${config.graphVersion}/debug_token`);
  debugTokenUrl.searchParams.set("input_token", access_token);
  debugTokenUrl.searchParams.set("access_token", `${config.appId}|${config.appSecret}`);

  const debugResponse = await fetch(debugTokenUrl.toString());
  const debugData = await debugResponse.json();
  const grantedScopes = debugData.data?.scopes || [];

  // 3. Save or update integration
  const encryptedToken = encryptToken(access_token);

  const integration = await prisma.metaIntegration.upsert({
    where: { id: "platform-meta-default" }, // We only support one platform-wide integration for now
    update: {
      accessToken: encryptedToken,
      expiresAt,
      scopes: grantedScopes,
      status: MetaIntegrationStatus.CONNECTED,
      errorMessage: null,
      lastSyncAt: new Date(),
    },
    create: {
      id: "platform-meta-default",
      scope: AgentScope.PLATFORM,
      accessToken: encryptedToken,
      expiresAt,
      scopes: grantedScopes,
      status: MetaIntegrationStatus.CONNECTED,
    },
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: "Conexión con Meta exitosa (Modo Lectura).",
    metadata: { scopes: grantedScopes }
  });

  // 4. Initial sync of pages
  await syncMetaPages(integration.id);

  return integration;
}

export async function syncMetaPages(integrationId: string) {
  const integration = await prisma.metaIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || integration.status !== MetaIntegrationStatus.CONNECTED) {
    throw new Error("Meta integration not connected");
  }

  const config = getMetaAuthConfig();
  if (!config) throw new Error("Meta configuration incomplete");

  const accessToken = decryptToken(integration.accessToken);

  // 1. Fetch FB Pages
  const pagesUrl = new URL(`${META_GRAPH_BASE_URL}/${config.graphVersion}/me/accounts`);
  pagesUrl.searchParams.set("access_token", accessToken);
  pagesUrl.searchParams.set("fields", "id,name,access_token,tasks,category");

  const response = await fetch(pagesUrl.toString());
  const data = await response.json();

  if (!response.ok) {
    const msg = data.error?.message || "Failed to fetch Meta pages";
    await prisma.metaIntegration.update({
      where: { id: integrationId },
      data: { status: MetaIntegrationStatus.ERROR, errorMessage: msg }
    });
    throw new Error(msg);
  }

  const pages = data.data || [];

  for (const pageData of pages) {
    // Encrypt page token if available
    const pageToken = pageData.access_token ? encryptToken(pageData.access_token) : null;

    await prisma.metaPage.upsert({
      where: { id: `meta-page-${pageData.id}` },
      update: {
        name: pageData.name,
        accessToken: pageToken,
        lastSyncAt: new Date(),
        metadata: { category: pageData.category, tasks: pageData.tasks }
      },
      create: {
        id: `meta-page-${pageData.id}`,
        integrationId,
        pageId: pageData.id,
        name: pageData.name,
        platform: MetaPlatformType.FACEBOOK,
        accessToken: pageToken,
        metadata: { category: pageData.category, tasks: pageData.tasks }
      }
    });

    // Attempt to find linked Instagram accounts for this page
    try {
      const igUrl = new URL(`${META_GRAPH_BASE_URL}/${config.graphVersion}/${pageData.id}`);
      igUrl.searchParams.set("fields", "instagram_business_account");
      igUrl.searchParams.set("access_token", accessToken);

      const igRes = await fetch(igUrl.toString());
      const igData = await igRes.json();

      if (igData.instagram_business_account) {
        const igId = igData.instagram_business_account.id;
        
        // Fetch IG details
        const igDetailUrl = new URL(`${META_GRAPH_BASE_URL}/${config.graphVersion}/${igId}`);
        igDetailUrl.searchParams.set("fields", "id,username,name");
        igDetailUrl.searchParams.set("access_token", accessToken);

        const igDetailRes = await fetch(igDetailUrl.toString());
        const igDetail = await igDetailRes.json();

        await prisma.metaPage.upsert({
          where: { id: `meta-ig-${igId}` },
          update: {
            name: igDetail.name || igDetail.username,
            lastSyncAt: new Date(),
            metadata: { username: igDetail.username, linkedFromPage: pageData.id }
          },
          create: {
            id: `meta-ig-${igId}`,
            integrationId,
            pageId: igId,
            name: igDetail.name || igDetail.username,
            platform: MetaPlatformType.INSTAGRAM,
            metadata: { username: igDetail.username, linkedFromPage: pageData.id }
          }
        });
      }
    } catch (err) {
      console.error(`Failed to sync IG for page ${pageData.id}`, err);
    }
  }

  await prisma.metaIntegration.update({
    where: { id: integrationId },
    data: { lastSyncAt: new Date(), status: MetaIntegrationStatus.CONNECTED }
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: `Sincronización de Meta completada. ${pages.length} páginas de Facebook procesadas.`,
  });
}

export async function getMetaConnectionStatus() {
  const config = getMetaAuthConfig();
  const integration = await prisma.metaIntegration.findUnique({
    where: { id: "platform-meta-default" },
    include: { pages: true }
  });

  if (!integration) {
    return {
      isConnected: false,
      configComplete: !!config?.appId,
      status: MetaIntegrationStatus.DISCONNECTED,
      pages: [],
      flags: config?.flags
    };
  }

  // Check if token expired
  if (integration.expiresAt && integration.expiresAt < new Date()) {
    return {
      ...integration,
      isConnected: false,
      isExpired: true,
      status: MetaIntegrationStatus.EXPIRED,
      pages: integration.pages,
      flags: config?.flags
    };
  }

  return {
    ...integration,
    isConnected: integration.status === MetaIntegrationStatus.CONNECTED,
    configComplete: !!config?.appId,
    pages: integration.pages,
    flags: config?.flags
  };
}

export async function disconnectMetaIntegration() {
  await prisma.metaIntegration.delete({
    where: { id: "platform-meta-default" }
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: "Integración de Meta desconectada y credenciales eliminadas."
  });
}

export async function createManualPublication(draftId: string, pageId: string, userId: string) {
  const draft = await prisma.contentDraft.findUnique({
    where: { id: draftId }
  });

  if (!draft || draft.status !== "APPROVED") {
    throw new Error("El borrador debe estar aprobado para ser publicado.");
  }

  const page = await prisma.metaPage.findUnique({
    where: { id: pageId }
  });

  if (!page) throw new Error("Página o cuenta destino no encontrada.");

  return prisma.contentPublication.create({
    data: {
      draftId,
      pageId: page.id,
      platform: page.platform,
      publishedById: userId,
      status: PublicationStatus.READY
    }
  });
}

export async function publishContentToMeta(publicationId: string) {
  const publication = await prisma.contentPublication.findUnique({
    where: { id: publicationId },
    include: { draft: true }
  });

  if (!publication) throw new Error("Publicación no encontrada.");

  const integration = await prisma.metaIntegration.findUnique({
    where: { id: "platform-meta-default" }
  });

  if (!integration || integration.status !== MetaIntegrationStatus.CONNECTED) {
    throw new Error("La integración con Meta no está conectada.");
  }

  const page = await prisma.metaPage.findUnique({
    where: { id: publication.pageId }
  });

  if (!page) throw new Error("La página o cuenta de destino ya no está disponible.");

  const config = getMetaAuthConfig();
  if (!config || !config.flags.publishing) {
    throw new Error("La publicación en Meta está desactivada por configuración del sistema (Feature Flag).");
  }

  // Use page token if available, fallback to integration token
  const token = page.accessToken ? decryptToken(page.accessToken) : decryptToken(integration.accessToken);

  try {
    await prisma.contentPublication.update({
      where: { id: publicationId },
      data: { status: PublicationStatus.PUBLISHING }
    });

    let externalPostId: string | null = null;

    if (publication.platform === MetaPlatformType.FACEBOOK) {
      // FB Page Post
      const url = new URL(`${META_GRAPH_BASE_URL}/${config.graphVersion}/${page.pageId}/feed`);
      url.searchParams.set("message", publication.draft.content);
      url.searchParams.set("access_token", token);

      const res = await fetch(url.toString(), { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || "Error en la API de Facebook");
      externalPostId = data.id;
    } else if (publication.platform === MetaPlatformType.INSTAGRAM) {
      // IG Business Post (Carousel/Image/Video)
      // En este MVP publicamos solo el texto/caption si hay imagen, pero como AgentOS todavía 
      // no genera imágenes finales en 3.0B, lanzamos un error descriptivo.
      throw new Error("La publicación en Instagram requiere soporte de medios (Imagen/Video), que se habilitará en fases posteriores.");
    }

    await prisma.contentPublication.update({
      where: { id: publicationId },
      data: { 
        status: PublicationStatus.PUBLISHED, 
        externalPostId, 
        publishedAt: new Date() 
      }
    });

    await createAgentLog({
      level: AgentLogLevel.INFO,
      message: `Publicación exitosa en ${publication.platform}: ${externalPostId}`,
      metadata: { publicationId, externalPostId }
    });

    return { success: true, externalPostId };
  } catch (error: any) {
    const msg = error.message || "Error desconocido durante la publicación";
    await prisma.contentPublication.update({
      where: { id: publicationId },
      data: { status: PublicationStatus.FAILED, errorMessage: msg }
    });

    await createAgentLog({
      level: AgentLogLevel.ERROR,
      message: `Error al publicar en Meta: ${msg}`,
      metadata: { publicationId, error: msg }
    });

    throw error;
  }
}

export async function publishScheduledDrafts() {
  const config = getMetaAuthConfig();
  if (!config || !config.flags.scheduled) {
    return { success: false, message: "Scheduled publishing disabled by feature flag." };
  }

  // Find approved drafts scheduled for now or past that haven't been published yet
  const scheduledDrafts = await prisma.contentDraft.findMany({
    where: {
      status: "APPROVED",
      calendarStatus: "SCHEDULED",
      scheduledFor: { lte: new Date() },
      // Important: Only if there are no SUCCESSFUL publications already
      publications: {
        none: { status: PublicationStatus.PUBLISHED }
      }
    },
    include: {
      task: true
    }
  });

  if (scheduledDrafts.length === 0) {
    return { success: true, processed: 0 };
  }

  const results = [];

  for (const draft of scheduledDrafts) {
    try {
      // For automated publishing, we need a default page or a page selected during scheduling
      // In this MVP, if no page is explicitly selected in metadata, we might need a default or skip.
      // Let's assume for now we look for the first connected page that matches the platform.
      const page = await prisma.metaPage.findFirst({
        where: { platform: draft.platform === "FACEBOOK" ? "FACEBOOK" : "INSTAGRAM" }
      });

      if (!page) {
        throw new Error(`No se encontró una página conectada para la plataforma ${draft.platform}`);
      }

      const publication = await prisma.contentPublication.create({
        data: {
          draftId: draft.id,
          pageId: page.id,
          platform: page.platform,
          status: PublicationStatus.READY,
          publishedById: "system-scheduler"
        }
      });

      await publishContentToMeta(publication.id);
      results.push({ draftId: draft.id, success: true });
    } catch (err: any) {
      results.push({ draftId: draft.id, success: false, error: err.message });
      await createAgentLog({
        level: AgentLogLevel.ERROR,
        message: `Fallo en publicación programada (Borrador ${draft.id}): ${err.message}`,
        metadata: { draftId: draft.id, error: err.message }
      });
    }
  }

  return { success: true, processed: scheduledDrafts.length, results };
}
