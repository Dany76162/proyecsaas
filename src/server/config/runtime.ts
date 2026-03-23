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
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_ORGANIZATION_ID",
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    ] as const;
  }

  return [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ORGANIZATION_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "OPENAI_API_KEY",
  ] as const;
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
