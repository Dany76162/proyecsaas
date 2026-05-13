"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LayoutDashboard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OnboardingStepKey = "base" | "leads" | "conversations" | "properties" | "agents";

interface OnboardingFooterProps {
  orgSlug: string;
  stepKey: OnboardingStepKey;
  stepNumber: number;
  totalSteps?: number;
  nextRoute: string;
  nextLabel: string;
  title: string;
  description: string;
}

export function OnboardingFooter({
  orgSlug,
  stepKey,
  stepNumber,
  totalSteps = 5,
  nextRoute,
  nextLabel,
  title,
  description,
}: OnboardingFooterProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this step is already marked as completed in localStorage
    const completedSteps = JSON.parse(localStorage.getItem(`onboarding_${orgSlug}`) || "[]");
    setIsCompleted(completedSteps.includes(stepKey));
    
    // Check if onboarding is globally dismissed or completed (optional)
    const isDismissed = localStorage.getItem(`onboarding_dismissed_${orgSlug}`) === "true";
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, [orgSlug, stepKey]);

  const handleContinue = () => {
    // Save to localStorage
    const completedSteps = JSON.parse(localStorage.getItem(`onboarding_${orgSlug}`) || "[]");
    if (!completedSteps.includes(stepKey)) {
      completedSteps.push(stepKey);
      localStorage.setItem(`onboarding_${orgSlug}`, JSON.stringify(completedSteps));
    }
    
    // Redirect to next step
    router.push(nextRoute);
  };

  const handleBackToWelcome = () => {
    router.push(`/${orgSlug}/onboarding`);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-4xl -translate-x-1/2 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-300">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col items-center gap-4 px-6 py-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
              <span className="text-lg font-black">{stepNumber}</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Puesta en marcha</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Paso {stepNumber} de {totalSteps}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
              <p className="hidden text-xs font-medium text-slate-500 sm:block leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToWelcome}
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
            >
              <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
              Ver progreso
            </Button>
            <Button
              size="sm"
              onClick={handleContinue}
              className="h-10 flex-1 rounded-xl bg-slate-900 px-6 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 sm:flex-none"
            >
              {nextLabel}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar at the very bottom */}
        <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full overflow-hidden">
          <div 
            className="h-full bg-brand-500 transition-all duration-1000" 
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
