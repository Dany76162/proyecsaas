type RuntimeRole = "web" | "worker";

type RuntimeValidationResult = {
  role: RuntimeRole;
  checkedInProduction: boolean;
  missing: string[];
};

function getBaseRequiredEnvVars() {
  return ["DATABASE_URL", "DIRECT_URL", "REDIS_URL"] as const;
}

function getRoleRequiredEnvVars(role: RuntimeRole) {
  if (role === "web") {
    return [
      "NEXT_PUBLIC_APP_URL",
      "AUTH_SESSION_SECRET",
      "AUTH_SHARED_PASSWORD",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
      "WHATSAPP_TOKEN_ENCRYPTION_KEY",
      "MERCADO_PAGO_WEBHOOK_SECRET",
    ] as const;
  }

  return [] as const;
}

function getLegacyTenantEnvVars() {
  return [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ORGANIZATION_ID",
    "WHATSAPP_ACCESS_TOKEN",
  ] as const;
}

let hasWarnedForPartialLegacyTenantConfig = false;

function warnForPartialLegacyTenantConfig() {
  const legacyValues = getLegacyTenantEnvVars().map((key) => ({
    key,
    value: process.env[key]?.trim() ?? "",
  }));
  const provided = legacyValues.filter((item) => item.value);

  if (
    provided.length > 0 &&
    provided.length < legacyValues.length &&
    !hasWarnedForPartialLegacyTenantConfig
  ) {
    hasWarnedForPartialLegacyTenantConfig = true;
    console.warn(
      `[runtime-config] Partial legacy WhatsApp tenant configuration detected. ${getLegacyTenantEnvVars().join(", ")} should either all be present for legacy fallback or all be absent when DB-backed channel resolution is primary.`,
    );
  }
}

export function validateRuntimeConfig(role: RuntimeRole): RuntimeValidationResult {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      role,
      checkedInProduction: false,
      missing: [],
    };
  }

  warnForPartialLegacyTenantConfig();

  const required = [...getBaseRequiredEnvVars(), ...getRoleRequiredEnvVars(role)];
  const missing = required.filter((key) => {
    const value = process.env[key];
    return !value || !value.trim();
  });

  if (missing.length) {
    throw new Error(
      `[runtime-config] Missing required ${role} environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    role,
    checkedInProduction: true,
    missing: [],
  };
}

export function validateWebRuntimeConfig() {
  return validateRuntimeConfig("web");
}

export function validateWorkerRuntimeConfig() {
  return validateRuntimeConfig("worker");
}
