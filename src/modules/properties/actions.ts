"use server";

import type { ActionResult } from "@/modules/types";
import { createPropertySchema } from "@/modules/properties/schemas";

export async function createPropertyAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = createPropertySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Property input is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return {
    success: false,
    message: "Property creation is prepared and will be connected to persistence next.",
  };
}
