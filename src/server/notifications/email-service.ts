/**
 * Email notification service.
 *
 * If RESEND_API_KEY is set, uses Resend SDK. Otherwise logs to console.
 * To plug in a real provider:
 *   1. npm install resend
 *   2. Set RESEND_API_KEY in your environment
 *   3. Optionally set EMAIL_FROM (defaults to "noreply@proyecsaas.com")
 *
 * TODO: Install and import `resend` package when ready for production email delivery.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    // TODO: Uncomment when `resend` package is installed:
    // const { Resend } = await import("resend");
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: process.env.EMAIL_FROM ?? "noreply@proyecsaas.com",
    //   to: payload.to,
    //   subject: payload.subject,
    //   html: payload.html,
    // });
    console.log(
      `[EMAIL SERVICE] RESEND_API_KEY is set but resend package is not installed. Email NOT sent.`,
      { to: payload.to, subject: payload.subject },
    );
    return;
  }

  // Development fallback: log to console
  console.log("=".repeat(60));
  console.log("[EMAIL SERVICE - no provider configured]");
  console.log(`  To:      ${payload.to}`);
  console.log(`  Subject: ${payload.subject}`);
  console.log(`  Body:`);
  console.log(payload.html);
  console.log("=".repeat(60));
}

/**
 * Sends an email to all admin/owner users of an organization when the AI
 * flags a conversation as requiring human intervention.
 */
export async function notifyHumanInterventionRequired(params: {
  orgName: string;
  leadName: string;
  conversationId: string;
  adminEmails: string[];
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject = `[${params.orgName}] Intervención humana requerida — ${params.leadName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e293b;">Intervención humana requerida</h2>
      <p>El agente IA de <strong>${params.orgName}</strong> ha detectado que la conversación con <strong>${params.leadName}</strong> necesita atención de un operador.</p>
      <p style="margin-top: 16px;">
        <a href="${appUrl}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px;">
          Ver conversaciones
        </a>
      </p>
      <p style="margin-top: 24px; color: #64748b; font-size: 12px;">
        Este mensaje fue generado automáticamente por ProyecSaaS.
      </p>
    </div>
  `.trim();

  for (const email of params.adminEmails) {
    await sendEmail({ to: email, subject, html });
  }
}
