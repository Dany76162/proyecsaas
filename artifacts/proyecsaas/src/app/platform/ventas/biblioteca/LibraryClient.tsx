"use client";

import { useState, useTransition } from "react";
import type { 
  SalesLibraryMessage, 
  SalesLibraryMaterial, 
  SalesLibraryArgument, 
  SalesLibraryFAQ, 
  SalesLibraryObjection 
} from "@prisma/client";
import { MessageSquareText, FileText, BrainCircuit, HelpCircle, ShieldAlert, Copy, Edit2, CopyPlus, ExternalLink, Plus, X, Power, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import * as actions from "./actions";

type LibraryClientProps = {
  initialMessages: SalesLibraryMessage[];
  initialMaterials: SalesLibraryMaterial[];
  initialArguments: SalesLibraryArgument[];
  initialFaqs: SalesLibraryFAQ[];
  initialObjections: SalesLibraryObjection[];
};

export function LibraryClient({
  initialMessages,
  initialMaterials,
  initialArguments,
  initialFaqs,
  initialObjections,
}: LibraryClientProps) {
  const [activeTab, setActiveTab] = useState<"mensajes" | "materiales" | "argumentos" | "faqs" | "objeciones">("mensajes");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [modalType, setModalType] = useState<"mensajes" | "materiales" | "argumentos" | "faqs" | "objeciones" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const TABS = [
    { id: "mensajes", label: "Mensajes de WhatsApp", icon: MessageSquareText },
    { id: "materiales", label: "Materiales", icon: FileText },
    { id: "argumentos", label: "Argumentos", icon: BrainCircuit },
    { id: "faqs", label: "Preguntas Frecuentes", icon: HelpCircle },
    { id: "objeciones", label: "Objeciones", icon: ShieldAlert },
  ] as const;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openModal = (type: typeof activeTab, item?: any, isDuplicate = false) => {
    setModalType(type);
    if (item) {
      if (isDuplicate) {
        setEditingItem(null);
        setFormData({ ...item, id: undefined, title: item.title ? `${item.title} (Copia)` : undefined });
      } else {
        setEditingItem(item);
        setFormData({ ...item });
      }
    } else {
      setEditingItem(null);
      setFormData({});
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (modalType === "mensajes") {
          if (editingItem) await actions.updateMessage(editingItem.id, formData);
          else await actions.createMessage(formData);
        } else if (modalType === "materiales") {
          if (editingItem) await actions.updateMaterial(editingItem.id, formData);
          else await actions.createMaterial(formData);
        } else if (modalType === "argumentos") {
          if (editingItem) await actions.updateArgument(editingItem.id, formData);
          else await actions.createArgument(formData);
        } else if (modalType === "faqs") {
          if (editingItem) await actions.updateFaq(editingItem.id, formData);
          else await actions.createFaq(formData);
        } else if (modalType === "objeciones") {
          if (editingItem) await actions.updateObjection(editingItem.id, formData);
          else await actions.createObjection(formData);
        }
        closeModal();
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al guardar.");
      }
    });
  };

  const handleToggle = (type: typeof activeTab, id: string, currentState: boolean) => {
    startTransition(async () => {
      if (type === "mensajes") await actions.toggleMessage(id, !currentState);
      if (type === "materiales") await actions.toggleMaterial(id, !currentState);
      if (type === "argumentos") await actions.toggleArgument(id, !currentState);
      if (type === "faqs") await actions.toggleFaq(id, !currentState);
      if (type === "objeciones") await actions.toggleObjection(id, !currentState);
    });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="border-b border-slate-200 flex-1 w-full">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    isActive
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                    "group inline-flex items-center border-b-2 py-4 px-1 text-sm font-bold whitespace-nowrap"
                  )}
                >
                  <Icon
                    className={cn(
                      isActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-500",
                      "-ml-0.5 mr-2 h-5 w-5"
                    )}
                    aria-hidden="true"
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <button
          onClick={() => openModal(activeTab)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Crear {TABS.find(t => t.id === activeTab)?.label}
        </button>
      </div>

      <div className="mt-4">
        {/* MENSAJES */}
        {activeTab === "mensajes" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
              <span className="font-bold mr-2">Variables disponibles:</span>
              <code className="bg-white px-1.5 py-0.5 rounded text-blue-900 mr-2">{`{{empresa}}`}</code>
              <code className="bg-white px-1.5 py-0.5 rounded text-blue-900 mr-2">{`{{nombre}}`}</code>
              <code className="bg-white px-1.5 py-0.5 rounded text-blue-900 mr-2">{`{{ciudad}}`}</code>
              <code className="bg-white px-1.5 py-0.5 rounded text-blue-900 mr-2">{`{{asesor}}`}</code>
              <code className="bg-white px-1.5 py-0.5 rounded text-blue-900">{`{{link_demo}}`}</code>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialMessages.length === 0 ? (
                <p className="text-sm text-slate-500 col-span-full">No hay mensajes configurados.</p>
              ) : (
                initialMessages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", !msg.isActive && "opacity-60")}>
                    <div className="p-4 border-b border-slate-100 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900">{msg.title}</h3>
                        <div className="flex items-center gap-2">
                          {!msg.isActive && <span className="text-xs font-bold text-rose-500">Inactivo</span>}
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-wider">
                            {msg.category || "General"}
                          </span>
                        </div>
                      </div>
                      {msg.description && <p className="text-sm text-slate-500 mt-1">{msg.description}</p>}
                      
                      <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => handleToggle("mensajes", msg.id, msg.isActive)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                        title={msg.isActive ? "Desactivar" : "Activar"}
                      >
                        {msg.isActive ? <PowerOff className="h-4 w-4 text-rose-500" /> : <Power className="h-4 w-4 text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => openModal("mensajes", msg)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Edit2 className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => openModal("mensajes", msg, true)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <CopyPlus className="h-4 w-4" />
                        Duplicar
                      </button>
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        disabled={!msg.isActive}
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedId === msg.id ? "¡Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MATERIALES */}
        {activeTab === "materiales" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-200">
              {initialMaterials.length === 0 ? (
                <li className="p-6 text-sm text-slate-500 text-center">No hay materiales configurados.</li>
              ) : (
                initialMaterials.map((mat) => (
                  <li key={mat.id} className={cn("p-4 flex items-center justify-between hover:bg-slate-50", !mat.isActive && "opacity-60")}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 shrink-0 bg-brand-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{mat.title}</h4>
                          {!mat.isActive && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 rounded uppercase">Inactivo</span>}
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{mat.fileType || "Enlace"} {mat.category ? `• ${mat.category}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggle("materiales", mat.id, mat.isActive)}
                        className="text-slate-400 hover:text-slate-700 p-2"
                      >
                         {mat.isActive ? <PowerOff className="h-4 w-4 text-rose-500" /> : <Power className="h-4 w-4 text-emerald-500" />}
                      </button>
                      <button 
                        onClick={() => openModal("materiales", mat)}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleCopy(mat.fileUrl, mat.id)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5"
                      >
                        <Copy className="h-4 w-4" /> Copiar Enlace
                      </button>
                      <a
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </a>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* ARGUMENTOS */}
        {activeTab === "argumentos" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {initialArguments.length === 0 ? (
              <p className="text-sm text-slate-500 col-span-full">No hay argumentos configurados.</p>
            ) : (
              initialArguments.map((arg) => (
                <div key={arg.id} className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4", !arg.isActive && "opacity-60")}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-lg">{arg.title}</h3>
                      {!arg.isActive && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 rounded uppercase">Inactivo</span>}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleToggle("argumentos", arg.id, arg.isActive)} className="text-slate-400 hover:text-slate-700">
                         {arg.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                       </button>
                      <button onClick={() => openModal("argumentos", arg)} className="text-slate-400 hover:text-brand-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Descripción</h4>
                    <p className="text-sm text-slate-700">{arg.description}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 mb-1">Beneficio Clave</h4>
                    <p className="text-sm font-semibold text-emerald-900 bg-emerald-50 p-2 rounded">{arg.benefit}</p>
                  </div>
                  {arg.objections && (
                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 mb-1">Objeciones Frecuentes</h4>
                      <p className="text-sm text-slate-700">{arg.objections}</p>
                    </div>
                  )}
                  {arg.suggestedResponse && (
                    <div>
                      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-brand-500 mb-1">Respuesta Sugerida</h4>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-start gap-4">
                        <p className="text-sm text-slate-700 italic">"{arg.suggestedResponse}"</p>
                        <button
                          onClick={() => handleCopy(arg.suggestedResponse!, arg.id)}
                          disabled={!arg.isActive}
                          className="shrink-0 text-brand-600 hover:text-brand-800 disabled:opacity-50"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* FAQS & OBJECIONES */}
        {(activeTab === "faqs" || activeTab === "objeciones") && (
          <div className="space-y-4">
            {(activeTab === "faqs" ? initialFaqs : initialObjections).length === 0 ? (
              <p className="text-sm text-slate-500">No hay registros configurados.</p>
            ) : (
              (activeTab === "faqs" ? initialFaqs : initialObjections).map((item: any) => (
                <div key={item.id} className={cn("bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-start", !item.isActive && "opacity-60")}>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">
                        {activeTab === "faqs" ? item.question : item.objection}
                      </h4>
                      {!item.isActive && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 rounded uppercase">Inactivo</span>}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap flex justify-between gap-4">
                      <span>{activeTab === "faqs" ? item.answer : item.response}</span>
                      <button
                        onClick={() => handleCopy(activeTab === "faqs" ? item.answer : item.response, item.id)}
                        disabled={!item.isActive}
                        className="shrink-0 text-brand-600 hover:text-brand-800 disabled:opacity-50"
                        title="Copiar respuesta"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                     <button onClick={() => handleToggle(activeTab, item.id, item.isActive)} className="text-slate-400 hover:text-slate-700 p-1">
                       {item.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                     </button>
                    <button onClick={() => openModal(activeTab, item)} className="shrink-0 text-slate-400 hover:text-slate-600 p-1">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL OVERLAY */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingItem ? "Editar" : "Crear"} {TABS.find(t => t.id === modalType)?.label}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              
              {modalType === "mensajes" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
                      <input required type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.title || ""} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
                      <input type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.description || ""} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                      <input type="text" placeholder="Ej: General, Inmobiliaria" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.category || ""} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Contenido (Admite variables)</label>
                      <textarea required rows={6} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.content || ""} onChange={(e) => setFormData({...formData, content: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              {modalType === "materiales" && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
                      <input required type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.title || ""} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">URL del Archivo (Manual)</label>
                      <input required type="url" placeholder="https://..." className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.fileUrl || ""} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tipo (Ej: PDF, Video)</label>
                        <input type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.fileType || ""} onChange={(e) => setFormData({...formData, fileType: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
                        <input type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.category || ""} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalType === "argumentos" && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
                      <input required type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.title || ""} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
                      <textarea required rows={2} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.description || ""} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Beneficio Clave</label>
                      <textarea required rows={2} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.benefit || ""} onChange={(e) => setFormData({...formData, benefit: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Objeciones Frecuentes</label>
                      <input type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.objections || ""} onChange={(e) => setFormData({...formData, objections: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Respuesta Sugerida</label>
                      <textarea rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.suggestedResponse || ""} onChange={(e) => setFormData({...formData, suggestedResponse: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              {modalType === "faqs" && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Pregunta</label>
                      <input required type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.question || ""} onChange={(e) => setFormData({...formData, question: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Respuesta</label>
                      <textarea required rows={4} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.answer || ""} onChange={(e) => setFormData({...formData, answer: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              {modalType === "objeciones" && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Objeción</label>
                      <input required type="text" className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.objection || ""} onChange={(e) => setFormData({...formData, objection: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Respuesta oficial</label>
                      <textarea required rows={4} className="w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500" value={formData.response || ""} onChange={(e) => setFormData({...formData, response: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
