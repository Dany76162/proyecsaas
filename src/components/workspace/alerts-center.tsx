"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Circle, ArrowRight } from "lucide-react";

import type { WorkspaceNotification } from "@/modules/organizations/types";
import { actionMarkNotificationAsRead, actionMarkAllNotificationsAsRead } from "@/modules/organizations/actions";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatDateTime, cn } from "@/lib/utils";

type AlertsCenterProps = {
  orgSlug: string;
  notifications: WorkspaceNotification[];
};

export function AlertsCenter({ orgSlug, notifications }: AlertsCenterProps) {
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAsRead(id: string) {
    if (isPending) return;
    startTransition(async () => {
      await actionMarkNotificationAsRead(orgSlug, id);
    });
  }

  async function handleMarkAllAsRead() {
    if (isPending) return;
    startTransition(async () => {
      await actionMarkAllNotificationsAsRead(orgSlug);
    });
  }

  return (
    <div className="space-y-3 relative">
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Marcar todas como leídas
          </button>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-emerald-700">Sin alertas activas</p>
          <p className="mt-1 text-xs text-emerald-600">Todo opera con normalidad.</p>
        </div>
      )}

      <div className={cn("transition-opacity", isPending && "opacity-70 pointer-events-none")}>
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isRead = notification.isRead;

            return (
              <div
                key={notification.id}
                className={cn(
                  "group relative block rounded-xl border p-4 transition-all duration-300",
                  isRead 
                    ? "border-slate-100 bg-slate-50/50 opacity-75"
                    : "border-indigo-100 bg-white shadow-sm ring-1 ring-indigo-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge
                        label={notification.type === "OPERATOR_ACTION_REQUIRED" ? "Acción requerida" : "Evento"}
                        tone={isRead ? "neutral" : (notification.type === "OPERATOR_ACTION_REQUIRED" ? "warning" : "info")}
                      />
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                    
                    {notification.link ? (
                      <Link href={`/${orgSlug}${notification.link}`} className="inline-flex items-center gap-1.5 group/link">
                        <p className={cn(
                          "text-sm font-bold transition",
                          isRead ? "text-slate-700" : "text-slate-900 group-hover/link:text-indigo-600"
                        )}>
                          {notification.title}
                        </p>
                        <ArrowRight className={cn(
                          "h-3.5 w-3.5 transition",
                          isRead ? "hidden" : "text-indigo-500 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0"
                        )}/>
                      </Link>
                    ) : (
                      <p className={cn("text-sm font-bold", isRead ? "text-slate-700" : "text-slate-900")}>
                        {notification.title}
                      </p>
                    )}
                    
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      {notification.body}
                    </p>
                  </div>

                  {!isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={isPending}
                      title="Marcar como leída"
                      className="shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-emerald-50 hover:text-emerald-600 focus:outline-none"
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
