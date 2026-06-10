"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";

import type {
  DevelopmentVisualObjectDto,
  UpdateDevelopmentVisualObjectInput,
  VisualVisibility,
  VisualTextGeometry,
} from "@/types/development-visual-objects";

interface VisualObjectInspectorProps {
  object: DevelopmentVisualObjectDto | null;
  disabled?: boolean;
  onUpdate: (objectId: string, input: UpdateDevelopmentVisualObjectInput) => void;
  onDelete: (objectId: string) => void;
}

const VISIBILITY_OPTIONS: Array<{ value: VisualVisibility; label: string }> = [
  { value: "BOTH", label: "Admin y publico" },
  { value: "ADMIN_ONLY", label: "Solo admin" },
  { value: "PUBLIC", label: "Solo publico" },
];

function numberValue(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function VisualObjectInspector({
  object,
  disabled = false,
  onUpdate,
  onDelete,
}: VisualObjectInspectorProps) {
  if (!object) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">Inspector</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Selecciona un objeto visual o crea un rectangulo para editar sus estilos.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-400 dark:border-slate-700">
          El dibujo directo avanzado queda para Fase 2B. Esta base trabaja solo con coordenadas del plano.
        </div>
      </aside>
    );
  }

  const textGeometry = object.geometryKind === "TEXT" ? (object.geometry as VisualTextGeometry) : null;

  return (
    <aside key={object.id} className="flex h-full min-h-0 w-full flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Inspector</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {object.geometryKind} · {object.coordinateSpace}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onUpdate(object.id, { interactive: !object.interactive })}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900"
          title={object.interactive ? "Ocultar interaccion" : "Habilitar interaccion"}
        >
          {object.interactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
          Nombre
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            defaultValue={object.name}
            disabled={disabled}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            onBlur={(event) => onUpdate(object.id, { name: event.currentTarget.value.trim() || object.name })}
          />
        </label>

        {textGeometry && (
          <>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Texto de la etiqueta
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                defaultValue={textGeometry.text}
                disabled={disabled}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                onBlur={(event) => {
                  const text = event.currentTarget.value.trim();
                  if (text && text !== textGeometry.text) {
                    onUpdate(object.id, {
                      geometry: {
                        ...textGeometry,
                        text,
                      },
                    });
                  }
                }}
              />
            </label>

            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
              Tamaño de letra (px)
              <input
                type="number"
                min="8"
                max="120"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                defaultValue={textGeometry.fontSize ?? 18}
                disabled={disabled}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                onBlur={(event) => {
                  const val = numberValue(event.currentTarget.value);
                  if (val !== null && val !== textGeometry.fontSize) {
                    onUpdate(object.id, {
                      geometry: {
                        ...textGeometry,
                        fontSize: val,
                      },
                    });
                  }
                }}
              />
            </label>
          </>
        )}

        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
          Tipo
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            defaultValue={object.type}
            disabled={disabled}
            onBlur={(event) => onUpdate(object.id, { type: event.currentTarget.value.trim() || object.type })}
          />
        </label>

        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
          Tooltip
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            defaultValue={object.tooltip ?? ""}
            disabled={disabled}
            onBlur={(event) => onUpdate(object.id, { tooltip: event.currentTarget.value.trim() || null })}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Relleno
            <input
              type="color"
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
              value={object.fillColor ?? "#22c55e"}
              disabled={disabled}
              onChange={(event) => onUpdate(object.id, { fillColor: event.currentTarget.value })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Borde
            <input
              type="color"
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
              value={object.strokeColor ?? "#166534"}
              disabled={disabled}
              onChange={(event) => onUpdate(object.id, { strokeColor: event.currentTarget.value })}
            />
          </label>
        </div>

        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
          Opacidad
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={object.opacity ?? 0.45}
            disabled={disabled}
            onChange={(event) => onUpdate(object.id, { opacity: numberValue(event.currentTarget.value) })}
            className="mt-2 w-full"
          />
          <span className="text-[11px] text-slate-400">{Math.round((object.opacity ?? 0.45) * 100)}%</span>
        </label>

        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
          Grosor de borde
          <input
            type="number"
            min="0"
            step="0.5"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            value={object.strokeWidth ?? 2}
            disabled={disabled}
            onChange={(event) => onUpdate(object.id, { strokeWidth: numberValue(event.currentTarget.value) })}
          />
        </label>

        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
          Visibilidad
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            value={object.visibility}
            disabled={disabled}
            onChange={(event) =>
              onUpdate(object.id, { visibility: event.currentTarget.value as VisualVisibility })
            }
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (window.confirm("Eliminar este objeto visual?")) {
            onDelete(object.id);
          }
        }}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar objeto
      </button>
    </aside>
  );
}
