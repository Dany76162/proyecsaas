"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { sendEmail } from "@/server/notifications/email-service";

/**
 * Initiates a password reset flow.
 * - Finds user by email
 * - Generates a cryptographically random token
 * - Creates a PasswordResetToken record with 1-hour expiry
 * - Logs the reset URL to console (or sends email if provider available)
 *
 * Security: Never reveals whether the email exists or not.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail, isActive: true },
    select: { id: true, fullName: true, email: true },
  });

  if (!user) {
    // Don't reveal if the email exists — just silently return
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  // Always log to console for dev/superadmin use
  console.log("=".repeat(60));
  console.log("[PASSWORD RESET] Reset link generated:");
  console.log(`  User:  ${user.fullName} (${user.email})`);
  console.log(`  URL:   ${resetUrl}`);
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log("=".repeat(60));

  // Send email notification (will log to console if no provider configured)
  await sendEmail({
    to: user.email,
    subject: "Restablecer contraseña — ProyecSaaS",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Restablecer contraseña</h2>
        <p>Hola ${user.fullName},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el siguiente enlace:</p>
        <p style="margin-top: 16px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px;">
            Restablecer contraseña
          </a>
        </p>
        <p style="margin-top: 16px; color: #64748b; font-size: 13px;">
          Este enlace expira en 1 hora. Si no solicitaste este cambio, podés ignorar este mensaje.
        </p>
      </div>
    `.trim(),
  });
}

/**
 * Resets the user's password using a valid token.
 * - Validates token exists, not expired, not used
 * - Hashes new password
 * - Updates user record
 * - Marks token as used
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  if (!token || !newPassword || newPassword.length < 6) {
    return {
      success: false,
      message: "El enlace es inválido o la contraseña es demasiado corta (mínimo 6 caracteres).",
    };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!resetToken) {
    return { success: false, message: "El enlace de restablecimiento no es válido." };
  }

  if (resetToken.usedAt) {
    return { success: false, message: "Este enlace ya fue utilizado." };
  }

  if (resetToken.expiresAt < new Date()) {
    return { success: false, message: "El enlace ha expirado. Solicitá uno nuevo." };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true, message: "Contraseña actualizada correctamente." };
}
