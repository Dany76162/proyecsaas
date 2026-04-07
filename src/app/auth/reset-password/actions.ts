"use server";

import { redirect } from "next/navigation";
import { resetPassword } from "@/server/auth/password-reset";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirect("/auth/reset-password?error=" + encodeURIComponent("Enlace inválido."));
  }

  if (password !== confirmPassword) {
    redirect(
      `/auth/reset-password?token=${token}&error=${encodeURIComponent("Las contraseñas no coinciden.")}`,
    );
  }

  if (password.length < 6) {
    redirect(
      `/auth/reset-password?token=${token}&error=${encodeURIComponent("La contraseña debe tener al menos 6 caracteres.")}`,
    );
  }

  const result = await resetPassword(token, password);

  if (!result.success) {
    redirect(
      `/auth/reset-password?token=${token}&error=${encodeURIComponent(result.message)}`,
    );
  }

  redirect("/auth/reset-password?success=1");
}
