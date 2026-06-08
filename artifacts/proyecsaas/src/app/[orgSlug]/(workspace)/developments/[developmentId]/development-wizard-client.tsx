"use client";

import {
  FileText,
  Layers,
  Globe,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Home,
  Clock,
  Ban,
  DollarSign,
  MapPin,
  Trash2,
  X,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import dynamicImport from "next/dynamic";
import { deleteDevelopmentAction, updateDevelopmentAction } from "@/modules/developments/actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const BlueprintEngine = dynamicImport(
  () => import("@/components/masterplan/blueprint-engine"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
        <span className="text-slate-400 font-semibold animate-pulse">Cargando Procesador de Planos AI...</span>
      </div>
    ),
  }
);

const MasterplanViewer = dynamicImport(
  () => import("@/components/masterplan/masterplan-viewer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
        <span className="text-slate-400 font-semibold animate-pulse">Cargando Visor de Masterplan...</span>
      </div>
    ),
  }
);

const MasterplanMap = dynamicImport(
  () => import("@/components/masterplan/masterplan-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
        <span className="text-slate-400 font-semibold animate-pulse">Cargando Mapa Satelital...</span>
      </div>
    ),
  }
);

const InventarioClient = dynamicImport(
  () => import("@/components/developments/inventario-client"),
  { ssr: false }
);

const ProjectStepsDock = dynamicImport(
  () => import("@/components/developments/project-steps-dock"),
  { ssr: false }
);

interface DevelopmentWizardClientProps {
  orgSlug: string;
  development: any;
  activeTab: string;
  stats: {
    total: number;
    disponibles: number;
    reservadas: number;
    vendidas: number;
    bloqueados: number;
    pctVendido: number;
  };
  stepCompletion: {
    step1Done: boolean;
    step2Done: boolean;
    step3Done: boolean;
    step4Done: boolean;
    completedCount: number;
  };
}

export default function DevelopmentWizardClient({
  orgSlug,
  development,
  activeTab: initialActiveTab,
  stats,
  stepCompletion,
}: DevelopmentWizardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lotCountText, setLotCountText] = useState<string>("");

  const saveForm = async (formEl: HTMLFormElement, silent = false) => {
    setIsSaving(true);
    const formData = new FormData(formEl);
    const data = {
      developmentId: development.id,
      name: formData.get("name") as string,
      type: formData.get("type") as string || undefined,
      description: formData.get("description") as string || undefined,
      address: formData.get("address") as string || undefined,
      city: formData.get("city") as string || undefined,
      province: formData.get("province") as string || undefined,
      country: formData.get("country") as string || undefined,
      status: formData.get("status") as any || undefined,
      publicVisible: formData.get("publicVisible") === "on",
      logoUrl: formData.get("logoUrl") as string || undefined,
      companyLogoUrl: formData.get("companyLogoUrl") as string || undefined,
      themeColor: formData.get("themeColor") as string || undefined,
      brochurePlanUrl: formData.get("brochurePlanUrl") as string || undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
      contactWeb: formData.get("contactWeb") as string || undefined,
      contactAddress: formData.get("contactAddress") as string || undefined,
      services: formData.getAll("services") as string[],
      pricePerSqmEtapa1: formData.get("pricePerSqmEtapa1") ? (parseFloat(formData.get("pricePerSqmEtapa1") as string) || null) : null,
      pricePerSqmEtapa2: formData.get("pricePerSqmEtapa2") ? (parseFloat(formData.get("pricePerSqmEtapa2") as string) || null) : null,
      pricePerSqmEtapa3: formData.get("pricePerSqmEtapa3") ? (parseFloat(formData.get("pricePerSqmEtapa3") as string) || null) : null,
      pricePerSqmEtapa4: formData.get("pricePerSqmEtapa4") ? (parseFloat(formData.get("pricePerSqmEtapa4") as string) || null) : null,
      pricePerSqmEtapa5: formData.get("pricePerSqmEtapa5") ? (parseFloat(formData.get("pricePerSqmEtapa5") as string) || null) : null,
    };
    
    try {
      const res = await updateDevelopmentAction(orgSlug, data);
      if (res.success) {
        if (!silent) {
          toast.success("Desarrollo guardado correctamente.");
        }
        router.refresh();
        return true;
      } else {
        if (!silent) {
          toast.error(res.message || "Error al guardar el desarrollo.");
        }
        return false;
      }
    } catch (error) {
      console.error(error);
      if (!silent) {
        toast.error("Error de conexión al guardar el desarrollo.");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await saveForm(e.currentTarget, false);
  };

  // Synchronize state if activeTab prop updates from outside
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  const handleTabChange = async (tabId: string) => {
    if (activeTab === "info") {
      const formEl = document.getElementById("development-wizard-form") as HTMLFormElement;
      if (formEl) {
        await saveForm(formEl, true);
      }
    }
    setActiveTab(tabId);
    router.push(`?tab=${tabId}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteDevelopmentAction(orgSlug, { developmentId: development.id });
      if (res.success) {
        window.location.href = `/${orgSlug}/developments`;
      } else {
        toast.error(res.message || "Error al eliminar el desarrollo.");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión al eliminar el desarrollo.");
      setIsDeleting(false);
    }
  };

  const { total, disponibles, reservadas, vendidas, bloqueados } = stats;
  const { step1Done, step2Done, step3Done, step4Done, completedCount } = stepCompletion;

  const steps = [
    {
      id: "info",
      num: 1,
      label: "Información General",
      desc: "Datos básicos del proyecto",
      required: true,
      icon: FileText,
      done: step1Done,
      guidance: "Completá los datos del proyecto: nombre, ubicación y descripción para avanzar.",
    },
    {
      id: "blueprint",
      num: 2,
      label: "Plano del Proyecto",
      desc: "Cargá el plano del loteo",
      required: false,
      icon: LayoutDashboard,
      done: step2Done,
      guidance: "Subí el plano del loteo en DXF, SVG, PDF o imagen para detectar polígonos automáticamente.",
    },
    {
      id: "masterplan",
      num: 3,
      label: "Masterplan",
      desc: "Gestión del inventario y lotes",
      required: false,
      icon: Layers,
      done: step3Done,
      guidance: "Visualizá el masterplan del loteo y gestioná el estado de los lotes y el inventario.",
    },
    {
      id: "mapa",
      num: 4,
      label: "Mapa Interactivo",
      desc: "Posicioná el plano sobre el terreno",
      required: false,
      icon: Globe,
      done: step4Done,
      guidance: "Georreferenciá el proyecto en el mapa real calibrando el overlay del plano sobre el satélite.",
    },
  ];

  const currentStepIdx = steps.findIndex((s) => s.id === activeTab);
  const activeStep = steps[currentStepIdx] ?? steps[0];
  const prevStep = currentStepIdx > 0 ? steps[currentStepIdx - 1] : null;
  const nextStep = currentStepIdx < steps.length - 1 ? steps[currentStepIdx + 1] : null;
  const isWorkspaceTab = activeTab === "mapa" || activeTab === "blueprint" || activeTab === "masterplan";

  return (
    <div className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", isWorkspaceTab ? "space-y-2.5" : "space-y-4")}>
      {/* Tabs */}
      <div className={cn(
        "shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/50",
        "mx-4 sm:mx-6 lg:mx-8"
      )}>
        <div className="flex overflow-x-auto divide-x divide-slate-200 dark:divide-slate-800">
          {steps.map((step) => {
            const isActive = activeTab === step.id;
            return (
              <Link
                key={step.id}
                href={`?tab=${step.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabChange(step.id);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-1 justify-center",
                  isActive
                    ? "bg-brand-500 text-white shadow-inner"
                    : step.done
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                    isActive
                      ? "bg-white/25 text-white"
                      : step.done
                        ? "bg-emerald-500/20 text-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  )}
                >
                  {step.done && !isActive ? "✓" : step.num}
                </span>
                {step.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Step contents */}
        <div
          className={cn(
            "animate-fade-in space-y-4 min-h-0 flex-1",
            isWorkspaceTab ? "h-full relative flex flex-col" : "overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4 pt-2"
          )}
        >
          {/* PASO 1: INFORMACION GENERAL */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <form id="development-wizard-form" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start pb-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Datos del Proyecto</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Nombre</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={development.name || ""}
                        required
                        className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Tipo de Proyecto</label>
                      <input
                        type="text"
                        name="type"
                        defaultValue={development.type || ""}
                        className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl capitalize focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Precios de m² por Etapa</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map((stageNum) => (
                      <div key={stageNum}>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Etapa {stageNum} (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          name={`pricePerSqmEtapa${stageNum}`}
                          defaultValue={(development as any)[`pricePerSqmEtapa${stageNum}`] || ""}
                          placeholder="Ej: 150"
                          className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Ubicación y Entorno</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Ciudad</label>
                      <input
                        type="text"
                        name="city"
                        defaultValue={development.city || ""}
                        className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Provincia</label>
                      <input
                        type="text"
                        name="province"
                        defaultValue={development.province || ""}
                        className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">País</label>
                      <input
                        type="text"
                        name="country"
                        defaultValue={development.country || ""}
                        className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Descripción corta</label>
                  <textarea
                    name="description"
                    defaultValue={development.description || ""}
                    rows={3}
                    className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl resize-none focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Identidad de Marca y Ficha Técnica</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ImageUploader label="Logo del Proyecto" name="logoUrl" defaultValue={development.logoUrl || ""} projectId={development.id} />
                    <ImageUploader label="Plano Base Ficha (Alta Res)" name="brochurePlanUrl" defaultValue={development.brochurePlanUrl || ""} projectId={development.id} isPdfAccept />
                    <ImageUploader label="Logo Empresa/Inmobiliaria" name="companyLogoUrl" defaultValue={development.companyLogoUrl || ""} projectId={development.id} />
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Color Principal (Ficha)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" name="themeColor" defaultValue={development.themeColor || "#0D9488"} className="w-10 h-10 rounded cursor-pointer p-0 border-0" />
                        <span className="text-xs text-slate-500">Color principal usado en cabeceras y gráficos de la Ficha.</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wide mt-4 mb-2">Datos de Contacto (Pie de Ficha)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" name="contactPhone" placeholder="Teléfono..." defaultValue={development.contactPhone || ""} className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500" />
                    <input type="text" name="contactWeb" placeholder="Sitio Web..." defaultValue={development.contactWeb || ""} className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500" />
                    <input type="text" name="contactAddress" placeholder="Dirección..." defaultValue={development.contactAddress || ""} className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:border-brand-500" />
                  </div>

                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wide mt-4 mb-2">Servicios Disponibles</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Agua Corriente", "Luz Eléctrica", "Gas Natural", "Cloacas", "Pavimento", "Seguridad 24h", "Fibra Óptica", "SUM / Club House"].map((servicio) => (
                      <label key={servicio} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer hover:border-brand-500 transition">
                        <input type="checkbox" name="services" value={servicio} defaultChecked={development.services?.includes(servicio)} className="accent-brand-500 w-3.5 h-3.5" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{servicio}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Publicación y Estado</h3>
                
                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-xs text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-900">
                    <input
                      name="publicVisible"
                      type="checkbox"
                      defaultChecked={development.publicVisible}
                      className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">Publicar este desarrollo</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Aparecerá en el catálogo público y los buscadores.</p>
                    </div>
                  </label>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">Estado del desarrollo</label>
                    <select
                      name="status"
                      defaultValue={development.status || "DRAFT"}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="DRAFT">Borrador (Edición)</option>
                      <option value="ACTIVE">Activo (Publicado)</option>
                      <option value="SOLD_OUT">Vendido por completo (Agotado)</option>
                      <option value="PAUSED">Pausado temporariamente</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-brand-500 text-white hover:bg-brand-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-brand-500/20"
                  >
                    {isSaving ? "Guardando..." : "Guardar desarrollo"}
                  </button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                  <p className="text-[11px] font-bold text-red-500 mb-2">Zona de Peligro</p>
                  <p className="text-[10px] text-slate-400 mb-3">
                    Eliminar el desarrollo borrará permanentemente todo su historial, lotes cargados y plano georreferenciado.
                  </p>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar desarrollo
                    </button>
                  ) : (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                      <p className="text-xs font-bold text-red-700">
                        ¿Confirmar eliminación? Esta acción es irreversible.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </form>

              {/* Stats card */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  { label: "Disponible", val: disponibles, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Reserva Pendiente", val: reservadas, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { label: "Vendido", val: vendidas, icon: DollarSign, color: "text-rose-500", bg: "bg-rose-500/10" },
                  { label: "Bloqueado", val: bloqueados, icon: Ban, color: "text-slate-500", bg: "bg-slate-100" },
                ].map((s, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className={cn("h-4 w-4", s.color)} />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: PLANO DEL PROYECTO */}
          {activeTab === "blueprint" && (
            <div className="flex-1 flex flex-col h-full min-h-[640px] overflow-hidden">
              <BlueprintEngine proyectoId={development.id} orgSlug={orgSlug} />
            </div>
          )}

          {/* PASO 3: MASTERPLAN */}
          {activeTab === "masterplan" && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-6 pt-2">
              {!step2Done && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      Plano no cargado
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                      Subí el plano del proyecto en el{" "}
                      <Link href="?tab=blueprint" className="underline font-bold">
                        Paso 2 — Plano del Proyecto
                      </Link>{" "}
                      para verlo en el masterplan.
                    </p>
                  </div>
                </div>
              )}

              <div className="h-[640px] w-full relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <MasterplanViewer proyectoId={development.id} modo="admin" canEdit={true} />
              </div>

              {/* Inventario */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                  <Home className="w-5 h-5 text-brand-500" />
                  Inventario de Lotes
                  {lotCountText && (
                    <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
                      {lotCountText}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                  Editá estados, precios y datos de cada lote directamente desde la grilla.
                </p>
                {total === 0 ? (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <AlertCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Todavía no hay lotes registrados. Cargá el plano en el{" "}
                      <Link href="?tab=blueprint" className="text-brand-500 font-semibold underline">
                        Paso 2
                      </Link>{" "}
                      y sincronizá para generar el inventario automáticamente.
                    </p>
                  </div>
                ) : (
                  <InventarioClient proyectoId={development.id} onCountChange={setLotCountText} />
                )}
              </div>
            </div>
          )}

          {/* PASO 4: MAPA INTERACTIVO */}
          {activeTab === "mapa" && (
            <div className="flex-1 flex flex-col h-full min-h-[640px] overflow-hidden">
              {!step3Done && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Primero sincronizá los lotes en el{" "}
                  <Link href="?tab=masterplan" className="underline font-bold">
                    Paso 3 — Masterplan
                  </Link>{" "}
                  para verlos en el mapa.
                </div>
              )}
              <div className="flex-1 min-h-0 w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <MasterplanMap
                  proyectoId={development.id}
                  modo="admin"
                  centerLat={development.mapCenterLat ?? undefined}
                  centerLng={development.mapCenterLng ?? undefined}
                  mapZoom={development.mapZoom ?? undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dock navigation */}
      <ProjectStepsDock
        prevStep={prevStep ? { id: prevStep.id, num: prevStep.num, label: prevStep.label } : null}
        nextStep={nextStep ? { id: nextStep.id, num: nextStep.num, label: nextStep.label } : null}
        onNavigate={handleTabChange}
        className={cn("mt-auto shrink-0", "mx-4 sm:mx-6 lg:mx-8")}
      />
    </div>
  );
}

const ImageUploader = ({ label, name, defaultValue, projectId, isPdfAccept = false }: { label: string, name: string, defaultValue?: string, projectId: string, isPdfAccept?: boolean }) => {
  const [url, setUrl] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setUrl(data.url);
      } else {
        toast.error(data.error || "No se pudo subir el archivo.");
      }
    } catch(err) {
      toast.error("Error de conexión al subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block mb-1">{label}</label>
      {url ? (
        <div className="relative w-full h-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden group">
          {url.endsWith(".pdf") ? (
             <div className="flex items-center gap-2 text-brand-600"><FileText className="w-5 h-5"/> <span className="text-xs font-bold">Documento PDF guardado</span></div>
          ) : (
            <img src={url} alt={label} className="w-full h-full object-contain" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <button type="button" onClick={() => setUrl("")} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2"><Trash2 className="w-4 h-4"/></button>
          </div>
        </div>
      ) : (
        <label className="w-full flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-[10px] text-slate-500 font-semibold">{uploading ? "Subiendo..." : (isPdfAccept ? "Subir PDF o Imagen" : "Subir Imagen")}</span>
          <input type="file" accept={isPdfAccept ? "image/*,application/pdf" : "image/*"} className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
      <input type="hidden" name={name} value={url} />
    </div>
  );
};

