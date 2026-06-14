import { redirect } from "next/navigation";

// Legacy `/map` index replaced by the public portal. The interactive 360° tour
// viewer at `/map/[propertyId]` is unaffected.
export default function MapIndexRedirect() {
  redirect("/propiedades");
}
