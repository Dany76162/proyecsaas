import { validateRuntimeConfig } from "../src/server/config/runtime";

type RuntimeRole = "web" | "worker";

function isRuntimeRole(value: string | undefined): value is RuntimeRole {
  return value === "web" || value === "worker";
}

const role = process.argv[2];

if (!isRuntimeRole(role)) {
  console.error('[runtime-config] Usage: tsx scripts/validate-runtime.ts <web|worker>');
  process.exit(1);
}

try {
  const result = validateRuntimeConfig(role);

  console.log(
    JSON.stringify({
      scope: "runtime-config",
      event: "validated",
      role: result.role,
      checkedInProduction: result.checkedInProduction,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      scope: "runtime-config",
      event: "validation-failed",
      role,
      message: error instanceof Error ? error.message : "unknown-runtime-config-error",
    }),
  );
  process.exit(1);
}
