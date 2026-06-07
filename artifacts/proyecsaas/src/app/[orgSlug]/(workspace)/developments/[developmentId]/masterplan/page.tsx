import { redirect } from "next/navigation";

export default async function MasterplanPage({
  params,
}: {
  params: Promise<{ orgSlug: string; developmentId: string }>;
}) {
  const { orgSlug, developmentId } = await params;
  redirect(`/${orgSlug}/developments/${developmentId}?tab=masterplan`);
}
