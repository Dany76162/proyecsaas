import { cn } from "@/lib/utils";
import { UserCheck, ZapOff, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type HandoffBannerProps = {
  isHumanControlled: boolean;
  requiresFollowUp: boolean;
  followUpReason?: string | null;
  onTakeControl?: () => void;
  onReleaseControl?: () => void;
  onResolveFollowUp?: () => void;
  isPending?: boolean;
};

export function HandoffBanner({
  isHumanControlled,
  requiresFollowUp,
  followUpReason,
  onTakeControl,
  onReleaseControl,
  onResolveFollowUp,
  isPending,
}: HandoffBannerProps) {
  if (!isHumanControlled && !requiresFollowUp) return null;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border px-5 py-4 shadow-sm transition-all",
      isHumanControlled 
        ? "border-blue-100 bg-blue-50/50 text-blue-900" 
        : "border-amber-100 bg-amber-50/50 text-amber-900"
    )}>
      <div className={cn(
        "absolute left-0 top-0 h-full w-1",
        isHumanControlled ? "bg-blue-500" : "bg-amber-500"
      )} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isHumanControlled ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
          )}>
            {isHumanControlled ? <UserCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="text-base font-bold tracking-tight">
              {isHumanControlled ? "Control Humano Activo" : "Intervención Sugerida"}
            </h4>
            <p className="mt-1 text-sm font-medium opacity-90 leading-relaxed max-w-md">
              {isHumanControlled 
                ? "Las respuestas automáticas están en pausa. El agente tiene el control total de la conversación."
                : followUpReason || "Se ha detectado una situación que requiere validación manual por parte del equipo."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {isHumanControlled ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onReleaseControl}
              disabled={isPending}
              className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ZapOff className="h-3.5 w-3.5 mr-2" />
              Liberar bot
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={onTakeControl}
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700 border-amber-700"
            >
              Tomar control
            </Button>
          )}
          
          {requiresFollowUp && !isHumanControlled && (
            <Button
              size="sm"
              variant="outline"
              onClick={onResolveFollowUp}
              disabled={isPending}
              className="border-amber-200 text-amber-700 hover:bg-amber-100/50"
            >
              Ignorar alerta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
