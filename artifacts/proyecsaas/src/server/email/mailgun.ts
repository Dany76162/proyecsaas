/**
 * Mailgun Adapter for Prospecting Campaigns
 * 
 * IMPORTANT: This is currently behind feature flags.
 * AGENTOS_ENABLE_PROSPECTING_EMAIL_SEND must be true to actually send emails.
 */

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
  tags?: string[];
  metadata?: Record<string, string>;
};

export async function sendEmailViaMailgun(payload: EmailPayload) {
  const isEnabled = process.env.AGENTOS_ENABLE_PROSPECTING_EMAIL_SEND === "true";
  const isTestMode = process.env.AGENTOS_ENABLE_PROSPECTING_EMAIL_TEST_MODE !== "false";
  
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = payload.fromEmail || process.env.MAILGUN_FROM_EMAIL || `prospecting@${domain}`;
  const fromName = payload.fromName || process.env.MAILGUN_FROM_NAME || "RaicesPilot Prospecting";

  console.log(`[EmailService] Preparing email to ${payload.to} | Enabled: ${isEnabled} | TestMode: ${isTestMode}`);

  if (!isEnabled) {
    console.log("[EmailService] Sending is DISABLED by flag. Skipping real API call.");
    return { success: true, messageId: "mock-disabled-" + Date.now(), status: "SKIPPED_BY_FLAG" };
  }

  if (isTestMode) {
    const adminEmail = process.env.ADMIN_TEST_EMAIL || "test@raicespilot.com";
    console.log(`[EmailService] TEST MODE ACTIVE. Redirecting ${payload.to} -> ${adminEmail}`);
    payload.to = adminEmail;
  }

  if (!apiKey || !domain) {
    console.error("[EmailService] Missing MAILGUN_API_KEY or MAILGUN_DOMAIN");
    throw new Error("Configuración de email incompleta");
  }

  // Implementation using fetch to Mailgun API
  try {
    const auth = Buffer.from(`api:${apiKey}`).toString("base64");
    const formData = new URLSearchParams();
    formData.append("from", `${fromName} <${fromEmail}>`);
    formData.append("to", payload.to);
    formData.append("subject", payload.subject);
    formData.append("html", payload.body); // We send HTML body
    
    if (payload.tags) {
      payload.tags.forEach(tag => formData.append("o:tag", tag));
    }
    
    if (payload.metadata) {
      Object.entries(payload.metadata).forEach(([key, value]) => {
        formData.append(`v:${key}`, value);
      });
    }

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EmailService] Mailgun Error:", errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    return { success: true, messageId: result.id, status: "SENT" };

  } catch (err: any) {
    console.error("[EmailService] Exception:", err);
    return { success: false, error: err.message };
  }
}
