import Link from "next/link";

import { StatusBadge } from "@/components/workspace/status-badge";

type LeadMiniCardProps = {
  href: string;
  fullName: string;
  interestLabel: string;
  ownerName: string;
  propertyTitle: string;
  stageLabel: string;
};

export function LeadMiniCard({
  href,
  fullName,
  interestLabel,
  ownerName,
  propertyTitle,
  stageLabel,
}: LeadMiniCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-[1.25rem] border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-950">{fullName}</p>
        <StatusBadge label={stageLabel} tone="info" />
      </div>
      <p className="mt-2 text-sm text-slate-600">{interestLabel}</p>
      <p className="mt-3 text-sm text-slate-500">{propertyTitle}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{ownerName}</p>
    </Link>
  );
}
