import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepLink {
  id: string;
  num: number;
  label: string;
}

interface ProjectStepsDockProps {
  prevStep: StepLink | null;
  nextStep: StepLink | null;
  onNavigate?: (tabId: string) => void;
  className?: string;
}

export default function ProjectStepsDock({
  prevStep,
  nextStep,
  onNavigate,
  className,
}: ProjectStepsDockProps) {
  return (
    <div className={cn("shrink-0", className)}>
      <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0">
            {prevStep ? (
              <Link
                href={`?tab=${prevStep.id}`}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(prevStep.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-brand-500 dark:text-slate-400"
                title={`Ir al Paso ${prevStep.num}: ${prevStep.label}`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="truncate">Paso {prevStep.num}: {prevStep.label}</span>
              </Link>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px]">
            <span className="text-slate-400">
              RaícesPilot
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-end">
            {nextStep ? (
              <Link
                href={`?tab=${nextStep.id}`}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(nextStep.id);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-600"
                title={`Ir al Paso ${nextStep.num}: ${nextStep.label}`}
              >
                <span className="truncate">Paso {nextStep.num}: {nextStep.label}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pasos iniciales completados
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
