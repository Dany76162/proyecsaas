import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import CalendarClient from "./CalendarClient";
import { SectionHeader } from "@/components/ui/layout-ui";

export const dynamic = "force-dynamic";

export default async function AgentCalendarPage() {
  await requirePlatformAdmin();

  // Fetch approved drafts that are scheduled, used manually, or ready to plan.
  const drafts = await prisma.contentDraft.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { calendarStatus: { in: ["SCHEDULED", "USED_MANUALLY"] } },
        { status: "APPROVED", calendarStatus: "UNSCHEDULED" }
      ]
    },
    orderBy: { scheduledFor: "asc" }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <SectionHeader 
        title="Calendario de Contenido" 
        description="Organiza y planifica el contenido aprobado para uso manual en redes sociales."
      />

      <CalendarClient initialDrafts={drafts} />
    </div>
  );
}
