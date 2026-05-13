import "server-only";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

export type EvolutionInstanceStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";

export type EvolutionQrResponse = {
  qrcode?: {
    base64?: string;
  };
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
    throw new EvolutionApiError("Evolution API configuration missing (URL or KEY)");
  }

  const url = `${EVOLUTION_URL.replace(/\/$/, "")}${path}`;
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
    throw new EvolutionApiError(
      data?.message || `Evolution API error: ${response.status}`,
      response.status
    );
  }

  return data;
}

/**
 * Creates or retrieves an instance for an organization.
 * Instance name is usually `org_${orgSlug}`.
 */
export async function createEvolutionInstance(instanceName: string) {
  try {
    return await request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        token: instanceName, // We use instanceName as the local token too for simplicity
        qrcode: true,
      }),
    });
  } catch (error: any) {
    // If instance already exists, it might throw an error depending on the API version.
    // Usually, we should check if it exists first or handle the error.
    if (error.status === 403 || error.status === 409) {
      return { instanceName };
    }
    throw error;
  }
}

/**
 * Gets the QR code for an instance.
 */
export async function getEvolutionQrCode(instanceName: string): Promise<EvolutionQrResponse> {
  return await request(`/instance/connect/${instanceName}`);
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
