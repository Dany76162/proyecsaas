import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Phone, Globe, CheckCircle2, Ruler, Maximize } from "lucide-react";

export default async function FichaLotePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;

  const lotRaw = await prisma.developmentLot.findUnique({
    where: { id: lotId },
    include: {
      Development: {
        include: { Organization: true }
      }
    }
  });

  if (!lotRaw) notFound();

  const lot = {
    ...lotRaw,
    development: {
      ...lotRaw.Development,
      organization: lotRaw.Development.Organization,
    },
  };

  const dev = lot.development;
  const themeColor = dev.themeColor || "#0D9488";
  
  // Format numbers securely
  const formatNum = (num: number | null | undefined) => (num != null ? num.toLocaleString() : "—");

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-8 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-[794px] min-h-[1123px] shadow-2xl relative overflow-hidden print:shadow-none print:w-full print:max-w-full">
        {/* Print Button (Hidden in print) */}
        <div className="absolute top-4 right-4 print:hidden z-50">
          <button 
            onClick={() => { if (typeof window !== "undefined") window.print(); }}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800 transition"
          >
            Imprimir / Guardar PDF
          </button>
        </div>

        {/* ── HEADER ── */}
        <div 
          className="relative h-48 md:h-64 flex items-end p-8"
          style={{ backgroundColor: themeColor }}
        >
          {dev.logoUrl && (
            <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <img src={dev.logoUrl} alt={dev.name} className="h-16 md:h-20 object-contain" />
            </div>
          )}
          
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{dev.name}</h1>
            <p className="text-white/80 font-medium flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" />
              {[dev.address, dev.city, dev.province].filter(Boolean).join(", ")}
            </p>
          </div>

          {/* Deco Shape */}
          <svg className="absolute bottom-0 right-0 h-full text-white/10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100" fill="currentColor" />
          </svg>
        </div>

        {/* ── BODY ── */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Lote Info Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 text-center">Ficha Técnica del Lote</h2>
            
            <div className="flex justify-center mb-6">
              <div 
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg"
                style={{ backgroundColor: themeColor }}
              >
                {lot.lotNumber}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-2"><Maximize className="w-4 h-4"/> Superficie</span>
                <span className="font-black text-lg text-slate-800">{formatNum(lot.areaSqm)} m²</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-2"><Ruler className="w-4 h-4"/> Frente</span>
                <span className="font-bold text-slate-700">{formatNum(lot.frontMeters)} m</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold flex items-center gap-2"><Ruler className="w-4 h-4"/> Fondo</span>
                <span className="font-bold text-slate-700">{formatNum(lot.backMeters)} m</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Manzana</span>
                <span className="font-bold text-slate-700">{lot.manzana || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Destino</span>
                <span className="font-bold text-slate-700 capitalize">{lot.destino || "Residencial"}</span>
              </div>
            </div>
          </div>

          {/* Plan Image */}
          <div className="flex flex-col gap-4">
            {dev.brochurePlanUrl ? (
              <div className="w-full aspect-[4/3] relative rounded-2xl border-4 border-slate-100 overflow-hidden shadow-sm bg-white flex items-center justify-center">
                {dev.brochurePlanUrl.endsWith(".pdf") ? (
                   <iframe src={dev.brochurePlanUrl} className="w-full h-full" />
                ) : (
                  <img src={dev.brochurePlanUrl} alt="Plano" className="w-full h-full object-cover" />
                )}
              </div>
            ) : (
              <div className="w-full aspect-[4/3] rounded-2xl border-4 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400 font-medium text-sm">
                Plano no disponible
              </div>
            )}

            {/* Services */}
            {dev.services && dev.services.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider">Servicios</h3>
                <div className="grid grid-cols-2 gap-2">
                  {dev.services.map(s => (
                    <div key={s} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: themeColor }} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="absolute bottom-0 w-full bg-slate-900 text-slate-300 p-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {dev.companyLogoUrl && (
              <img src={dev.companyLogoUrl} alt="Inmobiliaria" className="h-10 object-contain filter grayscale brightness-200 opacity-80" />
            )}
            <div className="flex flex-col gap-1 border-l border-slate-700 pl-6">
              {dev.contactPhone && (
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {dev.contactPhone}
                </div>
              )}
              {dev.contactWeb && (
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  {dev.contactWeb}
                </div>
              )}
              {dev.contactAddress && (
                <div className="flex items-center gap-2 text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {dev.contactAddress}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Desarrollado por</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">{dev.organization.name}</p>
          </div>
        </div>

      </div>
      
      {/* Global Print Styles to ensure A4 rendering */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
