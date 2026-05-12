import { listAgentApprovals } from "@/modules/agents/service";
import { ApprovalsList } from "@/components/agents/approvals-list";
import { ApprovalStatus } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function PlatformAgentsApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const currentStatus = (resolvedParams.status as ApprovalStatus) || ApprovalStatus.PENDING;
  
  const approvals = await listAgentApprovals(
    resolvedParams.status === "ALL" ? undefined : currentStatus
  );

  const tabs = [
    { label: "Pendientes", value: ApprovalStatus.PENDING },
    { label: "Aprobadas", value: ApprovalStatus.APPROVED },
    { label: "Rechazadas", value: ApprovalStatus.REJECTED },
    { label: "Todas", value: "ALL" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 uppercase">Aprobaciones PRO</h1>
        <p className="text-sm font-medium text-slate-500">
          Control center para la revisión humana de contenido generado por AgentOS.
        </p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 w-fit">
        {tabs.map((tab) => {
          const isActive = resolvedParams.status === tab.value || (!resolvedParams.status && tab.value === ApprovalStatus.PENDING);
          return (
            <Link
              key={tab.value}
              href={`/platform/agents/approvals?status=${tab.value}`}
              className={cn(
                "rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95",
                isActive 
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <ApprovalsList initialApprovals={approvals} />
    </div>
  );
}
