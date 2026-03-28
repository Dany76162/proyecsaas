import type { ReactNode } from "react";

import { SettingsNav } from "@/components/workspace/settings-nav";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <>
      <SettingsNav orgSlug={orgSlug} />
      {children}
    </>
  );
}
