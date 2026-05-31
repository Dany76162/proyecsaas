import { redirect } from "next/navigation";

export default async function LegacyCatalogRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ op?: string; tour?: string }>;
}) {
  const { orgSlug } = await params;
  const { op, tour } = await searchParams;

  const q = new URLSearchParams();
  if (op) q.set("op", op);
  if (tour) q.set("tour", tour);
  
  const queryString = q.toString();
  redirect(`/cat/${orgSlug}${queryString ? `?${queryString}` : ""}`);
}
