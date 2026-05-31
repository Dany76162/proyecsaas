import { redirect } from "next/navigation";

export default async function LegacyCatalogDetailRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;
  redirect(`/cat/${orgSlug}/${propertyId}`);
}
