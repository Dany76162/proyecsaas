"use server";

import type { ActionResult } from "@/modules/types";
import { createLeadSchema } from "@/modules/leads/schemas";

export async function createLeadAction(input: unknown): Promise<ActionResult> {
  const parsed = createLeadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Lead input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    success: false,
    message: "Lead creation is staged at the server boundary and will be persisted next.",
  };
}
