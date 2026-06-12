"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMasterplanStore, MasterplanUnit } from "@/lib/masterplan-store";
import { getProjectBlueprintData, autoNumberManzanas, renumberLots } from "@/lib/actions/unidades";
import { Search, Tag, X, Check, Download, FileText, Grid3x3, MessageCircle } from "lucide-react";
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

const ROWS_PER_PAGE = 100;

interface InventarioClientProps {
  proyectoId: string;
  onCountChange?: (text: string) => void;
}

export default function InventarioClient({ proyectoId, onCountChange }: InventarioClientProps) {
  const { units, setUnits, updateUnitState } = useMasterplanStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [showAutoManzanaConfirm, setShowAutoManzanaConfirm] = useState(false);
  const [isRenumbering, setIsRenumbering] = useState(false);
  const [showRenumberConfirm, setShowRenumberConfirm] = useState(false);
  const [renumberDirection, setRenumberDirection] = useState<"back-to-front" | "front-to-back">("back-to-front");

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

  const handleRenumber = async () => {
    setShowRenumberConfirm(false);
    setIsRenumbering(true);
    try {
      const res = await renumberLots(proyectoId, renumberDirection);
      if (res.success) {
        toast.success(`${res.count} lotes renumerados correctamente.`);
        const reloadRes = await getProjectBlueprintData(proyectoId);
        if (reloadRes.success && reloadRes.data) {
          setUnits(reloadRes.data as any);
        }
      } else {
        toast.error(res?.error || "Error al renumerar lotes.");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsRenumbering(false);
    }
  };

  // Filters
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterManzana, setFilterManzana] = useState("");
  const [filterEtapa, setFilterEtapa] = useState("");

  const [activeTab, setActiveTab] = useState<"comercial" | "estructura" | "venta">("comercial");
  const [page, setPage] = useState(0);

  // Inline editing
  const [editingField, setEditingField] = useState<{ id: string; field: "precio" | "superficie" | "frente" | "fondo" | "observaciones" | "manzanaNombre" | "destino" | "clientName" | "sellerName" | "precioSqm"; value: string } | null>(null);
  const [savingField, setSavingField] = useState<{ id: string; field: string } | null>(null);
  const [savingEstado, setSavingEstado] = useState<string | null>(null);

  // Gestión de Venta modal
  const [ventaModal, setVentaModal] = useState<{ unit: MasterplanUnit } | null>(null);
  const [modalTab, setModalTab] = useState<"cliente" | "operacion" | "cuotas" | "whatsapp">("cliente");
  const [loadingVentaModal, setLoadingVentaModal] = useState(false);
  const [isSavingVenta, setIsSavingVenta] = useState(false);
  const [ventaInstallments, setVentaInstallments] = useState<any[]>([]);
  const [ventaSummary, setVentaSummary] = useState<{
    totalInstallments: number;
    paidInstallments: number;
    pendingInstallments: number;
    overdueInstallments: number;
    totalAmountCents: number;
    paidAmountCents: number;
    pendingAmountCents: number;
  } | null>(null);
  const [payModal, setPayModal] = useState<{ installment: any } | null>(null);
  const [payForm, setPayForm] = useState({ paidAt: "", paymentMethod: "", paymentReference: "", notes: "" });
  const [isSavingPay, setIsSavingPay] = useState(false);
  const [ventaForm, setVentaForm] = useState({
    clientName: "",
    buyerDni: "",
    buyerWhatsapp: "",
    totalPrice: "",
    downPayment: "",
    paymentMethod: "",
    paymentReference: "",
    installmentCount: "",
    firstDueDate: "",
  });

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const visibleUnits = useMemo(
    () => filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(0);
  }, [search, filterEstado, filterManzana, filterEtapa, activeTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of units) {
      const e = (u as any).estado as string;
      counts[e] = (counts[e] ?? 0) + 1;
    }
    return counts;
  }, [units]);

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

  // Gestión de Venta: open modal and prefill form + load installments
  const openVentaModal = useCallback(async (unit: MasterplanUnit) => {
    setVentaModal({ unit });
    setModalTab("cliente");
    setVentaInstallments([]);
    setVentaSummary(null);
    setLoadingVentaModal(true);
    try {
      const res = await fetch(`/api/developments/lots/${unit.id}/reservation`);
      if (res.ok) {
        const data = await res.json();
        const r = data.reservation;
        setVentaForm({
          clientName: unit.clientName || "",
          buyerDni: r?.buyerDni || "",
          buyerWhatsapp: r?.buyerWhatsapp || "",
          totalPrice: r?.totalPriceCents ? String(r.totalPriceCents / 100) : (unit.precio ? String(unit.precio) : ""),
          downPayment: r?.downPaymentCents ? String(r.downPaymentCents / 100) : "",
          paymentMethod: r?.paymentMethod || "",
          paymentReference: r?.paymentReference || "",
          installmentCount: r?.installmentCount ? String(r.installmentCount) : "",
          firstDueDate: r?.firstDueDate ? new Date(r.firstDueDate).toISOString().split("T")[0] : "",
        });
        setVentaInstallments(data.installments ?? []);
        setVentaSummary(data.summary ?? null);
      }
    } catch {}
    setLoadingVentaModal(false);
  }, []);

  // Gestión de Venta: save
  const saveVenta = useCallback(async () => {
    if (!ventaModal) return;
    setIsSavingVenta(true);
    try {
      const totalPriceCents = ventaForm.totalPrice ? Math.round(parseFloat(ventaForm.totalPrice) * 100) : null;
      const downPaymentCents = ventaForm.downPayment ? Math.round(parseFloat(ventaForm.downPayment) * 100) : null;
      const installmentCount = ventaForm.installmentCount ? parseInt(ventaForm.installmentCount) : null;

      let installmentAmountCents: number | null = null;
      if (totalPriceCents !== null && downPaymentCents !== null && installmentCount) {
        const saldoCents = totalPriceCents - downPaymentCents;
        installmentAmountCents = Math.floor(saldoCents / installmentCount);
      }

      const res = await fetch(`/api/developments/lots/${ventaModal.unit.id}/reservation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: ventaForm.clientName || null,
          buyerDni: ventaForm.buyerDni || null,
          buyerWhatsapp: ventaForm.buyerWhatsapp || null,
          totalPriceCents,
          downPaymentCents,
          paymentMethod: ventaForm.paymentMethod || null,
          paymentReference: ventaForm.paymentReference || null,
          installmentCount,
          installmentAmountCents,
          firstDueDate: ventaForm.firstDueDate || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        updateUnitState(ventaModal.unit.id, { clientName: ventaForm.clientName || null });
        const generated: number = data.installmentsGenerated ?? 0;
        if (generated > 0) {
          toast.success(`Plan de cuotas generado: ${generated} cuotas.`);
        } else {
          toast.success("Gestión de venta guardada.");
        }
        setVentaModal(null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Error al guardar.");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSavingVenta(false);
    }
  }, [ventaModal, ventaForm, updateUnitState]);

  // Patch installment status (pay / revert)
  const patchInstallment = useCallback(
    async (installmentId: string, action: "pay" | "revert", formData?: typeof payForm) => {
      setIsSavingPay(true);
      try {
        const body: Record<string, unknown> = { action };
        if (action === "pay" && formData) {
          body.paidAt = formData.paidAt || undefined;
          body.paymentMethod = formData.paymentMethod || null;
          body.paymentReference = formData.paymentReference || null;
          body.notes = formData.notes || null;
        }
        const res = await fetch(`/api/developments/installments/${installmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setVentaInstallments(data.installments ?? []);
          setVentaSummary(data.summary ?? null);
          setPayModal(null);
          toast.success(action === "pay" ? "Cuota marcada como pagada." : "Cuota revertida a pendiente.");
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Error al actualizar cuota.");
        }
      } catch (err: any) {
        toast.error(`Error: ${err.message}`);
      } finally {
        setIsSavingPay(false);
      }
    },
    []
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

            {/* Renumerar lotes */}
            {units.length > 0 && !showRenumberConfirm && !showAutoManzanaConfirm && (
              <button
                onClick={() => setShowRenumberConfirm(true)}
                disabled={isRenumbering}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 disabled:opacity-60 transition-colors"
                title="Renumera los lotes en orden según su posición en el plano"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                {isRenumbering ? "Renumerando..." : "Renumerar lotes"}
              </button>
            )}
            {showRenumberConfirm && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-amber-700">Dirección:</span>
                <select
                  value={renumberDirection}
                  onChange={(e) => setRenumberDirection(e.target.value as any)}
                  className="text-xs border border-amber-300 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="back-to-front">Atrás → Adelante (números bajos al fondo)</option>
                  <option value="front-to-back">Adelante → Atrás (números bajos al frente)</option>
                </select>
                <button
                  onClick={() => setShowRenumberConfirm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                >Cancelar</button>
                <button
                  onClick={handleRenumber}
                  disabled={isRenumbering}
                  className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >Renumerar</button>
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
                : ["Lote", "Manzana", "Superficie", "Precio Lote", "Precio / m²", "Cliente", "Vendedor", "Acciones"]
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
            {visibleUnits.map((unit: any) => {
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

                      {/* Acciones */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openVentaModal(unit)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-transparent"
                          >
                            Gestionar
                          </button>
                          <Link
                            href={`/ficha/${unit.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white rounded-lg transition-colors border border-transparent"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </Link>
                        </div>
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

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4 px-1 py-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, filtered.length)} de {filtered.length} lotes · Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {Object.entries(STATUS_LABELS).map(([estado, label]) => {
          const count = statusCounts[estado] ?? 0;
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

      {/* ── Gestión de Venta Modal ── */}
      {ventaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Gestión de Venta</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lote {ventaModal.unit.numero}
                  {(ventaModal.unit as any).manzanaNombre ? ` · ${(ventaModal.unit as any).manzanaNombre}` : ""}
                </p>
              </div>
              <button
                onClick={() => setVentaModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-5">
              {(["cliente", "operacion", "cuotas", "whatsapp"] as const).map((tab) => {
                const labels = { cliente: "Cliente", operacion: "Operación", cuotas: "Plan de cuotas", whatsapp: "WhatsApp" };
                return (
                  <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
                      modalTab === tab
                        ? "border-brand-500 text-brand-600 dark:text-brand-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingVentaModal ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Tab: Cliente */}
                  {modalTab === "cliente" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nombre del comprador</label>
                        <input
                          type="text"
                          value={ventaForm.clientName}
                          onChange={(e) => setVentaForm(f => ({ ...f, clientName: e.target.value }))}
                          placeholder="Ej. Juan García"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">DNI / Documento</label>
                        <input
                          type="text"
                          value={ventaForm.buyerDni}
                          onChange={(e) => setVentaForm(f => ({ ...f, buyerDni: e.target.value }))}
                          placeholder="Ej. 30123456"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">WhatsApp del comprador</label>
                        <input
                          type="text"
                          value={ventaForm.buyerWhatsapp}
                          onChange={(e) => setVentaForm(f => ({ ...f, buyerWhatsapp: e.target.value }))}
                          placeholder="Ej. +54 9 11 1234-5678"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                        <p className="mt-1 text-xs text-slate-400">Incluir código de país. Ej: +54911...</p>
                      </div>
                    </div>
                  )}

                  {/* Tab: Operación */}
                  {modalTab === "operacion" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Precio total (USD)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                            <input
                              type="number"
                              value={ventaForm.totalPrice}
                              onChange={(e) => setVentaForm(f => ({ ...f, totalPrice: e.target.value }))}
                              placeholder="0"
                              className="w-full text-sm pl-6 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Anticipo / Señal (USD)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                            <input
                              type="number"
                              value={ventaForm.downPayment}
                              onChange={(e) => setVentaForm(f => ({ ...f, downPayment: e.target.value }))}
                              placeholder="0"
                              className="w-full text-sm pl-6 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                      {ventaForm.totalPrice && ventaForm.downPayment && (
                        <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                          Saldo a financiar:{" "}
                          <strong className="text-slate-700 dark:text-slate-200">
                            ${(parseFloat(ventaForm.totalPrice || "0") - parseFloat(ventaForm.downPayment || "0")).toLocaleString()} USD
                          </strong>
                        </p>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Método de pago</label>
                        <select
                          value={ventaForm.paymentMethod}
                          onChange={(e) => setVentaForm(f => ({ ...f, paymentMethod: e.target.value }))}
                          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                        >
                          <option value="">— Seleccionar —</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia bancaria</option>
                          <option value="cheque">Cheque</option>
                          <option value="cripto">Criptomoneda</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Referencia / Comprobante</label>
                        <input
                          type="text"
                          value={ventaForm.paymentReference}
                          onChange={(e) => setVentaForm(f => ({ ...f, paymentReference: e.target.value }))}
                          placeholder="N° transferencia, recibo, etc."
                          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab: Plan de cuotas */}
                  {modalTab === "cuotas" && (() => {
                    const totalPx = parseFloat(ventaForm.totalPrice) || 0;
                    const downPx = parseFloat(ventaForm.downPayment) || 0;
                    const saldo = totalPx - downPx;
                    const count = parseInt(ventaForm.installmentCount) || 0;
                    const baseAmountCents = count > 0 ? Math.floor(Math.round(saldo * 100) / count) : 0;
                    const baseAmount = baseAmountCents / 100;
                    const residuoCents = count > 0 ? Math.round(saldo * 100) % count : 0;
                    const firstDate = ventaForm.firstDueDate ? new Date(ventaForm.firstDueDate + "T12:00:00") : null;
                    const hasSaved = ventaInstallments.length > 0;
                    const hasPaid = (ventaSummary?.paidInstallments ?? 0) > 0;

                    const INST_STATUS_LABEL: Record<string, string> = {
                      PAID: "Pagada",
                      OVERDUE: "Vencida",
                      CANCELLED: "Cancelada",
                      PENDING: "Pendiente",
                    };
                    const INST_STATUS_CLASS: Record<string, string> = {
                      PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      CANCELLED: "bg-slate-100 text-slate-500",
                      PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    };

                    return (
                      <div className="space-y-3">
                        {/* Input fields — always shown to allow editing / regeneration */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Cantidad de cuotas</label>
                            <input
                              type="number"
                              min="1"
                              max="360"
                              value={ventaForm.installmentCount}
                              onChange={(e) => setVentaForm(f => ({ ...f, installmentCount: e.target.value }))}
                              placeholder="Ej. 36"
                              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Primer vencimiento</label>
                            <input
                              type="date"
                              value={ventaForm.firstDueDate}
                              onChange={(e) => setVentaForm(f => ({ ...f, firstDueDate: e.target.value }))}
                              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Saved installments (from DB) */}
                        {hasSaved ? (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-800/30 px-3 py-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                ✓ {ventaInstallments.length} cuotas guardadas
                              </span>
                              {ventaSummary && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-500">
                                  {ventaSummary.paidInstallments > 0 && `${ventaSummary.paidInstallments} pagadas · `}
                                  {ventaSummary.pendingInstallments} pendientes
                                  {ventaSummary.overdueInstallments > 0 && ` · ${ventaSummary.overdueInstallments} vencidas`}
                                </span>
                              )}
                            </div>
                            {hasPaid && (
                              <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-800/30 px-3 py-1.5">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                  ⚠️ Plan bloqueado: hay cuotas pagadas. Refinanciación en etapa futura.
                                </p>
                              </div>
                            )}
                            <div className="max-h-44 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-3 py-1.5 text-left font-semibold text-slate-500">#</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-slate-500">Vencimiento</th>
                                    <th className="px-3 py-1.5 text-right font-semibold text-slate-500">Monto</th>
                                    <th className="px-3 py-1.5 text-center font-semibold text-slate-500">Estado</th>
                                    <th className="px-3 py-1.5 text-center font-semibold text-slate-500">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                  {ventaInstallments.map((inst: any) => (
                                    <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                      <td className="px-3 py-1.5 text-slate-500">{inst.installmentNumber}</td>
                                      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">
                                        {new Date(inst.dueDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                                      </td>
                                      <td className="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">
                                        ${(inst.amountCents / 100).toLocaleString()}
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        <span className={cn(
                                          "inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide",
                                          INST_STATUS_CLASS[inst.status] ?? INST_STATUS_CLASS.PENDING
                                        )}>
                                          {INST_STATUS_LABEL[inst.status] ?? inst.status}
                                        </span>
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        {inst.status === "PAID" ? (
                                          <button
                                            onClick={() => patchInstallment(inst.id, "revert")}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium transition-colors"
                                          >
                                            Revertir
                                          </button>
                                        ) : inst.status !== "CANCELLED" ? (
                                          <button
                                            onClick={() => {
                                              const today = new Date().toISOString().split("T")[0];
                                              setPayForm({ paidAt: today, paymentMethod: "", paymentReference: "", notes: "" });
                                              setPayModal({ installment: inst });
                                            }}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium transition-colors"
                                          >
                                            Pagar
                                          </button>
                                        ) : null}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          /* Preview (no saved installments yet) */
                          count > 0 && saldo > 0 ? (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Vista previa</span>
                                <span className="text-xs text-slate-500">
                                  ${baseAmount.toLocaleString()} / mes · saldo ${saldo.toLocaleString()} USD
                                </span>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                      <th className="px-3 py-1.5 text-left font-semibold text-slate-500">#</th>
                                      <th className="px-3 py-1.5 text-left font-semibold text-slate-500">Vencimiento</th>
                                      <th className="px-3 py-1.5 text-right font-semibold text-slate-500">Monto</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {Array.from({ length: Math.min(count, 36) }, (_, i) => {
                                      const isLast = i === count - 1;
                                      const amount = isLast ? (baseAmountCents + residuoCents) / 100 : baseAmount;
                                      let dueLabel: string | null = null;
                                      if (firstDate) {
                                        const d = new Date(firstDate);
                                        d.setMonth(d.getMonth() + i);
                                        dueLabel = d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
                                      }
                                      return (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                          <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                                          <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{dueLabel || "—"}</td>
                                          <td className="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">
                                            ${amount.toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {count > 36 && (
                                      <tr>
                                        <td colSpan={3} className="px-3 py-1.5 text-center text-slate-400 italic">
                                          … y {count - 36} cuotas más
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic text-center py-4">
                              Completá el precio total, anticipo y cantidad de cuotas para ver el plan.
                            </p>
                          )
                        )}
                      </div>
                    );
                  })()}

                  {/* Tab: WhatsApp */}
                  {modalTab === "whatsapp" && (() => {
                    const phone = ventaForm.buyerWhatsapp.replace(/\D/g, "");
                    const hasPhone = phone.length >= 8;
                    const totalPx = parseFloat(ventaForm.totalPrice) || 0;
                    const downPx = parseFloat(ventaForm.downPayment) || 0;
                    const count = parseInt(ventaForm.installmentCount) || 0;
                    const baseAmount = count > 0 ? Math.floor(Math.round((totalPx - downPx) * 100) / count) / 100 : 0;

                    const lines = [
                      `Hola${ventaForm.clientName ? ` ${ventaForm.clientName}` : ""}! 👋`,
                      `Te escribimos en relación al *Lote ${ventaModal.unit.numero}*${(ventaModal.unit as any).manzanaNombre ? ` (${(ventaModal.unit as any).manzanaNombre})` : ""}.`,
                      totalPx > 0 ? `\n💰 *Precio total:* $${totalPx.toLocaleString()} USD` : "",
                      downPx > 0 ? `🤝 *Anticipo:* $${downPx.toLocaleString()} USD` : "",
                      count > 0 ? `📅 *Plan:* ${count} cuotas de $${baseAmount.toLocaleString()} USD/mes` : "",
                      "\nQuedamos a disposición para cualquier consulta.",
                    ].filter(Boolean);
                    const message = lines.join("\n");
                    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

                    return (
                      <div className="space-y-4">
                        {!hasPhone && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500/30 px-4 py-3">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Completá el WhatsApp del comprador en la pestaña <strong>Cliente</strong> para habilitar el enlace.
                            </p>
                          </div>
                        )}
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Mensaje generado:</p>
                          <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">{message}</pre>
                        </div>
                        <a
                          href={hasPhone ? waUrl : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
                            hasPhone
                              ? "bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed pointer-events-none"
                          )}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Abrir en WhatsApp
                        </a>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setVentaModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveVenta}
                disabled={isSavingVenta}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSavingVenta && (
                  <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay installment sub-modal */}
      {payModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayModal(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Registrar pago</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cuota #{payModal.installment.installmentNumber} · ${(payModal.installment.amountCents / 100).toLocaleString()} {payModal.installment.currency}
                </p>
              </div>
              <button onClick={() => setPayModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Fecha de pago</label>
                <input
                  type="date"
                  value={payForm.paidAt}
                  onChange={(e) => setPayForm(f => ({ ...f, paidAt: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Método de pago</label>
                <input
                  type="text"
                  placeholder="Transferencia, efectivo, cheque…"
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Referencia / comprobante</label>
                <input
                  type="text"
                  placeholder="Número de operación, recibo…"
                  value={payForm.paymentReference}
                  onChange={(e) => setPayForm(f => ({ ...f, paymentReference: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Notas</label>
                <textarea
                  rows={2}
                  placeholder="Observaciones opcionales…"
                  value={payForm.notes}
                  onChange={(e) => setPayForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPayModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => patchInstallment(payModal.installment.id, "pay", payForm)}
                disabled={isSavingPay}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSavingPay && (
                  <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                )}
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
