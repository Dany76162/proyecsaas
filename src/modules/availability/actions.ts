"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrganizationMembership, assertMinimumRole } from "@/server/auth/access";
import { 
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  toggleAvailabilitySlot 
} from "@/modules/availability/service";

const createSlotSchema = z.object({
  label: z.string().min(1, "La etiqueta es obligatoria"),
  weekday: z.coerce.number().int().min(0).max(6),
  startMinute: z.coerce.number().int().min(0).max(1439),
  endMinute: z.coerce.number().int().min(1).max(1440),
});

export async function actionCreateAvailabilitySlot(
  orgSlug: string,
  formData: FormData
) {
  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, "ADMIN");

    const parsed = createSlotSchema.parse({
      label: formData.get("label"),
      weekday: formData.get("weekday"),
      startMinute: formData.get("startMinute"),
      endMinute: formData.get("endMinute"),
    });

    if (parsed.startMinute >= parsed.endMinute) {
      return { success: false, error: "La hora de inicio debe ser anterior a la hora de fin." };
    }

    await createAvailabilitySlot(orgSlug, parsed);

    revalidatePath(`/${orgSlug}/settings/availability`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error inesperado al crear el turno." 
    };
  }
}

export async function actionDeleteAvailabilitySlot(
  orgSlug: string,
  slotId: string
) {
  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, "ADMIN");

    await deleteAvailabilitySlot(orgSlug, slotId);
    
    revalidatePath(`/${orgSlug}/settings/availability`);
    return { success: true };
  } catch (error) {
     return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al borrar el horario." 
    };
  }
}

export async function actionToggleAvailabilitySlot(
  orgSlug: string,
  slotId: string,
  isActive: boolean
) {
  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, "ADMIN");

    await toggleAvailabilitySlot(orgSlug, slotId, isActive);
    
    revalidatePath(`/${orgSlug}/settings/availability`);
    return { success: true };
  } catch (error) {
     return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error al actualizar." 
    };
  }
}
