"use server";

import type { ActionResult } from "@/modules/types";
import { inviteUserSchema } from "@/modules/users/schemas";

export async function inviteUserAction(input: unknown): Promise<ActionResult> {
  const parsed = inviteUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "User invite input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    success: false,
    message: "User invitations are prepared at the action layer and will be persisted next.",
  };
}
