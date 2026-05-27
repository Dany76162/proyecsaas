"use client";

import { useState } from "react";
import { 
  Download, 
  Briefcase, 
  TrendingUp, 
  Bot, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Users,
  MessageSquare,
  HardDrive,
  ShieldCheck,
  Star,
  Banknote,
  Target,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BusinessModelPage() {
  const [activeTab, setActiveTab] = useState("resumen");

  const handleExport = () => {
    const content = `# MODELO COMERCIAL v1.0 - RaicesPilot

## 1. Resumen Ejecutivo
RaicesPilot vende una licencia base en 12 pagos. Después del mes 12, el cliente conserva de por vida el CRM, catálogo, panel y tours incluidos en su plan. Todo consumo variable, IA, WhatsApp, storage, soporte avanzado, automatizaciones, integraciones y módulos futuros se cobra aparte mediante saldo, packs, add-ons o upgrades.

Métricas clave:
- Precio fundador: $65.000 + impuestos
- Duración: 12 meses
- Cupo fundador: 100 inmobiliarias
- Conversaciones incluidas: 300/mes
- Agente incluido: 1
- Lifetime: desde mes 13

## 2. Plan Fundador
Límites y capacidades:
- 300 propiedades activas
- 50 tours 360 activos
- 10 GB storage
- 5 usuarios
- 1 agente IA
- 300 conversaciones simples

## 3. Planes & Add-ons
Planes:
- Plan Fundador: $65.000 + impuestos
- Plan Base futuro: $85.000 + impuestos
- Plan Pro: $120.000 + impuestos
- Enterprise: Cotización personalizada

Add-ons:
- Pack 500 conversaciones: $15.000 final
- Pack 1.000 conversaciones: $27.000 final
- Agente IA adicional básico: $29.000 + impuestos
- Agente IA adicional avanzado: $45.000 + impuestos
- 10 GB storage extra: $10.000 + impuestos
- Soporte premium: desde $35.000 + impuestos
- Setup inicial: $100.000
- Setup WhatsApp/Meta: $200.000 a $300.000

## 4. Licencia de por Vida
Sí queda incluido de por vida (tras mes 12):
- Acceso al CRM y Panel
- Catálogo (hasta límite del plan)
- Tours 360 (hasta límite del plan)

Nunca queda gratis de por vida:
- Consumo variable de IA (AgentOS)
- Costos de envíos WhatsApp
- Almacenamiento extra
- Módulos premium o de terceros

*Nota: No prometer todo gratis de por vida.*

## 5. Proyecciones 2026–2030
- 2026: 50 clientes, validación
- 2027: 200 clientes, escala inicial
- 2028: 450 clientes, expansión
- 2029: 750 clientes, consolidación nacional
- 2030: 1.000 clientes, escala corporativa

## 6. Reglas AgentOS
- Nunca absorber consumo variable ilimitado.
- Todo cliente debe tener margen positivo.
- Pausar IA si supera límites o no tiene saldo.
- Revisar precios cada 3 meses.
- El Plan Fundador tiene cupo máximo.
- No prometer todo gratis de por vida.
- Detectar clientes de alto consumo.
- Sugerir upsells automáticamente.

## 7. Riesgos & Alertas
Riesgos:
- IA ilimitada
- Storage ilimitado
- WhatsApp masivo/spam
- Cliente multi-marca en una cuenta
- Soporte excesivo
- Clientes lifetime sin consumo
- OpenAI sin saldo
- Inflación/costos

Alertas:
- OpenAI < USD 20
- Error 429
- Cliente cerca de 300 conversaciones
- Cliente superó storage
- Cliente superó tours
- Cliente impago
- Cloudinary al 80%
- Redis con cola alta
- Webhook Mercado Pago fallando
`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-negocio-raicespilot.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Fuerte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="border-brand-200 bg-brand-50 text-brand-700 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5">
              Panel Superadmin
            </Badge>
            <Badge variant="brand" className="text-[10px] uppercase tracking-wider px-2 py-0.5">
              MODELO COMERCIAL v1.0
            </Badge>
            <Badge variant="success" className="text-[10px] uppercase tracking-wider px-2 py-0.5">
              Activo
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-brand-600" />
            Modelo de Negocio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reglas comerciales, financieras y operativas oficiales de RaicesPilot.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleExport} 
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm h-10 px-4"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Markdown
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumen" onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b border-slate-200 pb-px mb-6 overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-6 w-max min-w-full md:min-w-0 md:w-auto border-none">
            {[
              { value: "resumen", label: "Resumen Ejecutivo" },
              { value: "fundador", label: "Plan Fundador" },
              { value: "planes", label: "Planes & Add-ons" },
              { value: "licencia", label: "Licencia de por Vida" },
              { value: "proyecciones", label: "Proyecciones 2026–2030" },
              { value: "agentos", label: "Reglas AgentOS" },
              { value: "riesgos", label: "Riesgos & Alertas" }
            ].map(tab => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value}
                className="px-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-900 bg-transparent shadow-none border-b-2 border-transparent aria-selected:text-brand-600 aria-selected:border-brand-600 rounded-none transition-all focus:outline-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          {/* TAB: Resumen Ejecutivo */}
          <TabsContent value="resumen" className="mt-0 space-y-6">
            <Card className="bg-brand-50/40 border border-brand-100 p-6 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
               <div className="relative z-10 flex gap-4 items-start">
                 <div className="bg-brand-100 p-3 rounded-xl shrink-0 text-brand-600">
                    <Star className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">Regla Maestra del Modelo</h2>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                      "RaicesPilot vende una licencia base en 12 pagos. Después del mes 12, el cliente conserva de por vida el CRM, catálogo, panel y tours incluidos en su plan. <strong className="text-slate-900 font-bold">Todo consumo variable</strong>, IA, WhatsApp, storage, soporte avanzado, automatizaciones, integraciones y módulos futuros <strong className="text-brand-600 font-bold">se cobra aparte</strong> mediante saldo, packs, add-ons o upgrades."
                    </p>
                 </div>
               </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Precio Fundador</p>
                 <p className="text-xl sm:text-2xl font-black text-emerald-600 flex items-center gap-2"><Banknote className="w-5 h-5"/> $65.000 <span className="text-xs text-slate-400 font-normal">+ imp</span></p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Duración</p>
                 <p className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><Target className="w-5 h-5 text-indigo-500"/> 12 meses</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cupo Fundador</p>
                 <p className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-brand-600"/> 100 inmob.</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Conversaciones Incluidas</p>
                 <p className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-500"/> 300 / mes</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Agente IA Incluido</p>
                 <p className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><Bot className="w-5 h-5 text-violet-500"/> 1 base</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Licencia Vitalicia</p>
                 <p className="text-xl sm:text-2xl font-black text-amber-600 flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Desde mes 13</p>
               </Card>
            </div>
          </TabsContent>
          
          {/* TAB: Plan Fundador */}
          <TabsContent value="fundador" className="mt-0 space-y-6">
             <Card className="bg-white border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                 <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                       <Star className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Ficha: Plan Fundador</h2>
                      <p className="text-sm text-slate-500">Estructura base para los primeros 100 clientes.</p>
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                   <div>
                     <h3 className="text-base font-extrabold text-emerald-600 mb-4 flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5" /> Incluye (Límites)
                     </h3>
                     <ul className="space-y-3">
                       <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>300</strong> propiedades activas</span></li>
                       <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>50</strong> tours 360 activos</span></li>
                       <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>10 GB</strong> almacenamiento (storage)</span></li>
                       <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>5</strong> usuarios de sistema</span></li>
                       <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>1</strong> Agente IA básico</span></li>
                       <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>300</strong> conversaciones simples por mes</span></li>
                     </ul>
                   </div>

                   <div>
                     <h3 className="text-base font-extrabold text-rose-500 mb-4 flex items-center gap-2">
                       <XCircle className="w-5 h-5" /> No incluye
                     </h3>
                     <ul className="space-y-3">
                       <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Agentes IA adicionales o avanzados</li>
                       <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Consumo ilimitado de IA</li>
                       <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Setup personalizado en sucursal</li>
                       <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Costos de línea oficial de WhatsApp</li>
                       <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Storage extra para archivos pesados</li>
                     </ul>
                   </div>
                 </div>
              </Card>
          </TabsContent>
          
          {/* TAB: Planes & Add-ons */}
          <TabsContent value="planes" className="mt-0 space-y-6">
             <Card className="bg-white border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-150 bg-slate-50/70">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-brand-600" /> Roadmap de Planes
                  </h2>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="px-5 font-bold">Plan</TableHead>
                      <TableHead className="px-5 font-bold">Precio (ARS)</TableHead>
                      <TableHead className="px-5 font-bold">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-900 px-5">Plan Fundador</TableCell>
                      <TableCell className="text-emerald-600 font-extrabold px-5">$65.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="success">Actual</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Plan Base futuro</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$85.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="neutral">Futuro</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Plan Pro</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$120.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="neutral">Futuro</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Enterprise</TableCell>
                      <TableCell className="text-slate-600 px-5">Cotización personalizada</TableCell>
                      <TableCell className="px-5"><Badge variant="outline">Bajo demanda</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </Card>

             <Card className="bg-white border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-150 bg-slate-50/70">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" /> Catálogo de Add-ons (Upsells)
                  </h2>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="px-5 font-bold">Add-on / Módulo</TableHead>
                      <TableHead className="px-5 font-bold">Precio (ARS)</TableHead>
                      <TableHead className="px-5 font-bold">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-900 px-5">Pack 500 conversaciones</TableCell>
                      <TableCell className="text-brand-600 font-extrabold px-5">$15.000 <span className="text-slate-400 text-xs font-normal">final</span></TableCell>
                      <TableCell className="px-5"><Badge variant="info">Consumo IA</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-900 px-5">Pack 1.000 conversaciones</TableCell>
                      <TableCell className="text-brand-600 font-extrabold px-5">$27.000 <span className="text-slate-400 text-xs font-normal">final</span></TableCell>
                      <TableCell className="px-5"><Badge variant="info">Consumo IA</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Agente IA adicional básico</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$29.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="outline">Módulo</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Agente IA adicional avanzado</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$45.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="outline">Módulo</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">10 GB storage extra</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$10.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="warning">Infraestructura</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Soporte premium</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">desde $35.000 <span className="text-slate-400 text-xs font-normal">+ imp</span></TableCell>
                      <TableCell className="px-5"><Badge variant="outline">Servicio</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Setup inicial</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$100.000</TableCell>
                      <TableCell className="px-5"><Badge variant="neutral">One-time</Badge></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/30">
                      <TableCell className="font-extrabold text-slate-700 px-5">Setup WhatsApp/Meta oficial</TableCell>
                      <TableCell className="text-slate-900 font-bold px-5">$200.000 a $300.000</TableCell>
                      <TableCell className="px-5"><Badge variant="neutral">One-time</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </Card>
          </TabsContent>

          {/* TAB: Licencia */}
          <TabsContent value="licencia" className="mt-0 space-y-6">
            <Card className="bg-white border border-slate-200/60 p-6 sm:p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                 <ShieldCheck className="w-8 h-8 text-amber-500" />
                 <div>
                   <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Licencia de por Vida</h2>
                   <p className="text-sm text-slate-500">Reglas aplicables a clientes con 12 meses pagos consecutivos.</p>
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                 <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-xl">
                   <h3 className="text-emerald-700 font-extrabold text-sm sm:text-base mb-4 flex items-center gap-2">
                     <CheckCircle2 className="w-5 h-5 text-emerald-600"/> Sí queda incluido de por vida
                   </h3>
                   <ul className="space-y-3.5">
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Acceso irrestricto al CRM y Panel Admin.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Gestión del catálogo inmobiliario (hasta el límite de su plan, ej: 300 props).</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Uso de cámara 360 y creación de tours (hasta el límite de su plan, ej: 50 tours).</span>
                     </li>
                   </ul>
                 </div>

                 <div className="bg-rose-50/40 border border-rose-100 p-5 rounded-xl">
                   <h3 className="text-rose-700 font-extrabold text-sm sm:text-base mb-4 flex items-center gap-2">
                     <XCircle className="w-5 h-5 text-rose-600"/> Nunca queda gratis de por vida
                   </h3>
                   <ul className="space-y-3.5">
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Consumo de Inteligencia Artificial (AgentOS). Todo token tiene costo.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Costos de envío/recepción de WhatsApp si se usa API oficial.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Almacenamiento extra fuera de los GB base de su plan.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Módulos premium futuros o integraciones de terceros.</span>
                     </li>
                   </ul>
                 </div>
               </div>

               <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-4 items-center">
                 <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                 <p className="text-amber-800 text-sm font-semibold">
                   Aclaración comercial estricta: <span className="text-amber-900 font-normal">"No prometer todo gratis de por vida bajo ninguna circunstancia. Solo la capa de software (SaaS) base es vitalicia."</span>
                 </p>
               </div>
            </Card>
          </TabsContent>

          {/* TAB: Proyecciones */}
          <TabsContent value="proyecciones" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
               <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-soft transition-all">
                 <div>
                   <Badge variant="outline" className="mb-2 text-[10px] border-slate-200 bg-slate-50 text-slate-600 font-bold">2026</Badge>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Validación</p>
                   <p className="text-2xl font-black text-slate-900 mb-2">50 <span className="text-xs font-normal text-slate-450">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-500">Captación inicial y early adopters.</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-soft transition-all">
                 <div>
                   <Badge variant="outline" className="mb-2 text-[10px] border-slate-250 bg-slate-50 text-slate-600 font-bold">2027</Badge>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Escala inicial</p>
                   <p className="text-2xl font-black text-brand-600 mb-2">200 <span className="text-xs font-normal text-slate-450">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-500">Estabilización AgentOS.</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-soft transition-all">
                 <div>
                   <Badge variant="outline" className="mb-2 text-[10px] border-slate-250 bg-slate-50 text-slate-600 font-bold">2028</Badge>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Expansión</p>
                   <p className="text-2xl font-black text-indigo-650 mb-2">450 <span className="text-xs font-normal text-slate-450">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-500">Lanzamiento masivo add-ons.</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-soft transition-all">
                 <div>
                   <Badge variant="outline" className="mb-2 text-[10px] border-slate-250 bg-slate-50 text-slate-600 font-bold">2029</Badge>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nacional</p>
                   <p className="text-2xl font-black text-indigo-700 mb-2">750 <span className="text-xs font-normal text-slate-450">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-500">Consolidación mercado local.</p>
               </Card>
               <Card className="bg-emerald-50/20 border border-emerald-200 p-5 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-soft transition-all">
                 <div>
                   <Badge variant="success" className="mb-2 text-[10px] font-bold px-2">2030</Badge>
                   <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Corporativa</p>
                   <p className="text-2xl font-black text-slate-900 mb-2">1.000 <span className="text-xs font-normal text-slate-550">clientes</span></p>
                 </div>
                 <p className="text-xs text-emerald-800">Escala masiva y regional.</p>
               </Card>
            </div>
          </TabsContent>

          {/* TAB: Reglas */}
          <TabsContent value="agentos" className="mt-0 space-y-6">
            <Card className="bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                 <Bot className="w-8 h-8 text-violet-600" />
                 <div>
                   <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Reglas Críticas de AgentOS</h2>
                   <p className="text-sm text-slate-500">Directivas inmutables para la IA que opera el sistema.</p>
                 </div>
               </div>

               <div className="grid gap-4 md:grid-cols-2">
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">1. Límites Estrictos</h4>
                   <p className="text-xs text-slate-650 leading-relaxed">Nunca absorber consumo variable ilimitado. Toda API cuesta dinero.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">2. Margen Positivo</h4>
                   <p className="text-xs text-slate-650 leading-relaxed">Todo cliente debe generar un margen positivo al final del mes.</p>
                 </div>
                 <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200">
                   <h4 className="font-extrabold text-rose-700 text-sm mb-1">3. Pausa Automática</h4>
                   <p className="text-xs text-rose-850 leading-relaxed">Pausar servicios IA inmediatamente si el cliente supera límites o no tiene saldo.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">4. Revisión Trimestral</h4>
                   <p className="text-xs text-slate-650 leading-relaxed">Revisar precios de planes y add-ons cada 3 meses contra la inflación y costos API.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">5. Control de Cupo</h4>
                   <p className="text-xs text-slate-650 leading-relaxed">El Plan Fundador tiene cupo máximo. No sobre-vender licencias vitalicias.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">6. Transparencia</h4>
                   <p className="text-xs text-slate-650 leading-relaxed">No prometer "todo gratis de por vida". Aclarar qué es base y qué es variable.</p>
                 </div>
                 <div className="bg-brand-50/50 p-5 rounded-xl border border-brand-200 md:col-span-2">
                   <h4 className="font-extrabold text-brand-850 text-sm mb-1">7. Upselling Proactivo</h4>
                   <p className="text-xs text-brand-900 leading-relaxed">Detectar clientes de alto consumo y sugerir upsells o recargas automáticamente.</p>
                 </div>
               </div>
            </Card>
          </TabsContent>

          {/* TAB: Riesgos */}
          <TabsContent value="riesgos" className="mt-0 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Matriz de Riesgos */}
              <Card className="bg-white border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500" /> Matriz de Riesgos
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">IA ilimitada</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Storage ilimitado</span>
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">WhatsApp masivo/spam</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Inflación / Costos API</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Clientes lifetime sin consumo</span>
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Soporte excesivo</span>
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">OpenAI sin saldo</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Cliente multi-marca en 1 cuenta</span>
                    <Badge variant="info" className="text-[10px] font-extrabold uppercase">Bajo</Badge>
                  </li>
                </ul>
              </Card>

              {/* Alertas Operativas */}
              <Card className="bg-white border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Alertas del Sistema
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-amber-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <HardDrive className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">OpenAI &lt; USD 20</p>
                      <p className="text-xs text-slate-500">Recargar saldo en plataforma OpenAI.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-rose-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Error 429 (Rate Limit)</p>
                      <p className="text-xs text-slate-500">Cuellos de botella en peticiones a LLM.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-brand-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <MessageSquare className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cliente cerca de 300 convers.</p>
                      <p className="text-xs text-slate-500">Disparar email de upsell automático.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-indigo-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <HardDrive className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cliente superó storage / tours</p>
                      <p className="text-xs text-slate-500">Bloquear nuevas subidas de imágenes.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-amber-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <HardDrive className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cloudinary al 80%</p>
                      <p className="text-xs text-slate-500">Revisar plan global de CDN.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-rose-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Redis o Webhooks fallando</p>
                      <p className="text-xs text-slate-500">Chequear logs y MP pagos.</p>
                    </div>
                  </li>
                </ul>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
