"use client";

import { useState } from "react";
import { 
  ArrowLeft, Search, Copy, Download, Sparkles, Loader2, 
  CheckCircle2, AlertCircle, Trash2, Globe, FileText,
  MapPin, Building2, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select 
} from "@/components/ui/select";
import { 
  PROSPECT_COMPANY_TYPE_LABELS,
  getScoreBadgeColor,
  getScoreLevel,
  getRiskBadgeColor,
  getRiskLevel
} from "@/modules/prospecting/types";
import { 
  analyzeProspectsAction, 
  importProspectsAction,
  performWebSearchAction 
} from "@/modules/prospecting/actions";
import { cn } from "@/lib/utils";

const LATAM_COUNTRIES = [
  { code: "ar", name: "Argentina" },
  { code: "cl", name: "Chile" },
  { code: "uy", name: "Uruguay" },
  { code: "py", name: "Paraguay" },
  { code: "bo", name: "Bolivia" },
  { code: "pe", name: "Perú" },
  { code: "ec", name: "Ecuador" },
  { code: "co", name: "Colombia" },
  { code: "mx", name: "México" },
  { code: "br", name: "Brasil" },
  { code: "es", name: "España" }, // Optional but relevant
];

export default function ProspectingSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "paste";
  
  const [tab, setTab] = useState(defaultTab);
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search Fields
  const [searchTopic, setSearchTopic] = useState("Inmobiliarias");
  const [searchCity, setSearchCity] = useState("");
  const [searchCountry, setSearchCountry] = useState("ar");

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

  const handleWebSearch = async () => {
    if (!searchTopic) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const countryName = LATAM_COUNTRIES.find(c => c.code === searchCountry)?.name;
      const res = await performWebSearchAction({
        topic: searchTopic,
        city: searchCity,
        country: countryName
      });
      if (res.success) {
        setCandidates(res.candidates.map((c, i) => ({ ...c, selected: true, tempId: i })));
      }
    } catch (err: any) {
      setError(err.message || "Error en la búsqueda automática. Verificá tu SERPER_API_KEY.");
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight tracking-[-0.04em]">Buscador Inteligente</h1>
          <p className="text-slate-500 font-medium mt-1">Extracción automática de leads en LATAM usando IA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        <div className="space-y-8">
          {candidates.length === 0 ? (
            <Card className="rounded-[2.5rem] border-slate-200 shadow-enterprise overflow-hidden border-t-0">
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="w-full h-16 bg-slate-50 p-0 rounded-none border-b border-slate-100 flex">
                  <TabsTrigger value="paste" className="flex-1 h-full rounded-none font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-brand-600 data-[state=active]:border-b-2 data-[state=active]:border-brand-600">
                    <Copy className="mr-2 h-4 w-4" /> Pegar Datos / URLs
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex-1 h-full rounded-none font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-brand-600 data-[state=active]:border-b-2 data-[state=active]:border-brand-600">
                    <Globe className="mr-2 h-4 w-4" /> Búsqueda Web (Auto)
                  </TabsTrigger>
                </TabsList>

                <div className="p-10">
                  <TabsContent value="paste" className="space-y-6 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                          Texto, URLs o resultados copiados
                        </label>
                        <Badge variant="outline" className="text-[9px] bg-brand-50 text-brand-700 border-brand-200 font-black tracking-widest px-2 py-1">
                          EXTRACCIÓN IA
                        </Badge>
                      </div>
                      <Textarea 
                        placeholder="Pegá aquí listas de empresas, URLs de sitios web o resultados de Google Maps..."
                        className="min-h-[280px] rounded-[2rem] p-6 border-slate-200 shadow-inner resize-none font-medium text-slate-600 leading-relaxed bg-slate-50/30"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                      />
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-[11px] text-slate-400 font-bold max-w-[250px]">
                          Copiá cualquier texto y la IA estructurará nombres, emails y webs automáticamente.
                        </p>
                        <Button 
                          onClick={handleAnalyze}
                          disabled={!rawText || isAnalyzing}
                          className="h-14 px-10 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-xl shadow-brand-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analizando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-5 w-5" /> Analizar con IA
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="search" className="space-y-8 mt-0">
                    <div className="bg-brand-50/30 border border-brand-100 p-6 rounded-3xl flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-600 border border-brand-50">
                          <Globe className="h-6 w-6" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-900">Agente de Búsqueda Activa</p>
                          <p className="text-[11px] font-bold text-slate-500">Buscá prospectos en cualquier país de LATAM automáticamente.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Qué buscás (Rubro)</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Ej: Inmobiliarias, Desarrolladoras..." 
                            className="h-12 pl-12 rounded-xl"
                            value={searchTopic}
                            onChange={(e) => setSearchTopic(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">País</label>
                        <Select 
                          value={searchCountry} 
                          onChange={(e) => setSearchCountry(e.target.value)}
                          className="h-12 rounded-xl"
                        >
                          {LATAM_COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Ciudad / Región (Opcional)</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Ej: Córdoba, Santiago, Medellín..." 
                            className="h-12 pl-12 rounded-xl"
                            value={searchCity}
                            onChange={(e) => setSearchCity(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={handleWebSearch}
                        disabled={!searchTopic || isAnalyzing}
                        className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Escaneando la web...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-5 w-5" /> Iniciar Búsqueda Automática
                          </>
                        )}
                      </Button>
                      <p className="text-[10px] text-center text-slate-400 font-bold mt-4 uppercase tracking-widest">
                        El proceso puede tardar hasta 30 segundos
                      </p>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {error && (
                <div className="mx-10 mb-10 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
                   <AlertCircle className="h-5 w-5 shrink-0" />
                   <p className="text-xs font-bold leading-relaxed">{error}</p>
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                   Resultados de Búsqueda
                   <Badge className="bg-slate-900 text-white rounded-lg px-2 h-6">{candidates.length}</Badge>
                </h2>
                <Button variant="outline" size="sm" onClick={() => { setCandidates([]); setRawText(""); }} className="font-bold border-slate-200">
                   Nueva búsqueda
                </Button>
              </div>

              <Card className="rounded-[2.5rem] border-slate-200 shadow-enterprise overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-5 px-8 w-12"></th>
                        <th className="py-5 px-3">Empresa</th>
                        <th className="py-5 px-3">Rubro</th>
                        <th className="py-5 px-3">Ubicación</th>
                        <th className="py-5 px-3">Contacto Detectado</th>
                        <th className="py-5 px-6">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c) => (
                        <tr key={c.tempId} className={cn("border-b border-slate-50 transition hover:bg-slate-50/50", !c.selected && "opacity-50")}>
                          <td className="py-5 px-8">
                            <input 
                              type="checkbox" 
                              checked={c.selected}
                              onChange={() => toggleCandidate(c.tempId)}
                              className="h-5 w-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
                            />
                          </td>
                          <td className="py-5 px-3">
                             <p className="font-black text-slate-900">{c.companyName}</p>
                             {c.website && (
                               <a href={c.website} target="_blank" className="text-[10px] text-brand-600 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                 {c.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-2.5 w-2.5" />
                               </a>
                             )}
                          </td>
                          <td className="py-5 px-3">
                             <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50/50">
                               {PROSPECT_COMPANY_TYPE_LABELS[c.companyType as keyof typeof PROSPECT_COMPANY_TYPE_LABELS] || c.companyType}
                             </Badge>
                          </td>
                          <td className="py-5 px-3">
                             <p className="text-[11px] font-bold text-slate-600">{c.city || c.region || "—"}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{c.country || "—"}</p>
                          </td>
                          <td className="py-5 px-3">
                             <div className="flex flex-col gap-1">
                               {c.email && (
                                 <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <p className="text-[11px] font-bold text-slate-600">{c.email}</p>
                                 </div>
                               )}
                               {c.phone && <p className="text-[10px] text-slate-400 font-medium pl-3">{c.phone}</p>}
                               {!c.email && !c.phone && <span className="text-[10px] text-slate-300 font-bold pl-3">— Sin contacto —</span>}
                             </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                             <div className="flex items-center justify-end gap-2">
                                {c.isDuplicate && (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] font-black uppercase">Existente</Badge>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                  onClick={() => removeCandidate(c.tempId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-10 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-white">
                   <div>
                      <p className="text-sm font-black">Listo para importar</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                         {candidates.filter(c => c.selected).length} prospectos seleccionados de {candidates.length} detectados.
                      </p>
                   </div>
                   <Button 
                     onClick={handleImport}
                     disabled={isImporting || candidates.filter(c => c.selected).length === 0}
                     className="h-14 px-12 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isImporting ? (
                       <>
                         <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Importando...
                       </>
                     ) : (
                       <>
                         <Download className="mr-2 h-5 w-5" /> Importar seleccionados
                       </>
                     )}
                   </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        <aside className="space-y-6 sticky top-8">
           <Card className="p-8 rounded-[2.5rem] border-slate-200 bg-white shadow-soft overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4">
                 <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">ACTIVE AGENT</Badge>
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                 <Sparkles className="h-4 w-4 text-brand-500" /> Cobertura LATAM
              </h3>
              <div className="space-y-8">
                <div className="flex gap-4">
                   <div className="h-10 w-10 shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-black text-sm border border-brand-100">01</div>
                   <div>
                      <p className="text-sm font-black text-slate-900">Búsqueda Geográfica</p>
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1">
                        Nuestro agente navega Google buscando empresas reales en el país y ciudad que elijas.
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="h-10 w-10 shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-black text-sm border border-brand-100">02</div>
                   <div>
                      <p className="text-sm font-black text-slate-900">Extracción con IA</p>
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1">
                        Analizamos los metadatos de los sitios web para encontrar emails y teléfonos de contacto.
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="h-10 w-10 shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-black text-sm border border-brand-100">03</div>
                   <div>
                      <p className="text-sm font-black text-slate-900">Validación de Leads</p>
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed mt-1">
                        Filtramos automáticamente empresas que ya son clientes o prospectos existentes.
                      </p>
                   </div>
                </div>
              </div>
           </Card>

           <Card className="p-8 rounded-[2.5rem] border-slate-200 bg-slate-900 text-white shadow-enterprise">
              <div className="flex items-center gap-2 text-brand-400 mb-4">
                <AlertCircle className="h-4 w-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Seguridad RaicesPilot</h4>
              </div>
              <ul className="text-[11px] font-bold text-slate-300 space-y-4 leading-relaxed">
                <li className="flex gap-3">
                   <div className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-1.5" />
                   <span>Los prospectos se importan como 'Pendiente'.</span>
                </li>
                <li className="flex gap-3">
                   <div className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-1.5" />
                   <span>Envío manual asistido: vos aprobás cada contacto.</span>
                </li>
                <li className="flex gap-3">
                   <div className="h-1.5 w-1.5 rounded-full bg-brand-500 mt-1.5" />
                   <span>Cumplimiento con políticas de no-spam (Link de baja automático).</span>
                </li>
              </ul>
           </Card>
        </aside>
      </div>
    </div>
  );
}
