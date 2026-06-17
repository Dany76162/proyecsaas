"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, LandPlot, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { setBusinessTypeAction } from "@/app/[orgSlug]/(workspace)/onboarding/actions";

const OPTIONS = [
  {
    value: "INMOBILIARIA",
    icon: Building2,
    title: "Inmobiliaria",
    desc: "Vendo y alquilo propiedades (casas, deptos, locales).",
  },
  {
    value: "DESARROLLADORA",
    icon: LandPlot,
    title: "Desarrolladora / Loteo",
    desc: "Comercializo lotes y emprendimientos con plano.",
  },
  {
    value: "AMBAS",
    icon: Layers,
    title: "Ambas",
    desc: "Opero propiedades y desarrollos a la vez.",
  },
] as const;

export function BusinessTypePrompt({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);

  function choose(value: string) {
    setSelected(value);
    startTransition(async () => {
      const res = await setBusinessTypeAction(orgSlug, value);
      if (res.ok) {
        router.refresh();
      } else {
        setSelected(null);
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 shadow-soft">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">
        Antes de empezar
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">¿Qué tipo de negocio operás?</h2>
      <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
        Lo usamos para adaptar tu puesta en marcha. Lo podés cambiar después en los ajustes de tu organización.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => choose(opt.value)}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-2xl border bg-white p-5 text-left transition-all disabled:cursor-not-allowed",
                isActive
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : "border-slate-200 hover:border-brand-300 hover:shadow-md",
                isPending && !isActive && "opacity-50",
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <opt.icon className="h-5 w-5" />
              </span>
              <span className="font-bold text-slate-900">{opt.title}</span>
              <span className="text-xs font-medium leading-relaxed text-slate-500">{opt.desc}</span>
              {isActive && isPending && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">
                  Guardando…
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
