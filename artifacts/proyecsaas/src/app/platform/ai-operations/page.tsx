import { Metadata } from "next";
import { Bot } from "lucide-react";

import { requirePlatformAdmin } from "@/server/auth/access";

import { getTenantsAiHealth } from "./actions";
import { AiOperationsTable } from "./AiOperationsTable";

export const metadata: Metadata = {
  title: "Operaciones IA | Superadmin",
};

export default async function AiOperationsPage() {
  await requirePlatformAdmin();
  const data = await getTenantsAiHealth();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Bot className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Radar de Operaciones IA
            </h1>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Seguimiento operativo y comercial del uso de agentes IA por cliente para detectar
            configuraciones incompletas, cuentas trabadas y oportunidades de crecimiento.
          </p>
        </div>
      </div>

      <AiOperationsTable data={data} />
    </div>
  );
}
