// Estados de alta/onboarding unificados para el Superadmin (Clientes + Onboarding).
// Todo DERIVADO de datos existentes — no agrega campos persistidos ni toca el schema.
//
// Separa tres conceptos que antes se mezclaban:
//   - Estado de cuenta  → org.isActive (Activa / Suspendida)  [se resuelve en la UI]
//   - Estado de alta    → este helper (pendiente/expirada/activada/operativa)
//   - Salud operativa   → computeHealth (errores/canal) — NO debe "vender" como
//                         saludable una cuenta que ni siquiera completó el alta.

export type OnboardingTone = "success" | "info" | "warning" | "neutral";

export type OnboardingStatusKey =
  | "no-users"     // Sin usuarios
  | "pending"      // Invitación pendiente (sin usar y no expirada / titular sin clave)
  | "expired"      // Invitación expirada sin uso
  | "activated"    // Acceso activado (titular creó clave / invitación usada)
  | "operational"; // Operativa (activada + cuenta activa + suscripción activa)

export interface OnboardingBadge {
  key: OnboardingStatusKey;
  label: string;
  tone: OnboardingTone;
}

export interface OrgOnboardingInput {
  memberCount: number;
  ownerHasPassword: boolean;
  latestInvite: { usedAt: Date | string | null; expiresAt: Date | string } | null;
  isActive: boolean;
  subscriptionActive: boolean;
}

function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

/** Estado de alta a nivel ORGANIZACIÓN (para la tabla de Clientes). */
export function getOrgOnboardingStatus(input: OrgOnboardingInput): OnboardingBadge {
  const inviteUsed = Boolean(input.latestInvite?.usedAt);
  const activated = input.ownerHasPassword || inviteUsed;

  if (activated) {
    if (input.isActive && input.subscriptionActive) {
      return { key: "operational", label: "Operativa", tone: "success" };
    }
    return { key: "activated", label: "Acceso activado", tone: "info" };
  }

  // Aún no activada:
  if (input.memberCount === 0 && !input.latestInvite) {
    return { key: "no-users", label: "Sin usuarios", tone: "neutral" };
  }
  if (input.latestInvite && isExpired(input.latestInvite.expiresAt)) {
    return { key: "expired", label: "Invitación expirada", tone: "neutral" };
  }
  return { key: "pending", label: "Invitación pendiente", tone: "warning" };
}

/** Estado de una invitación puntual (para el historial de Altas / Onboarding). */
export function getInviteStatus(
  usedAt: Date | string | null,
  expiresAt: Date | string,
): OnboardingBadge {
  if (usedAt) return { key: "activated", label: "Activada", tone: "success" };
  if (isExpired(expiresAt)) return { key: "expired", label: "Expirada", tone: "neutral" };
  return { key: "pending", label: "Pendiente", tone: "warning" };
}

/** ¿El alta ya está completa? Si NO, la UI no debe mostrar "Saludable" sin contexto. */
export function isOnboardingActivated(key: OnboardingStatusKey): boolean {
  return key === "activated" || key === "operational";
}

/** Clases de texto para cada tono (consistentes en Clientes y Onboarding). */
export const ONBOARDING_TONE_TEXT_CLASS: Record<OnboardingTone, string> = {
  success: "text-emerald-700",
  info: "text-sky-700",
  warning: "text-amber-600",
  neutral: "text-slate-400",
};

/** Clases de chip (fondo + texto) para cada tono. */
export const ONBOARDING_TONE_CHIP_CLASS: Record<OnboardingTone, string> = {
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-sky-50 text-sky-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-slate-100 text-slate-400",
};
