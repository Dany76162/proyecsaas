"use client";

import { useState, useTransition } from "react";
import { AgentLearningType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createLearningAction,
  updateLearningAction,
  toggleLearningAction,
  deleteLearningAction,
} from "@/modules/learnings/actions";

type LearningRow = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  content: string;
  priority: number;
  isActive: boolean;
  createdByName: string;
  createdAt: string;
};

const TYPE_OPTIONS: { value: AgentLearningType; label: string }[] = [
  { value: "CORRECCION_HUMANA", label: "Corrección humana" },
  { value: "PATRON_DE_EXITO", label: "Patrón de éxito" },
  { value: "OBJECION_FRECUENTE", label: "Objeción frecuente" },
  { value: "PREFERENCIA_COMERCIAL", label: "Preferencia comercial" },
  { value: "REGLA_OPERATIVA", label: "Regla operativa" },
];

export function LearningsPanel({
  orgSlug,
  learnings,
  activeCount,
  maxActive,
  isManager,
}: {
  orgSlug: string;
  learnings: LearningRow[];
  activeCount: number;
  maxActive: number;
  isManager: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(formData: FormData, action: (fd: FormData) => Promise<{ success: boolean; error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.success) {
        setError(result.error ?? "Error desconocido");
      } else {
        setShowForm(false);
        setEditingId(null);
      }
    });
  }

  const editingLearning = editingId ? learnings.find((l) => l.id === editingId) : null;

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isManager && !showForm && !editingId && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm(true)}
          disabled={activeCount >= maxActive}
        >
          + Nuevo aprendizaje
        </Button>
      )}

      {(showForm || editingId) && isManager && (
        <LearningForm
          orgSlug={orgSlug}
          learning={editingLearning ?? undefined}
          isPending={isPending}
          onSubmit={(fd) =>
            handleAction(fd, editingId ? updateLearningAction : createLearningAction)
          }
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
            setError(null);
          }}
        />
      )}

      {learnings.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No hay aprendizajes registrados. Creá el primero para que tus agentes mejoren.
        </p>
      ) : (
        <div className="space-y-3">
          {learnings.map((l) => (
            <div
              key={l.id}
              className={`rounded-xl border p-4 transition ${
                l.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={l.isActive ? "info" : "neutral"}>
                      {l.typeLabel}
                    </Badge>
                    {l.priority > 0 && (
                      <span className="text-xs text-slate-400">
                        Prioridad: {l.priority}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-medium text-slate-900">{l.title}</h3>
                  <p className="mt-0.5 text-sm text-slate-600 whitespace-pre-line">{l.content}</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Por {l.createdByName} — {new Date(l.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                {isManager && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(l.id);
                        setError(null);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("orgSlug", orgSlug);
                        fd.set("id", l.id);
                        handleAction(fd, toggleLearningAction);
                      }}
                    >
                      {l.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirm("¿Eliminar este aprendizaje?")) return;
                        const fd = new FormData();
                        fd.set("orgSlug", orgSlug);
                        fd.set("id", l.id);
                        handleAction(fd, deleteLearningAction);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LearningForm({
  orgSlug,
  learning,
  isPending,
  onSubmit,
  onCancel,
}: {
  orgSlug: string;
  learning?: LearningRow;
  isPending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<AgentLearningType>(
    (learning?.type as AgentLearningType) ?? "CORRECCION_HUMANA",
  );
  const [title, setTitle] = useState(learning?.title ?? "");
  const [content, setContent] = useState(learning?.content ?? "");
  const [priority, setPriority] = useState(String(learning?.priority ?? 0));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("orgSlug", orgSlug);
    if (learning) fd.set("id", learning.id);
    fd.set("type", type);
    fd.set("title", title);
    fd.set("content", content);
    fd.set("priority", priority);
    onSubmit(fd);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        {learning ? "Editar aprendizaje" : "Nuevo aprendizaje"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AgentLearningType)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Prioridad (0–99)
          </label>
          <input
            type="number"
            min={0}
            max={99}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Título (máx. 100 caracteres)
        </label>
        <input
          type="text"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Siempre aclarar si el precio incluye IVA"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Contenido (máx. 500 caracteres)
        </label>
        <textarea
          maxLength={500}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Explicá la regla, corrección o patrón que el agente debe seguir."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
          required
        />
        <p className="mt-0.5 text-xs text-slate-400">{content.length}/500</p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando..." : learning ? "Guardar cambios" : "Crear aprendizaje"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
