export const dynamic = "force-dynamic";
import { requirePlatformAdmin } from "@/server/auth/access";
import { PlatformShell } from "@/components/platform/platform-shell";

export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await requirePlatformAdmin();

  return (
    <PlatformShell
      sessionUser={{ fullName: sessionUser.fullName, email: sessionUser.email }}
    >
      {children}
    </PlatformShell>
  );
}
