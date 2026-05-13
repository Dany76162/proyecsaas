"use client";

import { useState } from "react";
import { 
  ArrowLeft, Search, Copy, Download, Sparkles, Loader2, 
  CheckCircle2, AlertCircle, Trash2, Globe, FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  PROSPECT_COMPANY_TYPE_LABELS,
  getScoreBadgeColor,
  getScoreLevel,
  getRiskBadgeColor,
  getRiskLevel
} from "@/modules/prospecting/types";
import { analyzeProspectsAction, importProspectsAction } from "@/modules/prospecting/actions";
import { cn } from "@/lib/utils";

export default function ProspectingSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "search";
  
  const [tab, setTab] = useState(defaultTab);
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature Flags (Simulated from client side or passed via props if needed)
  const isCrawlerEnabled = false; // AGENTOS_ENABLE_PROSPECTING_CRAWLER

  const handleAnalyze = async () => {
    if (!rawText) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeProspectsAction(rawText);
      if (res.success) {
        setCandidates(res.candidates.map((c, i) => ({ ...c, selected: true, tempId: i })));
      }
    } catch (err: any) {
      setError(err.message || "Error al analizar el texto.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    const selected = candidates.filter(c => c.selected);
    if (selected.length === 0) return;
    
    setIsImporting(true);
    try {
      const res = await importProspectsAction(selected);
      if (res.success) {
        router.push("/platform/agents/prospecting");
      }
    } catch (err: any) {
      setError(err.message || "Error al importar los prospectos.");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleCandidate = (tempId: number) => {
    setCandidates(prev => prev.map(c => 
      c.tempId === tempId ? { ...c, selected: !c.selected } : c
    ));
  };

  const removeCandidate = (tempId: number) => {
    setCandidates(prev => prev.filter(c => c.tempId !== tempId));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Buscador Inteligente</h1>
          <p className="text-slate-500 font-medium mt-1">Encontrá y extraé candidatos para tu equipo comercial.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        <div className="space-y-8">
          {candidates.length === 0 ? (
            <Card className="rounded-[2.5rem] border-slate-200 shadow-soft overflow-hidden">
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <div className="px-8 pt-8">
                  <TabsList className="bg-slate-100/50 p-1 rounded-xl">
                    <TabsTrigger value="search" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Globe className="mr-2 h-4 w-4" /> Búsqueda Web
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Copy className="mr-2 h-4 w-4" /> Pegar Datos / URLs
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8">
                  <TabsContent value="search" className="space-y-6 mt-0">
                    {!isCrawlerEnabled ? (
                      <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                          <Globe className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Búsqueda web avanzada desactivada</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                          El motor de búsqueda automática está en mantenimiento. Usá el modo de pegado/análisis asistido.
                        </p>
                        <Button variant="outline" className="mt-6 font-bold" onClick={() => setTab("paste")}>
                           Ir a Pegar Datos
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Rubro</label>
                           <Input placeholder="Ej: Inmobiliarias" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Ciudad / Provincia</label>
                           <Input placeholder="Ej: Buenos Aires" />
                        </div>
                        <div className="md:col-span-2">
                          <Button className="w-full h-12 bg-slate-900 font-bold rounded-xl">
                            <Search className="mr-2 h-4 w-4" /> Buscar en la web
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paste" className="space-y-6 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                          Texto, URLs o resultados copiados
                        </label>
                        <Badge variant="outline" className="text-[9px] bg-brand-50 text-brand-700 border-brand-200">
                          IA ASISTIDA
                        </Badge>
                      </div>
                      <Textarea 
                        placeholder="Pegá aquí listas de empresas, URLs de sitios web o resultados de Google Maps..."
                        className="min-h-[250px] rounded-2xl resize-none font-medium text-slate-600 leading-relaxed"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                      />
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[11px] text-slate-400 font-medium">
                          La IA extraerá automáticamente nombres, emails, teléfonos y webs.
                        </p>
                        <Button 
                          onClick={handleAnalyze}
                          disabled={!rawText || isAnalyzing}
                          className="h-12 px-8 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl shadow-lg shadow-brand-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" /> Analizar candidatos
                            </>
                          )}
                        </Button>
                      </div>
                      {error && (
                        <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                          {error}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                   Candidatos Detectados
                   <Badge className="bg-slate-900">{candidates.length}</Badge>
                </h2>
                <Button variant="outline" size="sm" onClick={() => { setCandidates([]); setRawText(""); }} className="font-bold">
                   Nueva búsqueda
                </Button>
              </div>

              <Card className="rounded-[2.5rem] border-slate-200 shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-4 px-6 w-12"></th>
                        <th className="py-4 px-3">Empresa</th>
                        <th className="py-4 px-3">Rubro</th>
                        <th className="py-4 px-3">Ubicación</th>
                        <th className="py-4 px-3">Contacto</th>
                        <th className="py-4 px-3">Scoring</th>
                        <th className="py-4 px-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c) => (
                        <tr key={c.tempId} className={cn("border-b border-slate-50 transition", !c.selected && "opacity-50")}>
                          <td className="py-4 px-6">
                            <input 
                              type="checkbox" 
                              checked={c.selected}
                              onChange={() => toggleCandidate(c.tempId)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                          </td>
                          <td className="py-4 px-3">
                             <p className="font-bold text-slate-900">{c.companyName}</p>
                             {c.website && (
                               <a href={c.website} target="_blank" className="text-[10px] text-brand-600 font-bold hover:underline">
                                 {c.website.replace(/^https?:\/\//, "")}
                               </a>
                             )}
                          </td>
                          <td className="py-4 px-3">
                             <Badge variant="outline" className="text-[9px] font-black uppercase">
                               {PROSPECT_COMPANY_TYPE_LABELS[c.companyType as keyof typeof PROSPECT_COMPANY_TYPE_LABELS] || c.companyType}
                             </Badge>
                          </td>
                          <td className="py-4 px-3">
                             <p className="text-[11px] font-bold text-slate-600">{c.city || c.region || "—"}</p>
                             <p className="text-[9px] text-slate-400 uppercase tracking-widest">{c.country || "—"}</p>
                          </td>
                          <td className="py-4 px-3">
                             <div className="flex flex-col gap-0.5">
                               {c.email && <p className="text-[11px] font-bold text-slate-600">{c.email}</p>}
                               {c.phone && <p className="text-[10px] text-slate-400">{c.phone}</p>}
                               {!c.email && !c.phone && <span className="text-[10px] text-slate-300 font-bold">—</span>}
                             </div>
                          </td>
                          <td className="py-4 px-3">
                             <div className="flex items-center gap-2">
                                {c.isDuplicate && (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase">
                                    Duplicado
                                  </Badge>
                                )}
                                {!c.email && !c.website && (
                                  <Badge className="bg-slate-100 text-slate-400 border-slate-200 text-[9px] font-black uppercase">
                                    Pocos datos
                                  </Badge>
                                )}
                             </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                               onClick={() => removeCandidate(c.tempId)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                   <p className="text-sm font-bold text-slate-600">
                      {candidates.filter(c => c.selected).length} prospectos seleccionados para importar.
                   </p>
                   <Button 
                     onClick={handleImport}
                     disabled={isImporting || candidates.filter(c => c.selected).length === 0}
                     className="h-12 px-10 bg-slate-900 hover:bg-black text-white font-black rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isImporting ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...
                       </>
                     ) : (
                       <>
                         <Download className="mr-2 h-4 w-4" /> Importar seleccionados
                       </>
                     )}
                   </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        <aside className="space-y-6">
           <Card className="p-8 rounded-[2rem] border-slate-200 bg-white shadow-soft">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Sparkles className="h-4 w-4 text-brand-500" /> Cómo funciona
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                   <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-black text-xs">1</div>
                   <div>
                      <p className="text-sm font-bold text-slate-900">Buscá o Pegá</p>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">
                        Pegá resultados de Google Maps, listados de directorios o URLs de empresas.
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-black text-xs">2</div>
                   <div>
                      <p className="text-sm font-bold text-slate-900">Extracción IA</p>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">
                        Nuestro motor analiza el texto y extrae datos estructurados automáticamente.
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-black text-xs">3</div>
                   <div>
                      <p className="text-sm font-bold text-slate-900">Deduplicación</p>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-1">
                        Identificamos si la empresa ya es cliente o si ya existe en tu base de prospectos.
                      </p>
                   </div>
                </div>
              </div>
           </Card>

           <Card className="p-8 rounded-[2rem] border-slate-200 bg-amber-50/50 border-amber-100">
              <div className="flex items-center gap-2 text-amber-700 mb-4">
                <AlertCircle className="h-4 w-4" />
                <h4 className="text-xs font-black uppercase tracking-widest">Política de Seguridad</h4>
              </div>
              <ul className="text-[10.5px] font-bold text-amber-800/70 space-y-3 leading-relaxed">
                <li className="flex gap-2">
                   <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                   <span>Los prospectos se importan en estado 'Pendiente de Revisión'.</span>
                </li>
                <li className="flex gap-2">
                   <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                   <span>NO se envían emails automáticamente tras la importación.</span>
                </li>
                <li className="flex gap-2">
                   <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                   <span>Debés calificar y aprobar cada candidato manualmente.</span>
                </li>
              </ul>
           </Card>
        </aside>
      </div>
    </div>
  );
}
