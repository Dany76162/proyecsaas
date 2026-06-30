export const dynamic = "force-dynamic";

import { TerritoryExplorerForm } from "./explore-form";

export default function TerritoryExplorerPage() {
  const placesConfigured = !!process.env.GOOGLE_PLACES_API_KEY;
  const serperConfigured = !!process.env.SERPER_API_KEY;
  return <TerritoryExplorerForm placesConfigured={placesConfigured} serperConfigured={serperConfigured} />;
}
