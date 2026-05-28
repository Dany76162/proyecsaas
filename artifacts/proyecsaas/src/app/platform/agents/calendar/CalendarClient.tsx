"use client";

import { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addDays
} from "date-fns";
import { es } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Camera, 
  Share2, 
  Briefcase, 
  MessageSquare,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  Archive,
  CalendarDays,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateCalendarStatusAction, scheduleContentDraftAction } from "@/modules/agents/actions";

const platformIcons: Record<string, any> = {
  INSTAGRAM: Camera,
  FACEBOOK: Share2,
  LINKEDIN: Briefcase,
  WHATSAPP: MessageSquare,
};

const statusColors: Record<string, string> = {
  UNSCHEDULED: "bg-slate-100 text-slate-600 border-slate-200",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  USED_MANUALLY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-slate-50 text-slate-400 border-slate-100",
};

const statusLabels: Record<string, string> = {
  UNSCHEDULED: "Sin programar",
  SCHEDULED: "Programado",
  USED_MANUALLY: "Usado",
  ARCHIVED: "Archivado",
};

export default function CalendarClient({ initialDrafts }: { initialDrafts: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Custom states for inline scheduling and non-native feedback
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const showFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateCalendarStatusAction(id, status as any);
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, calendarStatus: status } : d));
      showFeedback("Estado de contenido actualizado con éxito.", "success");
    } catch (err) {
      showFeedback("Error al actualizar el estado del contenido.", "error");
    }
  };

  const unscheduledDrafts = drafts.filter(d => d.calendarStatus === "UNSCHEDULED");
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Columna Izquierda: Calendario */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="p-6 border-slate-200/60 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-brand-50 text-brand-600">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: es })}
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Planificación de contenido interno
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-[10px] font-bold uppercase tracking-widest px-3 hover:bg-white hover:shadow-sm">
                Hoy
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 pb-4 mb-4">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
              <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100 shadow-inner">
            {calendarDays.map((day, i) => {
              const dayDrafts = drafts.filter(d => d.scheduledFor && isSameDay(new Date(d.scheduledFor), day));
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={i} 
                  className={cn(
                    "min-h-[120px] bg-white p-3 transition-colors hover:bg-slate-50/50 cursor-pointer group",
                    !isCurrentMonth && "bg-slate-50/30 text-slate-300"
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                      isToday ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" : "text-slate-500",
                      !isCurrentMonth && "opacity-30"
                    )}>
                      {format(day, "d")}
                    </span>
                    {dayDrafts.length > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {dayDrafts.slice(0, 3).map(draft => {
                      const Icon = platformIcons[draft.plannedPlatform] || MessageSquare;
                      return (
                        <div 
                          key={draft.id}
                          className={cn(
                            "text-[9px] font-bold p-1.5 rounded-lg border flex items-center gap-1.5 truncate transition-all group-hover:shadow-sm",
                            statusColors[draft.calendarStatus]
                          )}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{draft.title || "Contenido"}</span>
                        </div>
                      );
                    })}
                    {dayDrafts.length > 3 && (
                      <div className="text-[9px] font-black text-slate-400 pl-1">
                        + {dayDrafts.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Columna Derecha: Panel de Control */}
      <div className="lg:col-span-4 space-y-6">
        {/* Próximas Tareas de Contenido */}
        <Card className="p-6 border-slate-200/60 shadow-sm bg-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-600" />
              Pendientes de Planificar
            </h3>
            <Badge variant="neutral" className="bg-white border-slate-100 text-[10px] font-bold">
              {unscheduledDrafts.length}
            </Badge>
          </div>

          {feedback && (
            <div className={cn(
              "p-3 mb-4 rounded-xl border text-[11px] font-bold flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 duration-300",
              feedback.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
            )}>
              <span>{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-[9px] uppercase font-black tracking-widest pl-2 hover:opacity-75">Cerrar</button>
            </div>
          )}

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {unscheduledDrafts.length > 0 ? (
              unscheduledDrafts.map(draft => (
                <div key={draft.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-brand-200 transition-all group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate mb-1">
                        {draft.title || "Sin título"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="text-[9px] font-bold py-0 h-4 border-slate-100">
                          {draft.platform}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {format(new Date(draft.createdAt), "d MMM", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                  
                  {activeScheduleId === draft.id ? (
                    <div className="mt-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-0.5">Fecha de publicación</label>
                        <input 
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          required
                          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold outline-none focus:border-brand-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[9px] font-black uppercase tracking-widest h-7 px-3 flex-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                          onClick={() => setActiveScheduleId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          className="text-[9px] font-black uppercase tracking-widest h-7 px-3 flex-1 rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                          onClick={async () => {
                            if (!scheduleDate) return;
                            try {
                              await scheduleContentDraftAction(draft.id, { date: new Date(scheduleDate), platform: draft.platform });
                              setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, calendarStatus: "SCHEDULED", scheduledFor: new Date(scheduleDate) } : d));
                              setActiveScheduleId(null);
                              showFeedback("Programación agendada con éxito.", "success");
                            } catch (err) {
                              showFeedback("Error al guardar la fecha programada.", "error");
                            }
                          }}
                        >
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[9px] font-black uppercase tracking-widest h-7 px-3 flex-1 rounded-lg border-brand-100 text-brand-600 hover:bg-brand-50"
                        onClick={() => {
                          setScheduleDate(format(new Date(), "yyyy-MM-dd"));
                          setActiveScheduleId(draft.id);
                        }}
                      >
                        Programar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleUpdateStatus(draft.id, "USED_MANUALLY")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Filter className="h-6 w-6 text-slate-200" />
                </div>
                <p className="text-xs font-bold text-slate-400">Todo planificado</p>
              </div>
            )}
          </div>
        </Card>

        {/* Resumen de Estado */}
        <Card className="p-6 border-slate-200/60 shadow-sm bg-slate-900 text-white">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            Resumen Operativo
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Programados</span>
              <span className="text-sm font-black text-blue-400">
                {drafts.filter(d => d.calendarStatus === "SCHEDULED").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Usados (Manual)</span>
              <span className="text-sm font-black text-emerald-400">
                {drafts.filter(d => d.calendarStatus === "USED_MANUALLY").length}
              </span>
            </div>
            <div className="h-px bg-slate-800 my-2" />
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
              "El calendario interno es solo organizativo. La publicación real debe realizarse manualmente por un operador."
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
