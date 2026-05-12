import Link from "next/link";

import { StatusBadge } from "@/components/workspace/status-badge";
import { cn } from "@/lib/utils";

type LeadMiniCardProps = {
  href: string;
  fullName: string;
  interestLabel: string;
  leadTemperature: "hot" | "warm" | "cold" | "unclear";
  ownerName: string;
  propertyTitle: string;
  stageLabel: string;
};

const TEMPERATURE_CONFIG = {
  hot:     { tone: "warning" as const, label: "Caliente", dot: "bg-red-400" },
  warm:    { tone: "info"    as const, label: "Tibio",    dot: "bg-amber-400" },
  cold:    { tone: "neutral" as const, label: "FrÃ­o",     dot: "bg-slate-400" },
  unclear: { tone: "neutral" as const, label: "â€”",        dot: "bg-slate-300" },
};

export function LeadMiniCard({
  href,
  fullName,
  interestLabel,
  leadTemperature,
  ownerName,
  propertyTitle,
  stageLabel,
}: LeadMiniCardProps) {
  const tempConfig = TEMPERATURE_CONFIG[leadTemperature] ?? TEMPERATURE_CONFIG.unclear;

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-sm",
        "transition-all duration-150 hover:-translate-y-px hover:border-slate-300 hover:shadow-md",
      )}
    >
      {/* Name row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-slate-950 leading-tight">{fullName}</p>
        {/* Temperature dot */}
        <span
          className={cn(
            "mt-0.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-white",
            tempConfig.dot,
          )}
          title={tempConfig.label}
        />
      </div>

      {/* Interest */}
      {interestLabel && (
        <p className="mt-1.5 line-clamp-1 text-sm text-slate-600 font-medium">{interestLabel}</p>
      )}

      {/* Property */}
      {propertyTitle && (
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{propertyTitle}</p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{ownerName}</p>
        <StatusBadge label={tempConfig.label} tone={tempConfig.tone} />
      </div>
    </Link>
  );
}
