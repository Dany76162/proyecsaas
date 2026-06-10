"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, Pencil, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DRAWABLE_LAYER_LABELS,
  DRAWABLE_LAYER_TYPES,
  type DevelopmentDrawableLayerDto,
  type DrawableLayerTipo,
} from "@/types/development-layers";

interface LayersPanelProps {
  layers: DevelopmentDrawableLayerDto[];
  activeLayerId: string | null;
  drawingLayerId: string | null;
  canDraw: boolean;
  disabledReason?: string | null;
  onClose: () => void;
  onCreate: (payload: {
    nombre: string;
    tipo: DrawableLayerTipo;
    colorRelleno: string;
    colorBorde: string;
    opacidad: number;
    grosorBorde: number;
  }) => Promise<void>;
  onUpdate: (layerId: string, payload: Partial<DevelopmentDrawableLayerDto>) => Promise<void>;
  onDelete: (layerId: string) => Promise<void>;
  onSelect: (layerId: string) => void;
  onStartDraw: (layerId: string) => void;
}

const TYPE_DEFAULTS: Record<
  DrawableLayerTipo,
  { fill: string; stroke: string; opacity: number; grosor: number }
> = {
  // Calles: asfalto oscuro con borde definido, grosor ancho para parecer calle
  CALLE:         { fill: "#475569", stroke: "#1e293b", opacity: 0.55, grosor: 8 },
  // Áreas verdes: verde claro con borde más oscuro
  AREA_VERDE:    { fill: "#22c55e", stroke: "#15803d", opacity: 0.35, grosor: 2 },
  // Perímetro: transparente con borde fuerte
  PERIMETRO:     { fill: "#0ea5e9", stroke: "#0369a1", opacity: 0.10, grosor: 3 },
  // Polígono libre: ámbar neutro configurable
  POLIGONO_LIBRE: { fill: "#f59e0b", stroke: "#b45309", opacity: 0.28, grosor: 2 },
};

export default function LayersPanel({
  layers,
  activeLayerId,
  drawingLayerId,
  canDraw,
  disabledReason,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onSelect,
  onStartDraw,
}: LayersPanelProps) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<DrawableLayerTipo>("AREA_VERDE");
  const [colorRelleno, setColorRelleno] = useState(TYPE_DEFAULTS.AREA_VERDE.fill);
  const [colorBorde, setColorBorde] = useState(TYPE_DEFAULTS.AREA_VERDE.stroke);
  const [opacidad, setOpacidad] = useState(TYPE_DEFAULTS.AREA_VERDE.opacity);
  const [grosorBorde, setGrosorBorde] = useState(TYPE_DEFAULTS.AREA_VERDE.grosor);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(true);

  const orderedLayers = useMemo(
    () => [...layers].sort((a, b) => a.orden - b.orden),
    [layers],
  );

  const handleTypeChange = (nextTipo: DrawableLayerTipo) => {
    setTipo(nextTipo);
    setColorRelleno(TYPE_DEFAULTS[nextTipo].fill);
    setColorBorde(TYPE_DEFAULTS[nextTipo].stroke);
    setOpacidad(TYPE_DEFAULTS[nextTipo].opacity);
    setGrosorBorde(TYPE_DEFAULTS[nextTipo].grosor);
  };

  const handleCreate = async () => {
    const cleanName = nombre.trim();
    if (!cleanName) return;
    setIsCreating(true);
    try {
      await onCreate({
        nombre: cleanName,
        tipo,
        colorRelleno,
        colorBorde,
        opacidad,
        grosorBorde,
      });
      setNombre("");
      // Colapsar el formulario al crear la primera capa
      if (layers.length === 0) setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h3 className="text-sm font-black">Capas del Proyecto</h3>
          <p className="text-[11px] font-medium text-slate-400">Calles, áreas verdes y polígonos sobre el plano.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {/* Aviso si no se puede dibujar */}
        {disabledReason && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold leading-relaxed text-amber-200">
            {disabledReason}
          </div>
        )}

        {/* Guía de uso */}
        {!disabledReason && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
            {drawingLayerId
              ? "Marcá los puntos sobre el plano. Usá «Finalizar dibujo» para guardar o «Cancelar dibujo» para descartar."
              : "Creá una capa, seleccionala y tocá «Dibujar» para marcar sus puntos sobre el plano."}
          </div>
        )}

        {/* ── Sección Nueva capa (colapsable) ── */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/70">
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-black uppercase text-slate-300">Nueva capa</span>
            </div>
            {showCreateForm
              ? <ChevronUp className="h-4 w-4 text-slate-500" />
              : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </button>

          {showCreateForm && (
            <div className="space-y-3 border-t border-slate-800 px-3 pb-3 pt-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Nombre</span>
                <input
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") handleCreate(); }}
                  placeholder="Ej: Boulevard principal"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Tipo de capa</span>
                <select
                  value={tipo}
                  onChange={(event) => handleTypeChange(event.target.value as DrawableLayerTipo)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white outline-none transition focus:border-brand-500"
                >
                  {DRAWABLE_LAYER_TYPES.map((layerType) => (
                    <option key={layerType} value={layerType}>
                      {DRAWABLE_LAYER_LABELS[layerType]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Relleno</span>
                  <input
                    type="color"
                    value={colorRelleno}
                    onChange={(event) => setColorRelleno(event.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Borde</span>
                  <input
                    type="color"
                    value={colorBorde}
                    onChange={(event) => setColorBorde(event.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                  Opacidad {Math.round(opacidad * 100)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacidad}
                  onChange={(event) => setOpacidad(Number(event.target.value))}
                  className="w-full accent-brand-500"
                />
              </label>

              {/* Grosor visible para calles */}
              {tipo === "CALLE" && (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                    Grosor de línea {grosorBorde}px
                  </span>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={grosorBorde}
                    onChange={(event) => setGrosorBorde(Number(event.target.value))}
                    className="w-full accent-brand-500"
                  />
                </label>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={!nombre.trim() || isCreating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {isCreating ? "Creando..." : "Guardar capa"}
              </button>
            </div>
          )}
        </div>

        {/* ── Lista de capas ── */}
        <div className="space-y-2">
          {orderedLayers.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs font-semibold text-slate-500">
              Todavía no hay capas guardadas.
            </div>
          )}

          {orderedLayers.map((layer) => {
            const isActive = layer.id === activeLayerId;
            const isDrawing = layer.id === drawingLayerId;
            const isCalle = layer.tipo === "CALLE";
            return (
              <div
                key={layer.id}
                className={cn(
                  "space-y-3 rounded-lg border p-3 transition",
                  isDrawing
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : isActive
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-slate-800 bg-slate-900/60",
                )}
              >
                {/* Nombre + tipo */}
                <button
                  type="button"
                  onClick={() => onSelect(layer.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-white/20"
                    style={{ backgroundColor: layer.colorRelleno ?? "#22c55e" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-white">{layer.nombre}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      {DRAWABLE_LAYER_LABELS[layer.tipo]}
                    </span>
                  </span>
                  {layer.bloqueada && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
                </button>

                {/* Acciones principales */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate(layer.id, { visible: !layer.visible })}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition",
                      layer.visible
                        ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                        : "border-slate-700 text-slate-500 hover:bg-slate-800",
                    )}
                  >
                    {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {layer.visible ? "Visible" : "Oculta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartDraw(layer.id)}
                    disabled={!canDraw || layer.bloqueada}
                    title={!canDraw ? disabledReason ?? "El dibujo todavía no está disponible." : undefined}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                      isDrawing
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-700 text-slate-300 hover:bg-slate-800",
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {isDrawing ? "Dibujando…" : "Dibujar"}
                  </button>
                </div>

                {/* Controles de estilo */}
                <div className="grid grid-cols-[1fr_1fr_42px] gap-2">
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] font-black uppercase text-slate-600">Relleno</span>
                    <input
                      type="color"
                      value={layer.colorRelleno ?? "#22c55e"}
                      onChange={(event) => onUpdate(layer.id, { colorRelleno: event.target.value })}
                      className="h-8 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                      title="Color de relleno"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] font-black uppercase text-slate-600">Borde</span>
                    <input
                      type="color"
                      value={layer.colorBorde ?? "#16a34a"}
                      onChange={(event) => onUpdate(layer.id, { colorBorde: event.target.value })}
                      className="h-8 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                      title="Color de borde"
                    />
                  </label>
                  <div className="flex flex-col">
                    <span className="mb-0.5 block text-[9px] font-black uppercase text-slate-600">Elim.</span>
                    <button
                      type="button"
                      onClick={() => setDeleteCandidateId(layer.id)}
                      className="flex h-8 items-center justify-center rounded-lg border border-red-500/30 text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      title="Eliminar capa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Opacidad */}
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                    Opacidad {Math.round((layer.opacidad ?? 0.35) * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layer.opacidad ?? 0.35}
                    onChange={(event) => onUpdate(layer.id, { opacidad: Number(event.target.value) })}
                    className="w-full accent-brand-500"
                  />
                </label>

                {/* Grosor de línea — solo para calles */}
                {isCalle && (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                      Grosor de línea {layer.grosorBorde ?? 8}px
                    </span>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      step="1"
                      value={layer.grosorBorde ?? 8}
                      onChange={(event) => onUpdate(layer.id, { grosorBorde: Number(event.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </label>
                )}

                {/* Confirmar eliminación inline */}
                {deleteCandidateId === layer.id && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs font-bold text-red-100">¿Eliminar esta capa?</p>
                    <p className="mt-0.5 text-[10px] text-red-300">Esta acción no se puede deshacer.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteCandidateId(null)}
                        className="flex-1 rounded-lg border border-slate-700 px-2 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDelete(layer.id);
                          setDeleteCandidateId(null);
                        }}
                        className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-[11px] font-black text-white transition hover:bg-red-700"
                      >
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
