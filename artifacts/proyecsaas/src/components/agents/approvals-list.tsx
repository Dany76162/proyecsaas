"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ArrowUpRight, MessageSquare, Eye, ListChecks, Bot, Zap, UserCheck } from "lucide-react";
import { approveOrRejectDraft } from "@/modules/agents/actions";
import { RejectionDialog } from "./rejection-dialog";
import { PostPreview } from "./post-preview";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: { 
    label: "Pendiente", 
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock
  },
  APPROVED: { 
    label: "Aprobada", 
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2
  },
  REJECTED: { 
    label: "Rechazada", 
    className: "border-red-200 bg-red-50 text-red-700",
    icon: XCircle
  },
};

export function ApprovalsList({ initialApprovals }: { initialApprovals: any[] }) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);
  const [showTimelineId, setShowTimelineId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="px-8 py-5">Tarea & Detalle</th>
                <th className="px-6 py-5">Agente</th>
                <th className="px-6 py-5">Solicitado</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-6 py-5">Decisión</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {initialApprovals.map((approval) => {
                const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.PENDING;
                const Icon = config.icon;
                const draft = approval.task.drafts?.[0];
                const isTimelineOpen = showTimelineId === approval.id;
                
                return (
                  <React.Fragment key={approval.id}>
                    <tr className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 leading-tight group-hover:text-brand-600 transition-colors">
                              {approval.task.title}
                            </p>
                            <button 
                              onClick={() => setShowTimelineId(isTimelineOpen ? null : approval.id)}
                              className={cn(
                                "rounded-full p-1 transition-colors",
                                isTimelineOpen ? "bg-slate-100 text-slate-600" : "text-slate-300 hover:text-slate-500"
                              )}
                            >
                              <ListChecks className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-xs font-medium">
                            {approval.task.description ?? "Sin descripción adicional"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-6 font-medium text-slate-600">
                        {approval.requestedByAgent?.name ?? "Agente IA"}
                      </td>
                      <td className="px-6 py-6 text-slate-400 font-medium">
                        {new Date(approval.requestedAt).toLocaleDateString()}
                        <span className="block text-[10px] opacity-70">
                          {new Date(approval.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                          config.className
                        )}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        {approval.status !== 'PENDING' ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[11px] font-bold text-slate-700">
                              {approval.decidedByUser?.fullName ?? "Sistema"}
                            </p>
                            {approval.decidedAt && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                {new Date(approval.decidedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            )}
                            {approval.comments && (
                              <div className="mt-1 flex items-start gap-1 text-[10px] text-slate-500 italic bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                <MessageSquare className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{approval.comments}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Esperando...</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {draft && (
                            <button
                              onClick={() => setPreviewDraft(draft)}
                              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition-all active:scale-95"
                              title="Ver Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {approval.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => setRejectId(approval.id)}
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-600 transition hover:bg-red-100 active:scale-95"
                              >
                                Rechazar
                              </button>
                              <form action={approveOrRejectDraft}>
                                <input type="hidden" name="approvalId" value={approval.id} />
                                <input type="hidden" name="decision" value="APPROVED" />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-600/10"
                                >
                                  Aprobar
                                </button>
                              </form>
                            </>
                          ) : (
                            <div className="flex items-center justify-end gap-3 text-slate-300">
                               <span className="text-[10px] font-bold uppercase tracking-widest">Cerrado</span>
                               <ArrowUpRight className="h-4 w-4 opacity-30" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isTimelineOpen && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/50 px-10 py-8 border-y border-slate-100">
                           <div className="max-w-2xl">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Trazabilidad Operativa</h4>
                              <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                 <TimelineStep 
                                   icon={Zap} 
                                   label="Tarea creada" 
                                   status="completed" 
                                   time={new Date(approval.task.createdAt).toLocaleTimeString()}
                                 />
                                 <TimelineStep 
                                   icon={Bot} 
                                   label={`Agente ${approval.requestedByAgent?.name ?? 'IA'} ejecutando`} 
                                   status="completed"
                                 />
                                 <TimelineStep 
                                   icon={Zap} 
                                   label="Borrador generado" 
                                   status="completed" 
                                 />
                                 <TimelineStep 
                                   icon={UserCheck} 
                                   label="Aprobación solicitada" 
                                   status="completed" 
                                   time={new Date(approval.requestedAt).toLocaleTimeString()}
                                 />
                                 <TimelineStep 
                                   icon={CheckCircle2} 
                                   label={approval.status === 'PENDING' ? 'Decisión pendiente' : approval.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'} 
                                   status={approval.status === 'PENDING' ? 'pending' : 'completed'} 
                                   time={approval.decidedAt ? new Date(approval.decidedAt).toLocaleTimeString() : undefined}
                                   color={approval.status === 'REJECTED' ? 'text-red-500' : approval.status === 'APPROVED' ? 'text-emerald-500' : undefined}
                                 />
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {initialApprovals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-slate-50 p-4">
                        <CheckCircle2 className="h-8 w-8 text-slate-200" />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Sin aprobaciones en esta categoría
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectId && (
        <RejectionDialog 
          approvalId={rejectId} 
          onClose={() => setRejectId(null)} 
        />
      )}

      {previewDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setPreviewDraft(null)}
                className="absolute right-6 top-6 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
              
              <div className="mb-8 space-y-2">
                 <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Previsualización Realista</h3>
                 <p className="text-sm font-medium text-slate-500">Así es como se verá el contenido una vez publicado manualmente.</p>
              </div>

              <PostPreview 
                platform={previewDraft.platform}
                content={previewDraft.content}
                hashtags={previewDraft.hashtags}
              />

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                 <button 
                   onClick={() => setPreviewDraft(null)}
                   className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
                 >
                   Cerrar Vista Previa
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}

function TimelineStep({ icon: Icon, label, status, time, color }: { icon: any; label: string; status: 'completed' | 'pending'; time?: string; color?: string }) {
  return (
    <div className="flex items-center gap-4 relative z-10">
       <div className={cn(
         "flex h-[24px] w-[24px] items-center justify-center rounded-full border-2 bg-white transition-all",
         status === 'completed' ? "border-brand-500 text-brand-500 scale-110 shadow-sm" : "border-slate-200 text-slate-300"
       )}>
          <Icon className="h-3 w-3" />
       </div>
       <div className="flex-1 flex items-center justify-between">
          <p className={cn(
            "text-[11px] font-bold uppercase tracking-widest",
            status === 'completed' ? (color || "text-slate-900") : "text-slate-400"
          )}>
            {label}
          </p>
          {time && <span className="text-[10px] font-medium text-slate-400">{time}</span>}
       </div>
    </div>
  );
}

import React from "react";
