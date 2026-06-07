"use client";

import { motion } from "framer-motion";
import { X, History, Clock, MapPin, Maximize2, Bookmark, CreditCard, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { MasterplanUnit, useMasterplanStore } from "@/lib/masterplan-store";
import { useState, useEffect } from "react";
import { getUnidadHistorial } from "@/lib/actions/unidades";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDO: "Suspendido",
};

interface SidePanelProps {
    unit: MasterplanUnit;
    modo: "admin" | "public";
    canEdit: boolean;
    onClose: () => void;
}

export default function MasterplanSidePanel({ unit, modo, canEdit, onClose }: SidePanelProps) {
    const { comparisonIds, toggleComparison, updateUnitState } = useMasterplanStore();
    const isComparing = comparisonIds.includes(unit.id);
    const [historial, setHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [isChangingEstado, setIsChangingEstado] = useState(false);

    // Live reservation state
    const [showReserveForm, setShowReserveForm] = useState(false);
    const [reserveName, setReserveName] = useState("");
    const [reserveEmail, setReserveEmail] = useState("");
    const [reservePhone, setReservePhone] = useState("");
    const [isReserving, setIsReserving] = useState(false);
    const [reserveError, setReserveError] = useState("");

    const handleReserveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reserveName || !reserveEmail || !reservePhone) {
            setReserveError("Por favor completa todos los campos.");
            return;
        }
        setIsReserving(true);
        setReserveError("");
        try {
            const res = await fetch(`/api/developments/lots/${unit.id}/reserve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: reserveName,
                    email: reserveEmail,
                    telefono: reservePhone,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al iniciar la reserva");
            }
            
            // Repaint automatically
            updateUnitState(unit.id, { estado: "RESERVADA" });

            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } catch (err: any) {
            setReserveError(err.message || "Error al intentar realizar la reserva.");
        } finally {
            setIsReserving(false);
        }
    };

    // Extract internalId from coordenadasMasterplan
    let internalId: number | undefined;
    try {
        if ((unit as any).coordenadasMasterplan) {
            const coords = JSON.parse((unit as any).coordenadasMasterplan);
            internalId = coords?.internalId;
        }
    } catch {}

    const handleChangeEstado = async (nuevoEstado: string) => {
        if (nuevoEstado === unit.estado || isChangingEstado) return;
        const prevEstado = unit.estado; // capture before optimistic update
        setIsChangingEstado(true);
        updateUnitState(unit.id, { estado: nuevoEstado as any });
        try {
            // Sincronizar el cambio de estado con el backend de proyecsaas
            const res = await fetch(`/api/developments/lots/${unit.id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nuevoEstado }),
            });
            if (!res.ok) {
                updateUnitState(unit.id, { estado: prevEstado });
            }
        } catch {
            updateUnitState(unit.id, { estado: prevEstado });
        } finally {
            setIsChangingEstado(false);
        }
    };

    useEffect(() => {
        if (modo === "admin" && unit.id) {
            const fetchHistorial = async () => {
                setLoadingHistorial(true);
                const res = await getUnidadHistorial(unit.id);
                if (res.success && res.data) {
                    setHistorial(res.data);
                }
                setLoadingHistorial(false);
            };
            fetchHistorial();
        }
    }, [unit.id, modo]);

    return (
        <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="absolute top-0 right-0 bottom-0 w-[340px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-700 z-30 flex flex-col shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                        style={{ backgroundColor: STATUS_COLORS[unit.estado] || "#94a3b8" }}
                    >
                        {modo === "admin" && internalId != null ? `#${internalId}` : (unit.numero.split("-")[1] || unit.numero)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Lote {unit.numero}</h3>
                        <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                            style={{ backgroundColor: `${STATUS_COLORS[unit.estado] || "#94a3b8"}15`, color: STATUS_COLORS[unit.estado] || "#94a3b8" }}
                        >
                            {STATUS_LABELS[unit.estado] || unit.estado}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2.5">
                    {[
                        { label: "Superficie", value: unit.superficie ? `${unit.superficie} m²` : "—", icon: Maximize2 },
                        { label: "Precio", value: unit.precio ? formatCurrency(unit.precio, unit.moneda || "USD") : "—", icon: Bookmark },
                        { label: "Etapa", value: unit.etapaNombre || "Fase 1", icon: MapPin },
                        { label: "Manzana", value: unit.manzanaNombre || "Principal", icon: MapPin },
                    ].map((s) => (
                        <div key={s.label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <s.icon className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] text-slate-400">{s.label}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-white">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                {canEdit ? (
                    <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {isChangingEstado ? "Actualizando..." : "Cambiar Estado"}
                        </h4>
                        <div className="grid grid-cols-2 gap-1.5">
                            {(Object.keys(STATUS_LABELS) as string[]).map((e) => (
                                <button
                                    key={e}
                                    disabled={unit.estado === e || isChangingEstado}
                                    onClick={() => handleChangeEstado(e)}
                                    className={cn(
                                        "px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all",
                                        unit.estado === e
                                            ? "text-white border-transparent cursor-default"
                                            : "bg-transparent border-transparent hover:border-current disabled:opacity-40 cursor-pointer",
                                    )}
                                    style={unit.estado === e
                                        ? { backgroundColor: STATUS_COLORS[e] }
                                        : { color: STATUS_COLORS[e] }}
                                >
                                    {STATUS_LABELS[e]}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => toggleComparison(unit.id)}
                                className={cn(
                                    "w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center",
                                    isComparing
                                        ? "bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/30"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                )}
                            >
                                {isComparing ? "✓ Comparando en grilla" : "+ Añadir a comparación"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3.5">
                        {unit.estado === "DISPONIBLE" && (
                            <>
                                {!showReserveForm ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3.5 space-y-2">
                                        <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                            Reserva en Vivo con Seña
                                        </h5>
                                        <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                                            Asegurá este lote realizando el pago de una seña de reserva mediante Mercado Pago. El lote quedará reservado temporalmente a tu nombre para tu tranquilidad hasta que realices la visita.
                                        </p>
                                        <button
                                            onClick={() => setShowReserveForm(true)}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition duration-300 shadow-md shadow-emerald-600/10"
                                        >
                                            Iniciar Reserva Online
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleReserveSubmit} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-3.5 space-y-2.5">
                                        <h5 className="text-xs font-bold text-slate-700 dark:text-white">Formulario de Reserva</h5>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-semibold text-slate-400">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej. Juan Pérez"
                                                value={reserveName}
                                                onChange={(e) => setReserveName(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:border-brand-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-semibold text-slate-400">Email</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="Ej. juan@ejemplo.com"
                                                value={reserveEmail}
                                                onChange={(e) => setReserveEmail(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:border-brand-500"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-semibold text-slate-400">Teléfono</label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="Ej. +5491155556666"
                                                value={reservePhone}
                                                onChange={(e) => setReservePhone(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:border-brand-500"
                                            />
                                        </div>

                                        {reserveError && (
                                            <p className="text-[10px] font-medium text-red-500 leading-tight">{reserveError}</p>
                                        )}

                                        <div className="flex gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowReserveForm(false);
                                                    setReserveError("");
                                                }}
                                                className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold py-1.5 rounded-lg text-xs transition duration-200"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isReserving}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white font-bold py-1.5 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-1 shadow-md"
                                            >
                                                {isReserving ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Reservando...
                                                    </>
                                                ) : "Pagar Seña"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </>
                        )}

                        {unit.estado === "RESERVADA" && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3.5 text-center">
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Lote Reservado</p>
                                <p className="text-[10px] text-amber-600 dark:text-amber-500/80 mt-1">Este lote cuenta con una reserva activa o pendiente de visita.</p>
                            </div>
                        )}

                        {unit.estado === "VENDIDA" && (
                            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl p-3.5 text-center">
                                <p className="text-xs font-bold text-rose-800 dark:text-rose-400">Lote Vendido</p>
                                <p className="text-[10px] text-rose-600 dark:text-rose-500/80 mt-1">Este lote ya ha sido comercializado.</p>
                            </div>
                        )}

                        {unit.estado === "BLOQUEADO" && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3.5 text-center">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Lote Bloqueado</p>
                                <p className="text-[10px] text-slate-500 mt-1">Este lote no está disponible para la venta en este momento.</p>
                            </div>
                        )}

                        {unit.estado === "SUSPENDIDO" && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3.5 text-center">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Lote Suspendido</p>
                                <p className="text-[10px] text-slate-400 mt-1">Lote suspendido formalmente.</p>
                            </div>
                        )}

                        <button
                            onClick={() => toggleComparison(unit.id)}
                            className={cn(
                                "w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2",
                                isComparing
                                    ? "bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/30"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                        >
                            {isComparing ? "✓ Comparando" : "+ Comparar lote"}
                        </button>
                    </div>
                )}

                {/* Details */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalles Técnicos</h4>
                    <div className="space-y-1.5">
                        {[
                            { label: "Tipo", value: unit.tipo || "LOTE" },
                            { label: "Frente", value: unit.frente ? `${unit.frente} m` : "—" },
                            { label: "Fondo", value: unit.fondo ? `${unit.fondo} m` : "—" },
                            { label: "Orientación", value: unit.orientacion || "—" },
                            { label: "Esquina", value: unit.esEsquina ? "Sí ★" : "No" },
                            { label: "ID Interno", value: internalId != null ? `#${internalId}` : "—" },
                            { label: "ID Técnico", value: unit.id.slice(-8).toUpperCase() },
                        ].map((d) => (
                            <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs text-slate-400">{d.label}</span>
                                <span className={cn("text-xs font-medium text-slate-700 dark:text-slate-200", d.value.includes("★") && "text-amber-500")}>
                                    {d.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History (admin only) */}
                {modo === "admin" && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <History className="w-3 h-3" />Historial Real
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {loadingHistorial ? (
                                <div className="flex flex-col items-center py-8 gap-2">
                                    <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] text-slate-500">Cargando eventos...</p>
                                </div>
                            ) : historial.length === 0 ? (
                                <p className="text-[10px] text-slate-400 text-center py-4 italic">No hay cambios registrados todavía.</p>
                            ) : (
                                historial.map((entry, i) => (
                                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                                            </span>
                                            <span className="text-[10px] text-brand-500 font-medium">{entry.usuario?.nombre || "Sistema"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                                style={{ backgroundColor: `${STATUS_COLORS[entry.estadoAnterior] || "#94a3b8"}10`, color: STATUS_COLORS[entry.estadoAnterior] || "#94a3b8" }}>
                                                {STATUS_LABELS[entry.estadoAnterior] || entry.estadoAnterior}
                                            </span>
                                            <span className="text-slate-400 text-[10px]">→</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                                style={{ backgroundColor: `${STATUS_COLORS[entry.estadoNuevo] || "#94a3b8"}10`, color: STATUS_COLORS[entry.estadoNuevo] || "#94a3b8" }}>
                                                {STATUS_LABELS[entry.estadoNuevo] || entry.estadoNuevo}
                                            </span>
                                        </div>
                                        {entry.nota && <p className="text-[10px] text-slate-500 leading-tight">{entry.nota}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
