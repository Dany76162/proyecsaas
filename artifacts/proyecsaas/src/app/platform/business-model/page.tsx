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
    <div className="space-y-8 pb-20 max-w-6xl mx-auto px-2">
      {/* Header Fuerte */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="brand">MODELO COMERCIAL v1.0</Badge>
            <Badge variant="success">Activo</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-brand-400" />
            Modelo de Negocio
          </h1>
          <p className="mt-2 text-base text-slate-400">
            Reglas comerciales, financieras y operativas oficiales de RaicesPilot.
          </p>
        </div>
        <Button 
          onClick={handleExport} 
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm border border-brand-500/50"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar Markdown
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumen" onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-0 border-b border-slate-800">
          <TabsList className="bg-transparent h-auto p-0 flex gap-6 w-max min-w-full">
            <TabsTrigger 
              value="resumen" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Resumen Ejecutivo
            </TabsTrigger>
            <TabsTrigger 
              value="fundador" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Plan Fundador
            </TabsTrigger>
            <TabsTrigger 
              value="planes" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Planes & Add-ons
            </TabsTrigger>
            <TabsTrigger 
              value="licencia" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Licencia de por Vida
            </TabsTrigger>
            <TabsTrigger 
              value="proyecciones" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Proyecciones 2026–2030
            </TabsTrigger>
            <TabsTrigger 
              value="agentos" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Reglas AgentOS
            </TabsTrigger>
            <TabsTrigger 
              value="riesgos" 
              className="px-1 py-3 text-sm font-semibold text-slate-400 data-[state=active]:text-brand-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-400 rounded-none transition-all"
            >
              Riesgos & Alertas
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-8">
          {/* TAB: Resumen Ejecutivo */}
          <TabsContent value="resumen" className="mt-0 space-y-8">
            <Card className="bg-slate-900 border border-brand-500/30 p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
               <div className="relative z-10 flex gap-4 items-start">
                 <div className="bg-brand-500/20 p-3 rounded-xl shrink-0">
                    <Star className="w-6 h-6 text-brand-400" />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-white mb-2">Regla Maestra del Modelo</h2>
                   <p className="text-lg text-slate-300 leading-relaxed font-medium">
                     "RaicesPilot vende una licencia base en 12 pagos. Después del mes 12, el cliente conserva de por vida el CRM, catálogo, panel y tours incluidos en su plan. <strong className="text-white">Todo consumo variable</strong>, IA, WhatsApp, storage, soporte avanzado, automatizaciones, integraciones y módulos futuros <strong className="text-brand-400">se cobra aparte</strong> mediante saldo, packs, add-ons o upgrades."
                   </p>
                 </div>
               </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <Card className="bg-slate-900/50 border border-white/5 p-5">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Precio Fundador</p>
                 <p className="text-2xl font-bold text-emerald-400 flex items-center gap-2"><Banknote className="w-5 h-5"/> $65.000 <span className="text-xs text-slate-500">+ imp</span></p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Duración</p>
                 <p className="text-2xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-indigo-400"/> 12 meses</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Cupo Fundador</p>
                 <p className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-brand-400"/> 100 inmob.</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Conversaciones Incluidas</p>
                 <p className="text-2xl font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-400"/> 300 / mes</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Agente IA Incluido</p>
                 <p className="text-2xl font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-violet-400"/> 1 base</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Licencia Vitalicia</p>
                 <p className="text-2xl font-bold text-amber-400 flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> Desde mes 13</p>
               </Card>
            </div>
          </TabsContent>
          
          {/* TAB: Plan Fundador */}
          <TabsContent value="fundador" className="mt-0 space-y-6">
             <Card className="bg-slate-900/50 border border-emerald-500/20 p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                   <div className="bg-emerald-500/20 p-3 rounded-xl">
                      <Star className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-white">Ficha: Plan Fundador</h2>
                     <p className="text-slate-400">Estructura base para los primeros 100 clientes.</p>
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Incluye (Límites)
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> <strong>300</strong> propiedades activas</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> <strong>50</strong> tours 360 activos</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> <strong>10 GB</strong> almacenamiento (storage)</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> <strong>5</strong> usuarios de sistema</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> <strong>1</strong> Agente IA básico</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> <strong>300</strong> conversaciones simples por mes</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-rose-400 mb-4 flex items-center gap-2">
                      <XCircle className="w-5 h-5" /> No incluye
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Agentes IA adicionales o avanzados</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Consumo ilimitado de IA</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Setup personalizado en sucursal</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Costos de línea oficial de WhatsApp</li>
                      <li className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Storage extra para archivos pesados</li>
                    </ul>
                  </div>
                </div>
             </Card>
          </TabsContent>
          
          {/* TAB: Planes & Add-ons */}
          <TabsContent value="planes" className="mt-0 space-y-8">
             <Card className="bg-slate-900/50 border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-slate-800/50">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-brand-400" /> Roadmap de Planes
                  </h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Precio (ARS)</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-bold text-white">Plan Fundador</TableCell>
                      <TableCell className="text-emerald-400 font-mono">$65.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="success">Actual</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Plan Base futuro</TableCell>
                      <TableCell className="text-slate-300 font-mono">$85.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="neutral">Futuro</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Plan Pro</TableCell>
                      <TableCell className="text-slate-300 font-mono">$120.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="neutral">Futuro</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Enterprise</TableCell>
                      <TableCell className="text-slate-300 font-mono">Cotización personalizada</TableCell>
                      <TableCell><Badge variant="neutral">Bajo demanda</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </Card>

             <Card className="bg-slate-900/50 border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-slate-800/50">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" /> Catálogo de Add-ons (Upsells)
                  </h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Add-on / Módulo</TableHead>
                      <TableHead>Precio (ARS)</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-bold text-white">Pack 500 conversaciones</TableCell>
                      <TableCell className="text-brand-400 font-mono">$15.000 <span className="text-slate-500 text-xs">final</span></TableCell>
                      <TableCell><Badge variant="info">Consumo IA</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Pack 1.000 conversaciones</TableCell>
                      <TableCell className="text-brand-400 font-mono">$27.000 <span className="text-slate-500 text-xs">final</span></TableCell>
                      <TableCell><Badge variant="info">Consumo IA</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Agente IA adicional básico</TableCell>
                      <TableCell className="text-slate-300 font-mono">$29.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="outline">Módulo</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Agente IA adicional avanzado</TableCell>
                      <TableCell className="text-slate-300 font-mono">$45.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="outline">Módulo</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">10 GB storage extra</TableCell>
                      <TableCell className="text-slate-300 font-mono">$10.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="warning">Infraestructura</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Soporte premium</TableCell>
                      <TableCell className="text-slate-300 font-mono">desde $35.000 <span className="text-slate-500 text-xs">+ imp</span></TableCell>
                      <TableCell><Badge variant="outline">Servicio</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Setup inicial</TableCell>
                      <TableCell className="text-slate-300 font-mono">$100.000</TableCell>
                      <TableCell><Badge variant="neutral">One-time</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-white">Setup WhatsApp/Meta oficial</TableCell>
                      <TableCell className="text-slate-300 font-mono">$200.000 a $300.000</TableCell>
                      <TableCell><Badge variant="neutral">One-time</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </Card>
          </TabsContent>

          {/* TAB: Licencia */}
          <TabsContent value="licencia" className="mt-0 space-y-6">
            <Card className="bg-slate-900/50 border border-white/5 p-8">
               <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                 <ShieldCheck className="w-8 h-8 text-amber-400" />
                 <div>
                   <h2 className="text-2xl font-bold text-white">Licencia de por Vida</h2>
                   <p className="text-slate-400">Reglas aplicables a clientes con 12 meses pagos consecutivos.</p>
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                 <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl">
                   <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                     <CheckCircle2 className="w-5 h-5"/> Sí queda incluido de por vida
                   </h3>
                   <ul className="space-y-4">
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Acceso irrestricto al CRM y Panel Admin.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Gestión del catálogo inmobiliario (hasta el límite de su plan, ej: 300 props).</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Uso de cámara 360 y creación de tours (hasta el límite de su plan, ej: 50 tours).</span>
                     </li>
                   </ul>
                 </div>

                 <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-2xl">
                   <h3 className="text-rose-400 font-bold mb-4 flex items-center gap-2">
                     <XCircle className="w-5 h-5"/> Nunca queda gratis de por vida
                   </h3>
                   <ul className="space-y-4">
                     <li className="flex items-start gap-3">
                       <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Consumo de Inteligencia Artificial (AgentOS). Todo token tiene costo.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Costos de envío/recepción de WhatsApp si se usa API oficial.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Almacenamiento extra fuera de los GB base de su plan.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                       <span className="text-slate-300 text-sm">Módulos premium futuros o integraciones de terceros.</span>
                     </li>
                   </ul>
                 </div>
               </div>

               <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-4 items-center">
                 <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                 <p className="text-amber-200 text-sm font-semibold">
                   Aclaración comercial estricta: <span className="text-amber-100 font-normal">"No prometer todo gratis de por vida bajo ninguna circunstancia. Solo la capa de software (SaaS) base es vitalicia."</span>
                 </p>
               </div>
            </Card>
          </TabsContent>

          {/* TAB: Proyecciones */}
          <TabsContent value="proyecciones" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
               <Card className="bg-slate-900/50 border border-white/5 p-5 flex flex-col justify-between min-h-[160px]">
                 <div>
                   <Badge variant="neutral" className="mb-2">2026</Badge>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Validación</p>
                   <p className="text-3xl font-bold text-white mb-2">50 <span className="text-sm font-normal text-slate-500">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-400">Captación inicial y early adopters.</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5 flex flex-col justify-between min-h-[160px]">
                 <div>
                   <Badge variant="neutral" className="mb-2">2027</Badge>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Escala inicial</p>
                   <p className="text-3xl font-bold text-brand-400 mb-2">200 <span className="text-sm font-normal text-slate-500">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-400">Estabilización AgentOS.</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5 flex flex-col justify-between min-h-[160px]">
                 <div>
                   <Badge variant="neutral" className="mb-2">2028</Badge>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Expansión</p>
                   <p className="text-3xl font-bold text-brand-300 mb-2">450 <span className="text-sm font-normal text-slate-500">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-400">Lanzamiento masivo add-ons.</p>
               </Card>
               <Card className="bg-slate-900/50 border border-white/5 p-5 flex flex-col justify-between min-h-[160px]">
                 <div>
                   <Badge variant="neutral" className="mb-2">2029</Badge>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Nacional</p>
                   <p className="text-3xl font-bold text-indigo-400 mb-2">750 <span className="text-sm font-normal text-slate-500">clientes</span></p>
                 </div>
                 <p className="text-xs text-slate-400">Consolidación mercado local.</p>
               </Card>
               <Card className="bg-slate-900/50 border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col justify-between min-h-[160px]">
                 <div>
                   <Badge variant="success" className="mb-2 bg-emerald-500 text-white border-none">2030</Badge>
                   <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Corporativa</p>
                   <p className="text-3xl font-bold text-white mb-2">1.000 <span className="text-sm font-normal text-emerald-500">clientes</span></p>
                 </div>
                 <p className="text-xs text-emerald-200/70">Escala masiva y regional.</p>
               </Card>
            </div>
          </TabsContent>

          {/* TAB: Reglas */}
          <TabsContent value="agentos" className="mt-0 space-y-6">
            <Card className="bg-slate-900/50 border border-violet-500/30 p-8 shadow-xl">
               <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
                 <Bot className="w-8 h-8 text-violet-400" />
                 <div>
                   <h2 className="text-2xl font-bold text-white">Reglas Críticas de AgentOS</h2>
                   <p className="text-slate-400">Directivas inmutables para la IA que opera el sistema.</p>
                 </div>
               </div>

               <div className="grid gap-4 md:grid-cols-2">
                 <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-2">1. Límites Estrictos</h4>
                   <p className="text-sm text-slate-300">Nunca absorber consumo variable ilimitado. Toda API cuesta dinero.</p>
                 </div>
                 <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-2">2. Margen Positivo</h4>
                   <p className="text-sm text-slate-300">Todo cliente debe generar un margen positivo al final del mes.</p>
                 </div>
                 <div className="bg-rose-500/10 p-5 rounded-xl border border-rose-500/20">
                   <h4 className="font-bold text-rose-400 mb-2">3. Pausa Automática</h4>
                   <p className="text-sm text-rose-200">Pausar servicios IA inmediatamente si el cliente supera límites o no tiene saldo.</p>
                 </div>
                 <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-2">4. Revisión Trimestral</h4>
                   <p className="text-sm text-slate-300">Revisar precios de planes y add-ons cada 3 meses contra la inflación y costos API.</p>
                 </div>
                 <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-2">5. Control de Cupo</h4>
                   <p className="text-sm text-slate-300">El Plan Fundador tiene cupo máximo. No sobre-vender licencias vitalicias.</p>
                 </div>
                 <div className="bg-slate-800/50 p-5 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-2">6. Transparencia</h4>
                   <p className="text-sm text-slate-300">No prometer "todo gratis de por vida". Aclarar qué es base y qué es variable.</p>
                 </div>
                 <div className="bg-brand-500/10 p-5 rounded-xl border border-brand-500/20">
                   <h4 className="font-bold text-brand-400 mb-2">7. Upselling Proactivo</h4>
                   <p className="text-sm text-brand-200">Detectar clientes de alto consumo y sugerir upsells o recargas automáticamente.</p>
                 </div>
               </div>
            </Card>
          </TabsContent>

          {/* TAB: Riesgos */}
          <TabsContent value="riesgos" className="mt-0 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Matriz de Riesgos */}
              <Card className="bg-slate-900/50 border border-rose-500/20 p-6 overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" /> Matriz de Riesgos
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">IA ilimitada</span>
                    <Badge variant="danger">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">Storage ilimitado</span>
                    <Badge variant="warning">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">WhatsApp masivo/spam</span>
                    <Badge variant="danger">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">Inflación / Costos API</span>
                    <Badge variant="danger">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">Clientes lifetime sin consumo</span>
                    <Badge variant="warning">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">Soporte excesivo</span>
                    <Badge variant="warning">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">OpenAI sin saldo</span>
                    <Badge variant="danger">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm font-semibold text-slate-300">Cliente multi-marca en 1 cuenta</span>
                    <Badge variant="info">Bajo</Badge>
                  </li>
                </ul>
              </Card>

              {/* Alertas Operativas */}
              <Card className="bg-slate-900/50 border border-amber-500/20 p-6 overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Alertas del Sistema
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start p-3 bg-slate-800/50 border-l-2 border-amber-500 rounded-r-lg">
                    <HardDrive className="w-4 h-4 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">OpenAI &lt; USD 20</p>
                      <p className="text-xs text-slate-400">Recargar saldo en plataforma OpenAI.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-800/50 border-l-2 border-rose-500 rounded-r-lg">
                    <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">Error 429 (Rate Limit)</p>
                      <p className="text-xs text-slate-400">Cuellos de botella en peticiones a LLM.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-800/50 border-l-2 border-brand-500 rounded-r-lg">
                    <MessageSquare className="w-4 h-4 text-brand-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">Cliente cerca de 300 convers.</p>
                      <p className="text-xs text-slate-400">Disparar email de upsell automático.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-800/50 border-l-2 border-indigo-500 rounded-r-lg">
                    <HardDrive className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">Cliente superó storage / tours</p>
                      <p className="text-xs text-slate-400">Bloquear nuevas subidas de imágenes.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-800/50 border-l-2 border-amber-500 rounded-r-lg">
                    <HardDrive className="w-4 h-4 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">Cloudinary al 80%</p>
                      <p className="text-xs text-slate-400">Revisar plan global de CDN.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-800/50 border-l-2 border-rose-500 rounded-r-lg">
                    <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">Redis o Webhooks fallando</p>
                      <p className="text-xs text-slate-400">Chequear logs y MP pagos.</p>
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
