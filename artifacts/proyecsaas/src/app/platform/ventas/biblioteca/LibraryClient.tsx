"use client";

import { useState } from "react";
import type { 
  SalesLibraryMessage, 
  SalesLibraryMaterial, 
  SalesLibraryArgument, 
  SalesLibraryFAQ, 
  SalesLibraryObjection 
} from "@prisma/client";
import { MessageSquareText, FileText, BrainCircuit, HelpCircle, ShieldAlert, Copy, Edit2, CopyPlus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
                  "group inline-flex items-center border-b-2 py-4 px-1 text-sm font-bold"
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
                <div key={msg.id} className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900">{msg.title}</h3>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase tracking-wider">
                        {msg.category || "General"}
                      </span>
                    </div>
                    {msg.description && <p className="text-sm text-slate-500 mt-1">{msg.description}</p>}
                    
                    <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center gap-2 justify-end">
                    <button
                      onClick={() => {}}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => {}}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <CopyPlus className="h-4 w-4" />
                      Duplicar
                    </button>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-100"
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
                  <li key={mat.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 shrink-0 bg-brand-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-brand-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{mat.title}</h4>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{mat.fileType || "Enlace"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5">
                        Editar
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
                <div key={arg.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 text-lg">{arg.title}</h3>
                    <button className="text-slate-400 hover:text-brand-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
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
                          className="shrink-0 text-brand-600 hover:text-brand-800"
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
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-start">
                  <div className="flex-1 space-y-2">
                    <h4 className="font-bold text-slate-900 text-base">
                      {activeTab === "faqs" ? item.question : item.objection}
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap flex justify-between gap-4">
                      <span>{activeTab === "faqs" ? item.answer : item.response}</span>
                      <button
                        onClick={() => handleCopy(activeTab === "faqs" ? item.answer : item.response, item.id)}
                        className="shrink-0 text-brand-600 hover:text-brand-800"
                        title="Copiar respuesta"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button className="shrink-0 text-slate-400 hover:text-slate-600 p-1">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
