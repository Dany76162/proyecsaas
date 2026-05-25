export const dynamic = "force-dynamic";

import { ProspectingSearchForm } from "./search-form";

export default function ProspectingSearchPage() {
  const serperConfigured = !!process.env.SERPER_API_KEY;
  return <ProspectingSearchForm serperConfigured={serperConfigured} />;
}
