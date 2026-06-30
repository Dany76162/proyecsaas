"use client";

import { useState } from "react";
import { ArrowLeft, Search, Loader2, MapPin, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { searchPlacesAction, importPlacesBatchAction } from "@/modules/prospecting/places-actions";

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
];

export function TerritoryExplorerForm({ placesConfigured }: { placesConfigured: boolean }) {
  const router = useRouter();
  
  const [topic, setTopic] = useState("Inmobiliarias");
  const [countryCode, setCountryCode] = useState("ar");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState("20");
  
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!topic || !city) {
      setError("Rubro y ciudad son obligatorios.");
      return;
    }
    
    setIsSearching(true);
    setError(null);
    setCandidates([]);
    
    try {
      const countryName = LATAM_COUNTRIES.find(c => c.code === countryCode)?.name || "Argentina";
      const res = await searchPlacesAction({
        topic,
        country: countryName,
        city,
        limit: parseInt(limit, 10)
      });
      
      if (res.success && res.candidates) {
        setCandidates(res.candidates);
      } else {
        setError(res.error || "Error al buscar.");
      }
    } catch (err: any) {
      setError(err.message || "Error al buscar.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCandidate = (placeId: string) => {
    setCandidates(prev => prev.map(c => 
      c.placeId === placeId && !c.isDuplicate ? { ...c, selected: !c.selected } : c
    ));
  };

  const handleImport = async () => {
    const selected = candidates.filter(c => c.selected && !c.isDuplicate);
    if (selected.length === 0) return;
    
    setIsImporting(true);
    try {
      const countryName = LATAM_COUNTRIES.find(c => c.code === countryCode)?.name || "";
      const res = await importPlacesBatchAction(selected, countryCode.toUpperCase(), "", city);
      
      if (res.success) {
        alert(`Se importaron ${res.count} prospectos correctamente.`);
        router.push("/platform/agents/prospecting");
      } else {
        setError(res.error || "Error al importar.");
      }
    } catch (err: any) {
      setError(err.message || "Error al importar.");
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = candidates.filter(c => c.selected && !c.isDuplicate).length;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Explorador Territorial</h1>
          <p className="text-slate-500 font-medium mt-1">Busca e importa empresas del sector usando Google Places.</p>
        </div>
      </div>

      {!placesConfigured && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl flex items-center gap-3 border border-amber-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">GOOGLE_PLACES_API_KEY no está configurada. La búsqueda no funcionará.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-2xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <Card className="p-6 rounded-[2rem] border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">País</label>
          <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200">
            {LATAM_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciudad o Zona</label>
          <Input 
            value={city} 
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ej: Córdoba Capital"
            className="h-12 rounded-xl bg-slate-50 border-slate-200"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rubro</label>
          <Input 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Inmobiliarias, Desarrolladoras"
            className="h-12 rounded-xl bg-slate-50 border-slate-200"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="w-32 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Límite</label>
          <Select value={limit} onChange={(e) => setLimit(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200">
            <option value="10">10</option>
            <option value="20">20</option>
          </Select>
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !city || !topic}
          className="h-12 px-8 rounded-xl bg-slate-900 text-white font-bold"
        >
          {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
          Buscar
        </Button>
      </Card>

      {candidates.length > 0 && (
        <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">
              Encontrados: {candidates.length} · Duplicados: {candidates.filter(c => c.isDuplicate).length}
            </span>
            <Button 
              onClick={handleImport}
              disabled={isImporting || selectedCount === 0}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Importar {selectedCount} prospectos
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4 w-12"></th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Dirección (Google)</th>
                  <th className="px-6 py-4">Teléfono</th>
                  <th className="px-6 py-4">Web</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => (
                  <tr key={c.placeId} className={c.isDuplicate ? "bg-slate-50/50 opacity-75" : "hover:bg-slate-50"}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={c.selected}
                        disabled={c.isDuplicate}
                        onChange={() => toggleCandidate(c.placeId)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {c.companyName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[200px]" title={c.formattedAddress}>{c.formattedAddress}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{c.phone || c.internationalPhone || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate max-w-[150px] block">
                          {c.website}
                        </a>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {c.isDuplicate ? (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200">Existente</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Nuevo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
