import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-8 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-20" />
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" strokeWidth={2} />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        Sincronizando datos
      </p>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />;
}
