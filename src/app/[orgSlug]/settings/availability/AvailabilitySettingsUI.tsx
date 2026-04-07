"use client";

import { useTransition, useState } from "react";
import { Clock, Trash2, Plus, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

import {
  actionCreateAvailabilitySlot,
  actionDeleteAvailabilitySlot,
  actionToggleAvailabilitySlot,
} from "@/modules/availability/actions";

import { cn } from "@/lib/utils";

type AvailabilitySlot = {
  id: string;
  label: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

type AvailabilitySettingsUIProps = {
  orgSlug: string;
  initialSlots: AvailabilitySlot[];
};

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function formatMinute(minute: number) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function parseTimeStringToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function AvailabilitySettingsUI({
  orgSlug,
  initialSlots,
}: AvailabilitySettingsUIProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Convert time strings to minutes
    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;

    if (!startTimeStr || !endTimeStr) {
      setError("Tenés que incluir una hora de inicio y fin.");
      return;
    }

    formData.set("startMinute", parseTimeStringToMinutes(startTimeStr).toString());
    formData.set("endMinute", parseTimeStringToMinutes(endTimeStr).toString());

    startTransition(async () => {
      const result = await actionCreateAvailabilitySlot(orgSlug, formData);
      if (!result.success) {
        setError(result.error ?? "Ocurrió un error");
      } else {
        form.reset();
      }
    });
  }

  async function handleDelete(slotId: string) {
    if (isPending) return;
    startTransition(async () => {
      const result = await actionDeleteAvailabilitySlot(orgSlug, slotId);
      if (!result.success) setError(result.error ?? "Error al borrar");
    });
  }

  async function handleToggle(slotId: string, currentIsActive: boolean) {
    if (isPending) return;
    startTransition(async () => {
      const result = await actionToggleAvailabilitySlot(orgSlug, slotId, !currentIsActive);
       if (!result.success) setError(result.error ?? "Error al alternar");
    });
  }

  // Agrupamos por días
  const slotsByDay = initialSlots.reduce((acc, slot) => {
    if (!acc[slot.weekday]) acc[slot.weekday] = [];
    acc[slot.weekday].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">Agregar nuevo horario</h3>
        
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-5 md:items-end">
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Día</label>
            <select
              name="weekday"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            >
              {WEEKDAYS.map((day, idx) => (
                <option key={idx} value={idx}>{day}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Desde</label>
            <input
              type="time"
              name="startTime"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hasta</label>
            <input
              type="time"
              name="endTime"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Etiqueta</label>
            <input
              type="text"
              name="label"
              placeholder="Ej: Turno mañana"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Guardar
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Horarios Activos</h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {initialSlots.length === 0 ? (
            <div className="p-8 text-center text-sm font-medium text-slate-400">
              Todavía no configuraste horarios de visita. El bot no podrá agendar visitas hasta que agregues al menos uno.
            </div>
          ) : (
            WEEKDAYS.map((dayName, dayIndex) => {
              const daySlots = slotsByDay[dayIndex];
              if (!daySlots?.length) return null;

              return (
                <div key={dayIndex} className="p-5">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{dayName}</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {daySlots.map(slot => (
                      <div 
                        key={slot.id} 
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 transition",
                          slot.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60 grayscale"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            slot.isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400"
                          )}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {formatMinute(slot.startMinute)} - {formatMinute(slot.endMinute)}
                            </p>
                            <p className="text-xs text-slate-500">{slot.label}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(slot.id, slot.isActive)}
                            disabled={isPending}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition",
                              slot.isActive 
                                ? "text-slate-500 hover:bg-slate-100" 
                                : "text-emerald-600 hover:bg-emerald-50"
                            )}
                            title={slot.isActive ? "Desactivar temporalmente" : "Activar horario"}
                          >
                           {slot.isActive ? <ToggleRight className="h-5 w-5 text-indigo-500" /> : <ToggleLeft className="h-5 w-5" />}
                          </button>
                          
                          <button
                            onClick={() => handleDelete(slot.id)}
                            disabled={isPending}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
