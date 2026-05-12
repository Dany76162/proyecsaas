"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth/access";
import * as metaService from "./meta-service";

export async function getMetaAuthUrlAction() {
  await requirePlatformAdmin();
  try {
    return { url: metaService.buildMetaOAuthUrl() };
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function handleMetaCallbackAction(code: string) {
  await requirePlatformAdmin();
  try {
    await metaService.handleMetaOAuthCallback(code);
    revalidatePath("/platform/agents/integrations/meta");
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function syncMetaPagesAction() {
  await requirePlatformAdmin();
  try {
    await metaService.syncMetaPages("platform-meta-default");
    revalidatePath("/platform/agents/integrations/meta");
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function disconnectMetaAction() {
  await requirePlatformAdmin();
  try {
    await metaService.disconnectMetaIntegration();
    revalidatePath("/platform/agents/integrations/meta");
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function preparePublicationAction(draftId: string, pageId: string) {
  const sessionUser = await requirePlatformAdmin();

  try {
    const publication = await metaService.createManualPublication(draftId, pageId, sessionUser.id);
    revalidatePath("/platform/agents/content");
    revalidatePath("/platform/agents/calendar");
    return { success: true, publicationId: publication.id };
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function publishNowAction(publicationId: string) {
  await requirePlatformAdmin();

  try {
    const result = await metaService.publishContentToMeta(publicationId);
    revalidatePath("/platform/agents/content");
    revalidatePath("/platform/agents/calendar");
    return { success: true, externalPostId: result.externalPostId };
  } catch (err: any) {
    throw new Error(err.message);
  }
}
