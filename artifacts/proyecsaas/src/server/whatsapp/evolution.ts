import "server-only";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

export type EvolutionInstanceStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";

export type EvolutionQrResponse = {
  qrcode?: {
    base64?: string;
    code?: string;
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
          webhook_by_events: true,
          webhook_events: [
            "MESSAGES_UPSERT",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED"
          ]
        })
      }),
    });
  } catch (error: any) {
    // If instance already exists, Evolution API v2 might return 400 with a specific message
    // or 403/409. We catch it to allow the flow to continue to getEvolutionQrCode.
    const isAlreadyExists = 
      error.status === 403 || 
      error.status === 409 || 
      (error.status === 400 && error.message?.toLowerCase().includes("already exists"));

    if (isAlreadyExists) {
      console.log(`[EvolutionAPI] Instance ${instanceName} already exists, skipping creation.`);
      return { instanceName };
    }
    
    console.error(`[EvolutionAPI] Failed to create instance ${instanceName}:`, error.message);
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
 * Sends a text message via Evolution API.
 */
export async function sendEvolutionMessage(instanceName: string, to: string, text: string) {
  // Normalize phone number (ensure no + and correct format for Evolution)
  const cleanTo = to.replace(/\D/g, "");
  
  return await request(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: cleanTo,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: true,
      },
      textContent: {
        text,
      },
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
