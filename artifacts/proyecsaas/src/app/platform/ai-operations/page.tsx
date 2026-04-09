import { Metadata } from "next";
import { getTenantsAiHealth } from "./actions";
import { AiOperationsTable } from "./AiOperationsTable";
import { Bot } from "lucide-react";
import { requirePlatformAdmin } from "@/server/auth/access";

export const metadata: Metadata = {
  title: "Operaciones IA | Superadmin",
};

export default async function AiOperationsPage() {
  await requirePlatformAdmin();
  const data = await getTenantsAiHealth();

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
              <Bot className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Radar de Operaciones IA
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Monitoreo comercial y de salud operativa de agentes IA por cliente.
          </p>
        </div>
      </div>

      <AiOperationsTable data={data} />
    </div>
  );
}
