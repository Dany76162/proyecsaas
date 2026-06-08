"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMasterplanStore, MasterplanUnit } from "@/lib/masterplan-store";
import { getProjectBlueprintData, autoNumberManzanas } from "@/lib/actions/unidades";
import { Search, Tag, X, Check, Download, FileText, Grid3x3 } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: "#10b981",
  RESERVADA: "#f59e0b",
  VENDIDA: "#ef4444",
  BLOQUEADO: "#94a3b8",
  SUSPENDIDO: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  RESERVADA: "Reservado",
  VENDIDA: "Vendido",
  BLOQUEADO: "Bloqueado",
  SUSPENDIDO: "Suspendido",
};

interface InventarioClientProps {
  proyectoId: string;
  onCountChange?: (text: string) => void;
}

export default function InventarioClient({ proyectoId, onCountChange }: InventarioClientProps) {
  const { units, setUnits, updateUnitState } = useMasterplanStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [showAutoManzanaConfirm, setShowAutoManzanaConfirm] = useState(false);

  const handleAutoManzana = async () => {
    setShowAutoManzanaConfirm(false);
    setIsAutoGrouping(true);
    try {
      const res = await autoNumberManzanas(proyectoId);
      if (res.success) {
        toast.success(`Completado: ${res.count} manzanas asignadas automáticamente (MZA1, MZA2, etc.).`);
        const reloadRes = await getProjectBlueprintData(proyectoId);
        if (reloadRes.success && reloadRes.data) {
          setUnits(reloadRes.data as any);
        }
      } else {
        toast.error(res?.error || "Ocurrió un error al agrupar.");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsAutoGrouping(false);
    }
  };

  // Filters
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterManzana, setFilterManzana] = useState("");
  const [filterEtapa, setFilterEtapa] = useState("");

  const [activeTab, setActiveTab] = useState<"comercial" | "estructura" | "venta">("comercial");

  // Inline editing
  const [editingField, setEditingField] = useState<{ id: string; field: "precio" | "superficie" | "frente" | "fondo" | "observaciones" | "manzanaNombre" | "destino" | "clientName" | "sellerName" | "precioSqm"; value: string } | null>(null);
  const [savingField, setSavingField] = useState<{ id: string; field: string } | null>(null);
  const [savingEstado, setSavingEstado] = useState<string | null>(null);

  // Tags — persisted in localStorage per project
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({});
  const [editingTag, setEditingTag] = useState<{ id: string; value: string } | null>(null);

  // Load units if store is empty
  useEffect(() => {
    if (units.length === 0) {
      setIsLoading(true);
      getProjectBlueprintData(proyectoId).then((res) => {
        if (res.success && res.data) setUnits(res.data as any);
        setIsLoading(false);
      });
    }
  }, [proyectoId, units.length, setUnits]);

  // Load tags from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mp_tags_${proyectoId}`);
      if (saved) setTagsMap(JSON.parse(saved));
    } catch {}
  }, [proyectoId]);

  const saveTagsToStorage = useCallback(
    (newMap: Record<string, string[]>) => {
      setTagsMap(newMap);
      try {
        localStorage.setItem(`mp_tags_${proyectoId}`, JSON.stringify(newMap));
      } catch {}
    },
    [proyectoId]
  );

  // Derive unique manzana / etapa options from loaded units
  const manzanas = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u: any) => {
      const n = u.manzanaNombre || (u as any).manzana?.nombre;
      if (n) set.add(n);
    });
    return Array.from(set).sort();
  }, [units]);

  const etapas = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u: any) => {
      const n = (u as any).manzana?.etapa?.nombre || u.etapaNombre;
      if (n) set.add(n);
    });
    return Array.from(set).sort();
  }, [units]);

  // Filtered + sorted units
  const filtered = useMemo(() => {
    const list = units.filter((u: any) => {
      const manzana = u.manzanaNombre || (u as any).manzana?.nombre || "";
      const etapa = (u as any).manzana?.etapa?.nombre || u.etapaNombre || "";
      if (search) {
        const q = search.toLowerCase();
        if (
          !u.numero.toLowerCase().includes(q) &&
          !manzana.toLowerCase().includes(q) &&
          !etapa.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterEstado && u.estado !== filterEstado) return false;
      if (filterManzana && manzana !== filterManzana) return false;
      if (filterEtapa && etapa !== filterEtapa) return false;
      return true;
    });

    return list.sort((a: any, b: any) => a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: "base" }));
  }, [units, search, filterEstado, filterManzana, filterEtapa]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(`${filtered.length} de ${units.length} lotes`);
    }
  }, [filtered.length, units.length, onCountChange]);

  // Estado change
  const handleEstadoChange = useCallback(
    async (unit: MasterplanUnit, nuevoEstado: string) => {
      if (nuevoEstado === unit.estado || savingEstado === unit.id) return;
      const prevEstado = unit.estado;
      setSavingEstado(unit.id);
      updateUnitState(unit.id, { estado: nuevoEstado as MasterplanUnit["estado"] });
      try {
        const res = await fetch(`/api/developments/lots/${unit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: nuevoEstado, previousEstado: prevEstado }),
        });
        if (!res.ok) updateUnitState(unit.id, { estado: prevEstado });
      } catch {
        updateUnitState(unit.id, { estado: prevEstado });
      } finally {
        setSavingEstado(null);
      }
    },
    [savingEstado, updateUnitState]
  );

  // Field save
  const handleFieldSave = useCallback(
    async (unit: MasterplanUnit) => {
      if (!editingField || editingField.id !== unit.id) return;
      const { field, value } = editingField;

      if (field === "precioSqm") {
        const raw = value.replace(/[^0-9.]/g, "");
        const parsedVal = raw ? parseFloat(raw) : null;
        if (parsedVal !== null && (isNaN(parsedVal) || parsedVal < 0)) {
          setEditingField(null);
          return;
        }
        let finalPrice = null;
        if (parsedVal !== null && unit.superficie) {
          finalPrice = Math.round(parsedVal * unit.superficie);
        }
        setSavingField({ id: unit.id, field: "precio" });
        updateUnitState(unit.id, { precio: finalPrice });
        try {
          await fetch(`/api/developments/lots/${unit.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ precio: finalPrice }),
          });
        } catch {}
        setSavingField(null);
        setEditingField(null);
        return;
      }

      let newValue: any = value;
      if (field === "precio" || field === "superficie" || field === "frente" || field === "fondo") {
        const raw = value.replace(/[^0-9.]/g, "");
        newValue = raw ? parseFloat(raw) : null;
        if (newValue !== null && (isNaN(newValue) || newValue < 0)) {
          setEditingField(null);
          return;
        }
      } else if (field === "manzanaNombre" || field === "destino" || field === "clientName" || field === "sellerName") {
        newValue = value.trim() || null;
      }

      setSavingField({ id: unit.id, field });
      updateUnitState(unit.id, { [field]: newValue });
      try {
        await fetch(`/api/developments/lots/${unit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: newValue }),
        });
      } catch {}
      setSavingField(null);
      setEditingField(null);
    },
    [editingField, updateUnitState]
  );

  // Tags
  const addTag = useCallback(
    (unitId: string, tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) {
        setEditingTag(null);
        return;
      }
      const current = tagsMap[unitId] || [];
      if (current.includes(trimmed)) {
        setEditingTag(null);
        return;
      }
      saveTagsToStorage({ ...tagsMap, [unitId]: [...current, trimmed] });
      setEditingTag(null);
    },
    [tagsMap, saveTagsToStorage]
  );

  const removeTag = useCallback(
    (unitId: string, tag: string) => {
      saveTagsToStorage({ ...tagsMap, [unitId]: (tagsMap[unitId] || []).filter((t) => t !== tag) });
    },
    [tagsMap, saveTagsToStorage]
  );

  // Export CSV (BOM-escaped and semicolon delimited for native Excel compatibility without external dependencies)
  const handleExportCSV = useCallback(() => {
    const dataToExport = filtered.map((unit: any) => ({
      "Lote": unit.numero,
      "Estado": STATUS_LABELS[unit.estado] || unit.estado,
      "Precio": unit.precio || 0,
      "Moneda": unit.moneda || "USD",
      "Superficie (m2)": unit.superficie || 0,
      "Frente (m)": unit.frente || 0,
      "Fondo (m)": unit.fondo || 0,
      "Manzana": unit.manzanaNombre || unit.manzana?.nombre || "—",
      "Etapa": unit.etapaNombre || unit.manzana?.etapa?.nombre || "—",
      "Destino": unit.destino || unit.tipo || "—",
      "Cliente": unit.clientName || "—",
      "Vendedor": unit.sellerName || "—",
      "Observaciones": unit.observaciones || "",
      "Etiquetas": (tagsMap[unit.id] || []).join(", ")
    }));

    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(";");
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => {
        const str = String(val ?? "").replace(/"/g, '""');
        return str.includes(";") || str.includes("\n") || str.includes("\"") ? `"${str}"` : str;
      }).join(";")
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filtered, tagsMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic text-center py-8">
        Cargando inventario... asegurate de estar en el paso Masterplan para que los datos se carguen.
      </p>
    );
  }

  const hasActiveFilter = search || filterEstado || filterManzana || filterEtapa;

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* ── Header: Tabs & Filters ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
        
        {/* ── Tabs ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("comercial")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
              activeTab === "comercial"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            💰 Comercial y Medidas
          </button>
          <button
            onClick={() => setActiveTab("estructura")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
              activeTab === "estructura"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            🏗️ Estructura y Tipología
          </button>
          <button
            onClick={() => setActiveTab("venta")}
            className={cn(
              "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
              activeTab === "venta"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            📊 Gestión de Venta
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lote, manzana, etapa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          {manzanas.length > 1 && (
            <select
              value={filterManzana}
              onChange={(e) => setFilterManzana(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">Todas las manzanas</option>
              {manzanas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {etapas.length > 1 && (
            <select
              value={filterEtapa}
              onChange={(e) => setFilterEtapa(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"
            >
              <option value="">Todas las etapas</option>
              {etapas.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearch("");
                setFilterEstado("");
                setFilterManzana("");
                setFilterEtapa("");
              }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-300 dark:text-slate-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            {units.length > 0 && !showAutoManzanaConfirm && (
              <button
                onClick={() => setShowAutoManzanaConfirm(true)}
                disabled={isAutoGrouping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-60 transition-colors"
                title="Agrupa los lotes de forma automática en manzanas según cercanía física"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                {isAutoGrouping ? "Agrupando..." : "Autonumerar Manzanas"}
              </button>
            )}
            {showAutoManzanaConfirm && (
              <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-indigo-700">¿Confirmar autonumeración de manzanas?</span>
                <button
                  onClick={() => setShowAutoManzanaConfirm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                >Cancelar</button>
                <button
                  onClick={handleAutoManzana}
                  disabled={isAutoGrouping}
                  className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >Confirmar</button>
              </div>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left relative border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-inherit">
              {(activeTab === "comercial"
                ? ["Lote", "Estado", "Precio", "Superficie", "Frente (m)", "Fondo (m)", "Observaciones"]
                : activeTab === "estructura"
                ? ["Lote", "Tipo", "Etapa", "Manzana", "Etiquetas"]
                : ["Lote", "Manzana", "Superficie", "Precio Lote", "Precio / m²", "Cliente", "Vendedor", "Ficha PDF"]
              ).map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap bg-inherit"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((unit: any) => {
              const manzana = unit.manzanaNombre || (unit as any).manzana?.nombre || "—";
              const etapa = (unit as any).manzana?.etapa?.nombre || unit.etapaNombre || "—";
              const tags = tagsMap[unit.id] || [];

              return (
                <tr
                  key={unit.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{unit.numero}</span>
                      <Link
                         href={`/ficha/${unit.id}`}
                         target="_blank"
                         title="Ver Ficha Técnica"
                         className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600 rounded"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>

                  {activeTab === "estructura" && (
                    <>
                      {/* Tipo / Destino */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "destino" ? (
                          <input
                            type="text"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            className="w-20 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "destino", value: unit.destino || unit.tipo || "" })}
                            className="text-xs text-slate-500 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2 capitalize"
                          >
                            {(unit.destino || unit.tipo)?.toLowerCase() || <span className="text-slate-400 italic">—</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{etapa}</td>
                      {/* Manzana */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "manzanaNombre" ? (
                          <input
                            type="text"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            className="w-16 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "manzanaNombre", value: unit.manzanaNombre || (unit as any).manzana?.nombre || "" })}
                            className="text-xs text-slate-500 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.manzanaNombre || (unit as any).manzana?.nombre || <span className="text-slate-400 italic">—</span>}
                          </button>
                        )}
                      </td>
                      {/* Etiquetas */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1 min-w-[80px]">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() => removeTag(unit.id, tag)}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          {editingTag?.id === unit.id ? (
                            <input
                              type="text"
                              value={editingTag?.value || ""}
                              onChange={(e) => setEditingTag({ id: unit.id, value: e.target.value })}
                              onBlur={() => addTag(unit.id, editingTag?.value || "")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addTag(unit.id, editingTag?.value || "");
                                if (e.key === "Escape") setEditingTag(null);
                              }}
                              autoFocus
                              placeholder="etiqueta..."
                              className="w-20 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingTag({ id: unit.id, value: "" })}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-brand-500 hover:border-brand-500 text-xs transition-colors opacity-0 group-hover:opacity-100"
                              title="Agregar etiqueta"
                            >
                              <Tag className="w-2.5 h-2.5" />+
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}

                  {activeTab === "venta" && (
                    <>
                      {/* Manzana */}
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{manzana}</td>

                      {/* Superficie */}
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {unit.superficie ? `${unit.superficie} m²` : <span className="text-slate-400 italic">—</span>}
                      </td>

                      {/* Precio Lote (Editable) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "precio" ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              value={editingField.value}
                              onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={() => handleFieldSave(unit)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleFieldSave(unit);
                                if (e.key === "Escape") setEditingField(null);
                              }}
                              autoFocus
                              className="w-24 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                            />
                            <button onClick={() => handleFieldSave(unit)} className="text-brand-500 flex-shrink-0">
                              {savingField && savingField.id === unit.id && savingField.field === "precio" ? (
                                <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "precio", value: String(unit.precio ?? "") })}
                            className="text-xs font-semibold text-slate-700 dark:text-white hover:text-brand-500 transition-colors group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.precio ? `$${unit.precio.toLocaleString()} ${unit.moneda || "USD"}` : <span className="text-slate-400 font-normal italic">— editar —</span>}
                          </button>
                        )}
                      </td>

                      {/* Precio / m² (Editable) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "precioSqm" ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              value={editingField.value}
                              onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={() => handleFieldSave(unit)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleFieldSave(unit);
                                if (e.key === "Escape") setEditingField(null);
                              }}
                              autoFocus
                              className="w-20 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">/ m²</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              const currentSqmPrice = unit.precio && unit.superficie && unit.superficie > 0
                                ? Math.round(unit.precio / unit.superficie)
                                : "";
                              setEditingField({ id: unit.id, field: "precioSqm", value: String(currentSqmPrice) });
                            }}
                            disabled={!unit.superficie}
                            className="text-xs text-slate-500 hover:text-brand-500 transition-colors group-hover:underline decoration-dashed underline-offset-2 disabled:hover:no-underline disabled:cursor-not-allowed"
                            title={!unit.superficie ? "Carga primero la superficie del lote para calcular el precio por m²" : "Editar precio por m²"}
                          >
                            {unit.precio && unit.superficie && unit.superficie > 0 ? (
                              <span className="font-medium">
                                ${Math.round(unit.precio / unit.superficie).toLocaleString()} / m²
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">— editar —</span>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Nombre del Cliente (Editable) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "clientName" ? (
                          <input
                            type="text"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            placeholder="Nombre del cliente"
                            className="w-40 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "clientName", value: unit.clientName || "" })}
                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.clientName || <span className="text-slate-400 italic">— cargar cliente —</span>}
                          </button>
                        )}
                      </td>

                      {/* Nombre de quien vendió (Editable) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "sellerName" ? (
                          <input
                            type="text"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            placeholder="Vendedor / Inmobiliaria"
                            className="w-40 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "sellerName", value: unit.sellerName || "" })}
                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.sellerName || <span className="text-slate-400 italic">— cargar vendedor —</span>}
                          </button>
                        )}
                      </td>

                      {/* Ficha / Descargar documento */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link
                          href={`/ficha/${unit.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white rounded-lg transition-colors border border-transparent"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </Link>
                      </td>
                    </>
                  )}

                  {activeTab === "comercial" && (
                    <>
                      {/* Estado — dropdown */}
                      <td className="px-4 py-2.5">
                        <select
                          value={unit.estado}
                          onChange={(e) => handleEstadoChange(unit, e.target.value)}
                          disabled={savingEstado === unit.id}
                          className={cn(
                            "text-[10px] font-bold uppercase rounded px-2 py-1 border border-transparent cursor-pointer disabled:opacity-60 focus:outline-none transition-all"
                          )}
                          style={{
                            color: STATUS_COLORS[unit.estado] || "#94a3b8",
                            backgroundColor: `${STATUS_COLORS[unit.estado]}15`,
                          }}
                        >
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k} style={{ color: "black", backgroundColor: "white" }}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "precio" ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              value={editingField.value}
                              onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={() => handleFieldSave(unit)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleFieldSave(unit);
                                if (e.key === "Escape") setEditingField(null);
                              }}
                              autoFocus
                              className="w-24 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                            />
                            <button onClick={() => handleFieldSave(unit)} className="text-brand-500 flex-shrink-0">
                              {savingField && savingField.id === unit.id && savingField.field === "precio" ? (
                                <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "precio", value: String(unit.precio ?? "") })}
                            className="text-xs font-semibold text-slate-700 dark:text-white hover:text-brand-500 transition-colors group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.precio ? `$${unit.precio.toLocaleString()}` : <span className="text-slate-400 font-normal italic">— editar —</span>}
                          </button>
                        )}
                      </td>

                      {/* Superficie */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "superficie" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" step="0.01"
                              value={editingField.value}
                              onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={() => handleFieldSave(unit)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleFieldSave(unit);
                                if (e.key === "Escape") setEditingField(null);
                              }}
                              autoFocus
                              className="w-20 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">m²</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "superficie", value: String(unit.superficie ?? "") })}
                            className="text-xs text-slate-500 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.superficie ? `${unit.superficie} m²` : <span className="text-slate-400 italic">—</span>}
                          </button>
                        )}
                      </td>

                      {/* Frente */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "frente" ? (
                          <input
                            type="number" step="0.01"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            className="w-16 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "frente", value: String(unit.frente ?? "") })}
                            className="text-xs text-slate-500 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.frente ? unit.frente : <span className="text-slate-400 italic">—</span>}
                          </button>
                        )}
                      </td>

                      {/* Fondo */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "fondo" ? (
                          <input
                            type="number" step="0.01"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            className="w-16 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "fondo", value: String(unit.fondo ?? "") })}
                            className="text-xs text-slate-500 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2"
                          >
                            {unit.fondo ? unit.fondo : <span className="text-slate-400 italic">—</span>}
                          </button>
                        )}
                      </td>

                      {/* Observaciones */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {editingField && editingField.id === unit.id && editingField.field === "observaciones" ? (
                          <input
                            type="text"
                            value={editingField.value}
                            onChange={(e) => setEditingField(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={() => handleFieldSave(unit)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleFieldSave(unit);
                              if (e.key === "Escape") setEditingField(null);
                            }}
                            autoFocus
                            className="w-32 text-xs px-1.5 py-0.5 rounded border border-brand-500 bg-white dark:bg-slate-800 focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingField({ id: unit.id, field: "observaciones", value: unit.observaciones ?? "" })}
                            className="text-xs text-slate-500 hover:text-brand-500 group-hover:underline decoration-dashed underline-offset-2 max-w-[150px] truncate block text-left"
                            title={unit.observaciones || ""}
                          >
                            {unit.observaciones ? unit.observaciones : <span className="text-slate-400 italic">—</span>}
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                  No hay lotes que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {Object.entries(STATUS_LABELS).map(([estado, label]) => {
          const count = units.filter((u: any) => u.estado === estado).length;
          if (count === 0) return null;
          return (
            <div key={estado} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[estado] }}
              />
              <span className="text-slate-500 dark:text-slate-400">{label}:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
