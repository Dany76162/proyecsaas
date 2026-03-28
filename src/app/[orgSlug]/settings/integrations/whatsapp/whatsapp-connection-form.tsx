"use client";

import { useActionState } from "react";

import type { WhatsAppConnectionActionState } from "./actions";
import { saveWhatsAppChannelAction } from "./actions";

type WhatsAppConnectionFormProps = {
  orgSlug: string;
  defaultPhoneNumberId: string;
  webhookUrl: string;
  verifyToken: string;
  channelStatus: {
    isConnected: boolean;
    phoneNumberId: string | null;
    displayPhoneNumber: string | null;
    verifiedDisplayName: string | null;
    statusLabel: string;
  };
};

const initialState: WhatsAppConnectionActionState | null = null;

export function WhatsAppConnectionForm({
  orgSlug,
  defaultPhoneNumberId,
  webhookUrl,
  verifyToken,
  channelStatus,
}: WhatsAppConnectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveWhatsAppChannelAction,
    initialState,
  );

  const effectiveChannelStatus =
    state?.success && state.connectedChannel
      ? {
          isConnected: true,
          phoneNumberId: state.connectedChannel.phoneNumberId,
          displayPhoneNumber: state.connectedChannel.displayPhoneNumber,
          verifiedDisplayName: state.connectedChannel.verifiedDisplayName,
          statusLabel: "Connected",
        }
      : channelStatus;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Connection status</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Validate the Phone Number ID against Meta before turning the channel on for this
              organization.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              effectiveChannelStatus.isConnected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {effectiveChannelStatus.statusLabel}
          </span>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Detected number
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">
              {effectiveChannelStatus.displayPhoneNumber ?? "Not connected yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Verified name
            </dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">
              {effectiveChannelStatus.verifiedDisplayName ??
                "Meta has not returned a verified name yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Phone Number ID
            </dt>
            <dd className="mt-2 break-all text-sm font-medium text-slate-900">
              {effectiveChannelStatus.phoneNumberId ?? "Not connected yet"}
            </dd>
          </div>
        </dl>
      </div>

      <form action={formAction} className="space-y-5 rounded-2xl border border-slate-200 p-5">
        <input type="hidden" name="orgSlug" value={orgSlug} />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="phoneNumberId" className="block text-sm font-medium text-slate-700">
              Phone Number ID
            </label>
            <input
              id="phoneNumberId"
              name="phoneNumberId"
              type="text"
              defaultValue={defaultPhoneNumberId}
              required
              className="mt-1.5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-950 placeholder:text-slate-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              placeholder="1092518257269119"
            />
          </div>

          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium text-slate-700">
              Access Token
            </label>
            <input
              id="accessToken"
              name="accessToken"
              type="password"
              defaultValue=""
              required
              className="mt-1.5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-950 placeholder:text-slate-400 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              placeholder="EAA..."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
          This only validates the number against Meta and saves the channel in PROYECSAAS. Embedded
          Signup, token refresh, and multi-number management stay out of scope for this block.
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-[1.1rem] bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Validating with Meta..." : "Validate and connect WhatsApp"}
        </button>

        {state?.message ? (
          <p
            className={`text-sm font-medium ${
              state.success ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>

      <div className="rounded-2xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-950">Webhook instructions</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Keep these values read-only here and paste them into the Meta App webhook configuration.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Webhook URL</label>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="mt-1.5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Verify Token</label>
            <input
              type="text"
              readOnly
              value={verifyToken}
              className="mt-1.5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
