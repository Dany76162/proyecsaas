export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { listAvailabilitySlots, minutesToTime } from "@/modules/availability/service";
import {
  createAvailabilitySlotAction,
  toggleAvailabilitySlotAction,
  deleteAvailabilitySlotAction,
} from "@/modules/availability/actions";
import { prisma } from "@/server/db/prisma";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TIMEZONES = [
  "America/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Mexico_City",
  "America/Montevideo",
  "America/Asuncion",
  "America/Caracas",
  "Europe/Madrid",
  "UTC",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function AvailabilitySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { orgSlug } = await params;
  const { success, error } = await searchParams;

  const [organization, slots, members, properties, developments] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listAvailabilitySlots(orgSlug),
    prisma.membership.findMany({
      where: { organization: { slug: orgSlug }, user: { isActive: true } },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.property.findMany({
      where: { organization: { slug: orgSlug }, status: { not: "SOLD" } },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.development.findMany({
      where: { Organization: { slug: orgSlug } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const developmentNameById = new Map(developments.map((d) => [d.id, d.name]));

  const displayTimezone =
    slots.find((s) => s.isActive)?.timezone ??
    slots[0]?.timezone ??
    "America/Buenos_Aires";

  if (!organization) notFound();

  const slotsByDay = WEEKDAYS.map((_, dayIndex) =>
    slots.filter((s) => s.weekday === dayIndex),
  );

  const activeCount = slots.filter((s) => s.isActive).length;
  const daysWithSlots = new Set(slots.filter((s) => s.isActive).map((s) => s.weekday)).size;

  return (
    <>
      {success === "slot-created" && (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          Horario creado correctamente.
        </section>
      )}
      {error === "invalid-slot" && (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
          Datos inválidos. Revisá que el horario de fin sea posterior al de inicio.
        </section>
      )}

      {/* Resumen */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Horarios activos</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{activeCount}</p>
          <p className="mt-1 text-sm text-slate-500">Ventanas disponibles configuradas.</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Días con cobertura</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{daysWithSlots}</p>
          <p className="mt-1 text-sm text-slate-500">Días de la semana con al menos un horario.</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zona horaria</p>
          <p className="mt-2 text-lg font-bold text-slate-950 truncate">{displayTimezone}</p>
          <p className="mt-1 text-sm text-slate-500">Usada por defecto para todas las visitas.</p>
        </div>
      </section>

      {/* Vista semanal */}
      <SectionCard
        eyebrow="Disponibilidad"
        title="Horarios por día de la semana"
        description="El agente IA usa estos horarios para proponer visitas automáticamente. Si no hay horarios configurados, el sistema no puede agendar automáticamente."
      >
        {slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-semibold text-slate-700">Sin horarios configurados</p>
            <p className="mt-1 text-sm text-slate-400">
              Usá el formulario de abajo para agregar tu primer horario disponible.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {WEEKDAYS.map((dayName, dayIndex) => {
              const daySlots = slotsByDay[dayIndex] ?? [];
              return (
                <div key={dayIndex} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className={`px-3 py-2 text-center text-xs font-semibold ${
                    daySlots.some((s) => s.isActive)
                      ? "bg-brand-50 text-brand-700"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {WEEKDAYS_SHORT[dayIndex]}
                  </div>
                  <div className="p-2 space-y-1.5">
                    {daySlots.length === 0 ? (
                      <p className="text-center text-[11px] text-slate-300 py-2">—</p>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`rounded-xl px-2 py-2 text-[11px] ${
                            slot.isActive
                              ? "bg-brand-50 border border-brand-200"
                              : "bg-slate-50 border border-slate-200 opacity-50"
                          }`}
                        >
                          <p className="font-semibold text-slate-800 truncate">{slot.label}</p>
                          <p className="text-slate-500">
                            {minutesToTime(slot.startMinute)} – {minutesToTime(slot.endMinute)}
                          </p>
                          {slot.userName && (
                            <p className="text-slate-400 truncate">{slot.userName}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Lista con acciones */}
      {slots.length > 0 && (
        <SectionCard
          eyebrow="Gestión"
          title="Todos los horarios"
          description="Activá, desactivá o eliminá cualquier franja horaria."
        >
          <div className="space-y-3">
            {slots.map((slot) => (
              <article
                key={slot.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                  slot.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                    slot.isActive ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {WEEKDAYS_SHORT[slot.weekday]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{slot.label}</p>
                    <p className="text-sm text-slate-500">
                      {minutesToTime(slot.startMinute)} – {minutesToTime(slot.endMinute)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {slot.userName && (
                        <StatusBadge label={`Agente: ${slot.userName}`} tone="info" />
                      )}
                      {slot.propertyTitle && (
                        <StatusBadge label={`Prop: ${slot.propertyTitle}`} tone="neutral" />
                      )}
                      {slot.developmentId && developmentNameById.get(slot.developmentId) && (
                        <StatusBadge label={`Desarrollo: ${developmentNameById.get(slot.developmentId)}`} tone="info" />
                      )}
                      <StatusBadge
                        label={slot.isActive ? "Activo" : "Inactivo"}
                        tone={slot.isActive ? "success" : "neutral"}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <form action={toggleAvailabilitySlotAction}>
                    <input type="hidden" name="orgSlug" value={orgSlug} />
                    <input type="hidden" name="slotId" value={slot.id} />
                    <input type="hidden" name="isActive" value={String(slot.isActive)} />
                    <button
                      type="submit"
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {slot.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                  <form action={deleteAvailabilitySlotAction}>
                    <input type="hidden" name="orgSlug" value={orgSlug} />
                    <input type="hidden" name="slotId" value={slot.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Formulario para agregar */}
      <SectionCard
        eyebrow="Nuevo horario"
        title="Agregar franja de disponibilidad"
        description="Configurá cuándo está disponible la inmobiliaria para recibir visitas. Podés asignar un agente o propiedad específica, o dejar general para toda la organización."
      >
        <form action={createAvailabilitySlotAction} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="orgSlug" value={orgSlug} />

          {/* Etiqueta */}
          <div className="lg:col-span-3">
            <label className={labelClass}>Nombre del horario</label>
            <input
              name="label"
              required
              className={inputClass}
              placeholder="Ej. Horario laboral, Mañanas, Fin de semana…"
              maxLength={100}
            />
          </div>

          {/* Día */}
          <div>
            <label className={labelClass}>Día de la semana</label>
            <select name="weekday" defaultValue="1" className={inputClass}>
              {WEEKDAYS.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>

          {/* Inicio */}
          <div>
            <label className={labelClass}>Horario de inicio</label>
            <input
              name="startTime"
              type="time"
              required
              defaultValue="09:00"
              step={900}
              className={inputClass}
            />
          </div>

          {/* Fin */}
          <div>
            <label className={labelClass}>Horario de fin</label>
            <input
              name="endTime"
              type="time"
              required
              defaultValue="18:00"
              step={900}
              className={inputClass}
            />
          </div>

          {/* Zona horaria */}
          <div>
            <label className={labelClass}>Zona horaria</label>
            <select name="timezone" defaultValue="America/Buenos_Aires" className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Agente (opcional) */}
          <div>
            <label className={labelClass}>Agente asignado <span className="text-slate-400 font-normal">(opcional)</span></label>
            <select name="userId" defaultValue="" className={inputClass}>
              <option value="">General – toda la organización</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.fullName || m.user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Propiedad (opcional) */}
          <div>
            <label className={labelClass}>Propiedad <span className="text-slate-400 font-normal">(opcional)</span></label>
            <select name="propertyId" defaultValue="" className={inputClass}>
              <option value="">General – todas las propiedades</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Desarrollo / Loteo (opcional) */}
          <div>
            <label className={labelClass}>Desarrollo / Loteo <span className="text-slate-400 font-normal">(opcional)</span></label>
            <select name="developmentId" defaultValue="" className={inputClass}>
              <option value="">General – aplica a TODOS los desarrollos</option>
              {developments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Elegí el desarrollo para que este horario aplique <strong>solo</strong> a sus lotes (ej. Valles del Pino los sáb/dom).{" "}
              <span className="text-amber-500">«General» significa que el agente lo ofrece para cualquier desarrollo</span> — usalo solo si querés que valga en todos lados.
            </p>
          </div>

          <div className="lg:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              + Agregar horario
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Explicación del sistema */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
        <p className="text-sm font-semibold text-slate-700">¿Cómo usa el agente IA estos horarios?</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
          <li>
            <span className="font-medium text-slate-700">Propuesta automática:</span>{" "}
            cuando un lead confirma interés por WhatsApp, el agente busca el próximo slot disponible
            en esta configuración y propone fecha y hora concreta.
          </li>
          <li>
            <span className="font-medium text-slate-700">Prioridad de asignación:</span>{" "}
            primero se usan slots vinculados al agente asignado del lead; si no hay, se usan los generales de la organización.
          </li>
          <li>
            <span className="font-medium text-slate-700">Sin horarios = sin agendado automático:</span>{" "}
            si no hay ningún slot activo, el agente IA no puede proponer visitas y escala al equipo.
          </li>
          <li>
            <span className="font-medium text-slate-700">Podés agregar varios slots por día:</span>{" "}
            por ejemplo mañana (9–13) y tarde (15–19) en el mismo día.
          </li>
        </ul>
      </section>
    </>
  );
}
