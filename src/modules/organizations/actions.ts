"use server";

import type { ActionResult } from "@/modules/types";
import { updateOrganizationSchema } from "@/modules/organizations/schemas";

export async function updateOrganizationProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Organization profile input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    success: false,
    message: "Organization persistence will be wired in the next iteration.",
  };
}
