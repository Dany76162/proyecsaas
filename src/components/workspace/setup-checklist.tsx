import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SetupChecklistStatus } from "@/modules/organizations/types";

type SetupChecklistProps = SetupChecklistStatus & {
  orgSlug: string;
};

export function SetupChecklist({
  orgSlug,
  profileComplete,
  whatsappConnected,
  teamInvited,
}: SetupChecklistProps) {
  if (profileComplete && whatsappConnected && teamInvited) return null;

  const steps = [
    {
      done: profileComplete,
      label: "Complete your workspace profile",
      description:
        "Add your organization name and city so your workspace is properly identified.",
      href: `/${orgSlug}/settings/organization`,
      cta: "Edit profile",
    },
    {
      done: whatsappConnected,
      label: "Connect your WhatsApp number",
      description:
        "Link your WhatsApp Business number to start receiving and responding to leads automatically.",
      href: `/${orgSlug}/settings/integrations/whatsapp`,
      cta: "Connect",
    },
    {
      done: teamInvited,
      label: "Invite your team",
      description:
        "Add agents and assistants so your whole team can operate from this workspace.",
      href: `/${orgSlug}/settings/users`,
      cta: "Invite members",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-[1.5rem] border border-brand-100 bg-white p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Getting started
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Complete your workspace setup
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-500">
          {doneCount} / {steps.length}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className={cn(
              "flex items-center gap-4 rounded-2xl border p-4 transition-colors",
              step.done
                ? "border-slate-100 bg-slate-50 opacity-60"
                : "border-slate-200 bg-white",
            )}
          >
            {/* Check indicator */}
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                step.done
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 bg-white",
              )}
            >
              {step.done && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.done
                    ? "text-slate-400 line-through decoration-slate-300"
                    : "text-slate-950",
                )}
              >
                {step.label}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              )}
            </div>

            {/* CTA */}
            {!step.done && (
              <Link
                href={step.href}
                className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
