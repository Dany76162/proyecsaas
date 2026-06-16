"use client";

import { useState, useTransition } from "react";

import { setOrgAiCostLimitAction } from "./limit-actions";

export function OrgLimitInput({
  organizationId,
  initialLimit,
  defaultLimit,
}: {
  organizationId: string;
  initialLimit: number | null;
  defaultLimit: number;
}) {
  const [value, setValue] = useState(initialLimit != null ? String(initialLimit) : "");
  const [pending, startTransition] = useTransition();

  const save = () => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && !Number.isFinite(parsed)) return;
    startTransition(async () => {
      await setOrgAiCostLimitAction(organizationId, parsed);
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-xs text-slate-400">$</span>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={`${defaultLimit} (def.)`}
        disabled={pending}
        className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-xs tabular-nums focus:border-brand-400 focus:outline-none disabled:opacity-50"
        title="Límite mensual de costo de IA (USD). Vacío = usa el default."
      />
    </div>
  );
}
