"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus, RefreshCw } from "lucide-react";

import type {
  CreateDevelopmentVisualObjectInput,
  DevelopmentVisualObjectDto,
  UpdateDevelopmentVisualObjectInput,
  VisualRectGeometry,
} from "@/types/development-visual-objects";
import VisualEditorToolbar, { type VisualEditorTool } from "./visual-editor-toolbar";
import VisualObjectInspector from "./visual-object-inspector";
import VisualPlanCanvas from "./visual-plan-canvas";

interface VisualPlanEditorProps {
  proyectoId: string;
}

interface BlueprintResponse {
  masterplanSVG?: string | null;
  svgContent?: string | null;
  blueprintSvg?: string | null;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error)
        : "No se pudo completar la operacion";
    throw new Error(message);
  }
  return data as T;
}

function buildRectObjectInput(
  geometry: VisualRectGeometry,
  order: number,
): CreateDevelopmentVisualObjectInput {
  return {
    name: `Objeto visual ${order + 1}`,
    type: "area",
    tooltip: "Area visual",
    geometryKind: "RECT",
    coordinateSpace: "PLAN_VIEWBOX",
    geometry,
    fillColor: "#22c55e",
    strokeColor: "#166534",
    opacity: 0.45,
    strokeWidth: 2,
    zIndex: order,
    visibility: "BOTH",
    interactive: true,
    locked: false,
  };
}

export default function VisualPlanEditor({ proyectoId }: VisualPlanEditorProps) {
  const [activeTool, setActiveTool] = useState<VisualEditorTool>("select");
  const [objects, setObjects] = useState<DevelopmentVisualObjectDto[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [masterplanSVG, setMasterplanSVG] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  const loadEditorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [objectsResponse, blueprintResponse] = await Promise.all([
        fetch(`/api/developments/${proyectoId}/visual-objects`, { cache: "no-store" }),
        fetch(`/api/developments/${proyectoId}/blueprint`, { cache: "no-store" }),
      ]);

      const loadedObjects = await readJson<{ objects: DevelopmentVisualObjectDto[] }>(objectsResponse);
      setObjects(loadedObjects.objects);

      if (blueprintResponse.ok) {
        const blueprint = (await blueprintResponse.json().catch(() => null)) as BlueprintResponse | null;
        setMasterplanSVG(
          blueprint?.masterplanSVG ?? blueprint?.svgContent ?? blueprint?.blueprintSvg ?? null,
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el editor visual");
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    void loadEditorData();
  }, [loadEditorData]);

  const createRect = useCallback(
    async (geometry: VisualRectGeometry) => {
      setSaving(true);
      setError(null);
      try {
        const input = buildRectObjectInput(geometry, objects.length);
        const response = await fetch(`/api/developments/${proyectoId}/visual-objects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const created = await readJson<{ object: DevelopmentVisualObjectDto }>(response);
        setObjects((current) => [...current, created.object]);
        setSelectedObjectId(created.object.id);
        setActiveTool("select");
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "No se pudo crear el objeto");
      } finally {
        setSaving(false);
      }
    },
    [objects.length, proyectoId],
  );

  const updateObject = useCallback(
    async (objectId: string, input: UpdateDevelopmentVisualObjectInput) => {
      const previousObjects = objects;
      setObjects((current) =>
        current.map((object) => (object.id === objectId ? { ...object, ...input } : object)),
      );
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/developments/${proyectoId}/visual-objects/${objectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const updated = await readJson<{ object: DevelopmentVisualObjectDto }>(response);
        setObjects((current) =>
          current.map((object) => (object.id === objectId ? updated.object : object)),
        );
      } catch (updateError) {
        setObjects(previousObjects);
        setError(updateError instanceof Error ? updateError.message : "No se pudo guardar el objeto");
      } finally {
        setSaving(false);
      }
    },
    [objects, proyectoId],
  );

  const deleteObject = useCallback(
    async (objectId: string) => {
      const previousObjects = objects;
      setObjects((current) => current.filter((object) => object.id !== objectId));
      setSelectedObjectId(null);
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/developments/${proyectoId}/visual-objects/${objectId}`, {
          method: "DELETE",
        });
        await readJson<{ success: true }>(response);
      } catch (deleteError) {
        setObjects(previousObjects);
        setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el objeto");
      } finally {
        setSaving(false);
      }
    },
    [objects, proyectoId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100 dark:bg-slate-950">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            Editor Visual SVG · Fase 2A
          </h3>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Objetos visuales en PLAN_VIEWBOX, separados del mapa y de la georreferenciacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VisualEditorToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            disabled={loading || saving}
            disabledTools={{ text: "Etiqueta queda para Fase 2B" }}
          />
          <button
            type="button"
            onClick={() => void createRect({ x: 120, y: 120, width: 160, height: 90 })}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Rectangulo
          </button>
          <button
            type="button"
            onClick={() => void loadEditorData()}
            disabled={loading || saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            title="Recargar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex shrink-0 items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-3 p-3">
        <div className="relative min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-800">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-slate-950/80 text-sm font-bold text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando editor visual...
            </div>
          )}
          <VisualPlanCanvas
            masterplanSVG={masterplanSVG}
            objects={objects}
            selectedObjectId={selectedObjectId}
            activeTool={activeTool}
            onSelectObject={setSelectedObjectId}
            onCreateRect={(geometry) => void createRect(geometry)}
          />
        </div>

        <div className="min-h-0">
          <VisualObjectInspector
            object={selectedObject}
            disabled={loading || saving}
            onUpdate={updateObject}
            onDelete={deleteObject}
          />
        </div>
      </div>
    </div>
  );
}
