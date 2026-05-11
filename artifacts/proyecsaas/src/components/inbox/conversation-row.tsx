import { cn, formatDateTime } from "@/lib/utils";
import { ConversationListItem } from "@/modules/conversations/types";
import { StatusBadge } from "@/components/workspace/status-badge";

type ConversationRowProps = {
  conv: ConversationListItem;
  isSelected: boolean;
  onClick: () => void;
};

export function ConversationRow({ conv, isSelected, onClick }: ConversationRowProps) {
  const lastMessage = conv.messages[conv.messages.length - 1];
  const hasError = conv.messages.some((m) => m.deliveryStatus === "FAILED");
  const requiresAction = conv.requiresFollowUp;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full border-b border-slate-100 px-4 py-4 text-left transition-all hover:bg-slate-50/80",
        isSelected ? "bg-white shadow-sm ring-1 ring-slate-200/50 z-10" : "bg-transparent",
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-500" />
      )}
      
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-2 w-2 rounded-full shrink-0",
              conv.leadTemperature === "hot" ? "bg-red-500" : "bg-slate-300"
            )} />
            <p className={cn(
              "truncate text-[15px] font-bold tracking-tight",
              isSelected ? "text-slate-900" : "text-slate-700"
            )}>
              {conv.participantName}
            </p>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500 leading-tight">
            {conv.latestMessagePreview || "Sin mensajes"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-400 tabular-nums uppercase">
            {formatDateTime(conv.lastMessageAt)}
          </span>
          {hasError && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-600">
              !
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <StatusBadge 
          label={conv.status} 
          tone={conv.status === "QUALIFIED" ? "success" : "neutral"} 
          dot
        />
        {conv.isHumanControlled && (
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100">
            Agente
          </span>
        )}
        {requiresAction && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 ring-1 ring-amber-100">
            Acción
          </span>
        )}
      </div>
    </button>
  );
}
