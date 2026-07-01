import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { LibraryClient } from "./LibraryClient";
import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biblioteca Comercial | Superadmin",
};

export default async function BibliotecaComercialPage() {
  await requirePlatformAdmin();

  // Load all data
  const messages = await prisma.salesLibraryMessage.findMany({
    where: { organizationId: null },
    orderBy: { createdAt: "desc" },
  });

  const materials = await prisma.salesLibraryMaterial.findMany({
    where: { organizationId: null },
    orderBy: { sortOrder: "asc" },
  });

  const argumentsData = await prisma.salesLibraryArgument.findMany({
    where: { organizationId: null },
    orderBy: { createdAt: "desc" },
  });

  const faqs = await prisma.salesLibraryFAQ.findMany({
    where: { organizationId: null },
    orderBy: { createdAt: "desc" },
  });

  const objections = await prisma.salesLibraryObjection.findMany({
    where: { organizationId: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Biblioteca Comercial Oficial
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestioná los mensajes, materiales, argumentos de venta, preguntas frecuentes y objeciones oficiales de Raíces Pilot.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              Módulo exclusivo Superadmin
            </h3>
            <p className="text-sm leading-6 text-amber-800">
              Por el momento, esta biblioteca solo es accesible para el equipo de ventas interno. Estos recursos son globales (`organizationId: null`).
            </p>
          </div>
        </div>
      </div>

      <LibraryClient 
        initialMessages={messages}
        initialMaterials={materials}
        initialArguments={argumentsData}
        initialFaqs={faqs}
        initialObjections={objections}
      />
    </div>
  );
}
