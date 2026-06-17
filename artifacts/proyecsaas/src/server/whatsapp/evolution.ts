import "server-only";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

export type EvolutionInstanceStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";

export type EvolutionQrResponse = {
  qrcode?: {
    base64?: string;
    code?: string;
  };
  instance?: {
    qrcode?: {
      base64?: string;
      code?: string;
    } | string;
  };
  base64?: string;
  code?: string;
  status?: string;
};

export class EvolutionApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = "EvolutionApiError";
  }
}

async function request(path: string, options: RequestInit = {}) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    console.error("[EvolutionAPI] Missing configuration: URL or KEY is not set in environment variables.");
    throw new EvolutionApiError("Configuración de Evolution API faltante (URL o KEY)");
  }

  const url = `${EVOLUTION_URL.replace(/\/$/, "")}${path}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "apikey": EVOLUTION_KEY,
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`[EvolutionAPI] Error at ${path}:`, {
        status: response.status,
        data,
      });
      throw new EvolutionApiError(
        data?.message || `Error del servidor de WhatsApp (${response.status})`,
        response.status
      );
    }

    return data;
  } catch (error: any) {
    if (error instanceof EvolutionApiError) throw error;
    
    console.error(`[EvolutionAPI] Connection failed at ${path}:`, error.message);
    throw new EvolutionApiError("No se pudo conectar con el servidor de WhatsApp. Verificá la URL.");
  }
}

/**
 * Creates or retrieves an instance for an organization.
 * Instance name is usually `org_${orgSlug}`.
 */
export async function createEvolutionInstance(instanceName: string) {
  try {
    console.log(`[EvolutionAPI] Creating instance: ${instanceName}`);
    
    // Construct webhook URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.WEBHOOK_GLOBAL_URL;
    const webhookUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/evolution` : null;

    return await request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        token: instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        ...(webhookUrl && {
          webhook_url: webhookUrl,
          webhook_by_events: false,
          webhook_events: [
            "MESSAGES_UPSERT",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED"
          ]
        })
      }),
    });
  } catch (error: any) {
    // Evolution v2 is very inconsistent with error messages for existing instances.
    // We will be permissive: if it's 400, 403, 409 or the message suggests it exists, we continue.
    const isAlreadyExists = 
      error.status === 403 || 
      error.status === 409 || 
      error.status === 400 ||
      error.message?.toLowerCase().includes("exists") ||
      error.message?.toLowerCase().includes("already");

    if (isAlreadyExists) {
      console.log(`[EvolutionAPI] Instance ${instanceName} might already exist (Status: ${error.status}), continuing to fetch QR.`);
      return { instanceName };
    }
    
    console.error(`[EvolutionAPI] Critical failure creating instance ${instanceName}:`, error.message);
    throw error;
  }
}

/**
 * Gets the QR code for an instance.
 */
export async function getEvolutionQrCode(instanceName: string): Promise<EvolutionQrResponse> {
  try {
    return await request(`/instance/connect/${instanceName}`);
  } catch (error: any) {
    console.error(`[EvolutionAPI] Failed to get QR for ${instanceName}:`, error.message);
    // If it's 404, maybe the instance was deleted? Let's throw so the action can handle it.
    throw error;
  }
}

/**
 * Logs out and deletes an instance.
 */
export async function logoutEvolutionInstance(instanceName: string) {
  try {
    await request(`/instance/logout/${instanceName}`, { method: "DELETE" });
    await request(`/instance/delete/${instanceName}`, { method: "DELETE" });
  } catch (error) {
    console.warn(`Failed to logout/delete instance ${instanceName}:`, error);
  }
}

/**
 * Intenta obtener el número propio (owner) de la instancia desde Evolution.
 * connectionState no lo trae; el número vive en /instance/fetchInstances.
 * Best-effort: devuelve solo dígitos o null. Incluye el raw para diagnóstico.
 */
export async function fetchEvolutionNumber(instanceName: string): Promise<{
  phone: string | null;
  raw?: unknown;
  error?: string;
}> {
  try {
    const data = await request(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
    const inst = Array.isArray(data) ? data[0] : data?.instance ?? data;
    const candidate =
      inst?.ownerJid ??
      inst?.owner ??
      inst?.number ??
      inst?.wuid ??
      inst?.instance?.owner ??
      inst?.instance?.wuid ??
      null;
    let phone: string | null = null;
    if (candidate && typeof candidate === "string") {
      const beforeAt = candidate.split("@")[0];
      const digits = beforeAt.split(":")[0].replace(/\D/g, "");
      phone = digits.length >= 8 ? digits : null;
    }
    return { phone, raw: data };
  } catch (error: any) {
    return { phone: null, error: error?.message ?? String(error) };
  }
}

/**
 * Lee la configuración de webhook que Evolution tiene para una instancia.
 * Read-only: sirve para diagnosticar si los mensajes entrantes se reenvían.
 */
export async function getEvolutionWebhook(instanceName: string) {
  try {
    const data = await request(`/webhook/find/${instanceName}`);
    return {
      ok: true as const,
      url: data?.url ?? data?.webhook?.url ?? null,
      enabled: data?.enabled ?? data?.webhook?.enabled ?? null,
      webhookByEvents: data?.webhookByEvents ?? data?.webhook?.webhookByEvents ?? null,
      events: data?.events ?? data?.webhook?.events ?? null,
    };
  } catch (error: any) {
    return { ok: false as const, error: error?.message ?? String(error) };
  }
}

/**
 * (Re)configura el webhook de una instancia existente para que Evolution
 * reenvíe los mensajes entrantes a la app. Formato Evolution v2.
 */
export async function setEvolutionWebhook(instanceName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.WEBHOOK_GLOBAL_URL;
  if (!appUrl) {
    throw new EvolutionApiError("NEXT_PUBLIC_APP_URL no está configurada; no se puede armar la URL del webhook.");
  }
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/evolution`;

  return await request(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        // false → Evolution postea TODOS los eventos a la URL base (con el
        // nombre del evento en el body). Nuestra ruta única los maneja así.
        // Con true postearía a sub-rutas por evento (/messages-upsert) → 404.
        webhookByEvents: false,
        // Reenviar el apikey para que el handler valide el origen.
        ...(EVOLUTION_KEY ? { headers: { apikey: EVOLUTION_KEY, "Content-Type": "application/json" } } : {}),
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
      },
    }),
  });
}

/**
 * Sends a text message via Evolution API.
 */
export async function sendEvolutionMessage(instanceName: string, to: string, text: string) {
  // Normalize phone number (ensure no + and correct format for Evolution)
  const cleanTo = to.replace(/\D/g, "");

  // Evolution v2: payload plano. El texto va en `text` (no en textContent) y
  // delay/linkPreview al nivel raíz (no en `options`). El formato v1 anidado
  // hacía que Evolution v2 respondiera 400.
  return await request(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: cleanTo,
      text,
      delay: 1200,
      linkPreview: false,
    }),
  });
}

/**
 * Checks the connection status of an instance.
 */
export async function getEvolutionInstanceStatus(instanceName: string): Promise<EvolutionInstanceStatus> {
  try {
    const data = await request(`/instance/connectionState/${instanceName}`);
    if (data?.instance?.state === "open") return "CONNECTED";
    if (data?.instance?.state === "connecting") return "CONNECTING";
    return "DISCONNECTED";
  } catch (error) {
    return "ERROR";
  }
}

/**
 * Gets detailed connection state including the connected phone number.
 */
export async function getEvolutionInstanceDetails(instanceName: string) {
  try {
    const data = await request(`/instance/connectionState/${instanceName}`);
    const state = data?.instance?.state;
    const status: EvolutionInstanceStatus = 
      state === "open" ? "CONNECTED" : 
      state === "connecting" ? "CONNECTING" : "DISCONNECTED";
    
    let phone: string | null = null;
    const rawJid = data?.instance?.currentSession?.jid || data?.instance?.currentSession?.user?.id || data?.instance?.ownerJid;
    if (rawJid && typeof rawJid === "string") {
      const beforeAt = rawJid.split("@")[0];
      phone = beforeAt.split(":")[0];
    }
    
    return { status, phone };
  } catch (error) {
    return { status: "ERROR" as const, phone: null };
  }
}

