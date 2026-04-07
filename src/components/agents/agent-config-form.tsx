"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 bg-white";

const TONE_OPTIONS = [
  { value: "FORMAL", label: "Formal" },
  { value: "FRIENDLY", label: "Cercano / Amigable" },
  { value: "NEUTRAL", label: "Neutro" },
] as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

export type AgentConfigInitial = {
  name: string;
  tone: string;
  persona: string | null;
  isActive: boolean;
};

export function AgentConfigForm({
  orgSlug,
  initial,
}: {
  orgSlug: string;
  initial: AgentConfigInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(initial.name);
  const [tone, setTone] = useState(initial.tone);
  const [persona, setPersona] = useState(initial.persona ?? "");
  const [isActive, setIsActive] = useState(initial.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/agent?orgSlug=${encodeURIComponent(orgSlug)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tone, persona, isActive }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Error al guardar.");
          return;
        }

        setSaved(true);
        setTimeout(() => router.refresh(), 0);
      } catch {
        setError("Error de conexion. Intenta de nuevo.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Active toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Agente activo</p>
          <p className="text-xs text-slate-400">
            Si esta desactivado, no se enviaran respuestas automaticas.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            isActive ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              isActive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre del agente" hint="Se usa internamente para identificar al agente.">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className={inputCls}
            placeholder="Asistente IA"
          />
        </Field>

        <Field label="Tono de comunicacion" hint="Define el estilo de las respuestas del agente.">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className={inputCls}
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Instrucciones personalizadas (persona)"
        hint="Instrucciones adicionales que el agente seguira al responder. Se agregan al prompt principal."
      >
        <textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          maxLength={2000}
          rows={4}
          className={`${inputCls} resize-none`}
          placeholder="Ej: Siempre menciona el barrio. No hables de precios sin antes preguntar el presupuesto..."
        />
      </Field>

      {/* Feedback */}
      {error && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Cambios guardados correctamente.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
