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
  Zap,
  Globe,
  BarChart3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BusinessModelPage() {
  const [activeTab, setActiveTab] = useState("resumen");

  const handleExport = () => {
    const content = `# MODELO COMERCIAL v1.0 - Raíces Pilot
(Documento interno confidencial — No difundir públicamente)

## 1. Resumen Ejecutivo
Raíces Pilot comercializa una licencia base financiada en 12 cuotas mensuales consecutivas. A partir del mes 13, el cliente accede a una Licencia Vitalicia (Lifetime) sobre el software base, conservando acceso irrestricto al CRM, catálogo inmobiliario, panel de administración y tours virtuales creados bajo los límites de su plan. Todo consumo variable derivado de APIs (Inteligencia Artificial, envíos de WhatsApp, almacenamiento extra de imágenes/videos, soporte avanzado personalizado, integraciones de terceros y complementos futuros) se factura por separado mediante saldo prepago, recarga de packs de mensajes o upgrades de plan.

Métricas clave:
- Precio fundador: $65.000 + impuestos (ARS)
- Duración de cuotas: 12 meses
- Cupo fundador: primeras 100 inmobiliarias (beneficio de lanzamiento limitado)
- Conversaciones incluidas: 300 mensuales
- Agentes de IA incluidos: 1 agente base
- Licencia vitalicia base: Activa automáticamente desde el mes 13

## 2. Plan Fundador
Límites y capacidades operativas (exclusivos para el cupo de lanzamiento de las primeras 100 inmobiliarias):
- 300 propiedades activas en inventario
- 50 tours virtuales 360° activos
- 10 GB de almacenamiento en la nube (Cloud storage)
- 5 usuarios de sistema concurrentes
- 1 Agente de IA básico cualificador
- 300 conversaciones simples mensuales vía IA

Exclusiones explícitas (se facturan como complementos):
- Agentes de IA adicionales o perfiles avanzados
- Consumo ilimitado de procesamiento de IA
- Configuración (setup) personalizada en sucursales físicas
- Costos de mantenimiento de la línea oficial de WhatsApp (Meta)
- Almacenamiento extra para archivos multimedia pesados

## 3. Planes & Complementos (Add-ons)
Roadmap de Planes (para contrataciones posteriores al cupo fundador):
- Plan Fundador: $65.000 + impuestos (primeras 100 inmobiliarias)
- Plan Base futuro: $85.000 + impuestos (después del cupo)
- Plan Pro futuro: $120.000 + impuestos
- Plan Enterprise: Cotización a medida bajo demanda

Catálogo de Complementos (Add-ons / Upsells):
- Pack 500 conversaciones de IA: $15.000 final (consumo prepago)
- Pack 1.000 conversaciones de IA: $27.000 final (consumo prepago)
- Agente de IA adicional básico: $29.000 + impuestos mensuales
- Agente de IA adicional avanzado: $45.000 + impuestos mensuales
- 10 GB de almacenamiento extra: $10.000 + impuestos mensuales
- Soporte premium prioritario: desde $35.000 + impuestos mensuales
- Configuración inicial (Setup): $100.000 (pago único)
- Setup WhatsApp/Meta oficial: $200.000 a $300.000 (pago único)

## 4. Licencia de por Vida (Lifetime)
Sí queda incluido de por vida (desde el mes 13 con pagos al día):
- Acceso completo y continuo al CRM y Panel de administración.
- Gestión del catálogo inmobiliario base (hasta 300 propiedades).
- Visualización y creación de tours 360° (hasta 50 tours activos).

Nunca queda gratis de por vida (siempre se cobra por consumo o mantenimiento):
- Procesamiento de IA conversacional (AgentOS). Todo token de OpenAI tiene un coste variable asociado.
- Costos de envíos y recepción de mensajes de WhatsApp oficiales cobrados directamente por Meta.
- Almacenamiento multimedia extra por encima de los 10 GB provistos por el plan.
- Módulos premium futuros o integraciones de terceros.

*Aclaración comercial estricta: Bajo ninguna circunstancia prometer "todo gratis de por vida". La gratuidad vitalicia se restringe exclusivamente al software SaaS de base.*

## 5. Expansión Regional 2026–2030: Argentina → LATAM
- 2026 — Argentina / Lanzamiento Fundador:
  * Meta mínima viable: 50 inmobiliarias
  * Meta objetivo: 200 inmobiliarias
  * Meta agresiva (crecimiento anual): 500 inmobiliarias
  * Foco: Validación integral del modelo, captación de fundadores, demostraciones asistidas, optimización del onboarding y generación de casos de éxito sólidos.
  * Responsable operativo: CEO de IA + Área de Marketing
- 2027 — Argentina fuerte + primeras pruebas LATAM:
  * Meta acumulada: 1.500 inmobiliarias
  * Foco: Dominio en ciudades clave del Cono Sur e inicio de pruebas piloto en Uruguay, Paraguay y Chile.
- 2028 — Expansión regional:
  * Meta acumulada: 3.500 inmobiliarias
  * Foco: Apertura oficial en Uruguay, Paraguay, Chile, Bolivia y Perú con medios de pago locales integrados.
- 2029 — Consolidación LATAM:
  * Meta acumulada: 6.500 inmobiliarias
  * Foco: Escalar en mercados maduros y penetración en Colombia y México.
- 2030 — Raíces Pilot LATAM:
  * Meta acumulada corporativa: 10.000 inmobiliarias o usuarios activos en LATAM.

KPIs regionales estratégicos:
- Inmobiliarias activas pagando (MRR - Ingresos recurrentes mensuales)
- Inmobiliarias lifetime con consumo de saldo activo
- Nuevos clientes por país / Tasa de Adquisición de Clientes (CAC)
- Demos agendadas / Tasa de cierre por país
- Tasa de cancelación anticipada (Churn antes de los 12 meses)
- Clientes que completan su ciclo comercial y migran a Licencia Vitalicia
- Volumen de complementos (Add-ons) y agentes de IA adicionales activos

## 6. Reglas Inmutables de AgentOS
- **Límites Estrictos de Costo:** Nunca absorber consumo variable ilimitado. Toda interacción con APIs de terceros cuesta dinero.
- **Margen de Operación Positivo:** Todo cliente debe generar rentabilidad neta positiva al final del mes.
- **Pausa por Agotamiento de Saldo:** Pausar servicios de procesamiento conversacional de IA inmediatamente si el cliente supera límites mensuales y carece de saldo prepago.
- **Revisión Trimestral de Precios:** Actualizar las tarifas de planes y complementos cada 3 meses contra la inflación local y costes variables de proveedores.
- **Control de Cupo Fundador:** Respetar el límite de las primeras 100 licencias promocionales con vitalidad base para no sobre-comprometer recursos.
- **Transparencia en la Oferta:** No prometer software gratuito ilimitado. Informar de manera clara qué es base (CRM) y qué es variable (IA/WhatsApp).
- **[Estratégica 2030] Visión LATAM 2030:** Coordinar marketing, alertas financieras y upsells inteligentes para alcanzar las 10.000 inmobiliarias activas.
- **[Validación de Expansión] Apertura de Países:** Evaluar de manera previa los impuestos, pasarelas de pago del país de destino y dialecto comercial antes del desembarco.

## 7. Matriz de Riesgos & Alertas
Riesgos identificados:
- IA ilimitada (Uso excesivo de tokens OpenAI sin control) -> Impacto: Alto
- Storage ilimitado (Imágenes pesadas que encarecen el servidor) -> Impacto: Medio
- WhatsApp masivo/spam (Riesgo de bloqueo de números comerciales por parte de Meta) -> Impacto: Alto
- Cliente multi-marca (Múltiples inmobiliarias operando bajo un mismo tenant) -> Impacto: Medio
- OpenAI sin saldo (Falta de crédito en la API global de OpenAI que interrumpa el servicio) -> Impacto: Alto
- Ausencia de Términos Aceptados (Grave brecha de seguridad y desprotección legal) -> Impacto: Alto

Alertas del Sistema:
- API de OpenAI con fondos menores a USD 20.
- Error 429 (Límite de tasa de llamadas del modelo de lenguaje).
- Cliente aproximándose al límite de 300 conversaciones mensuales.
- Cloudinary excediendo el 80% del almacenamiento base de su plan.
- Redis o Webhooks fallando en la confirmación de Mercado Pago.
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
            Reglas comerciales, financieras y operativas oficiales de Raíces Pilot.
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
              { value: "planes", label: "Planes & Complementos" },
              { value: "licencia", label: "Licencia de por Vida" },
              { value: "proyecciones", label: "Expansión 2026–2030" },
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
                      "Raíces Pilot comercializa una licencia base financiada en 12 cuotas mensuales. Transcurrido el mes 12, el cliente conserva de por vida el acceso al CRM, catálogo inmobiliario, panel operativo y tours virtuales creados bajo los límites de su plan. <strong className="text-slate-900 font-bold">Todo consumo variable</strong> derivado de APIs (Inteligencia Artificial, envíos de WhatsApp oficiales, almacenamiento extra, soporte personalizado y módulos futuros) <strong className="text-brand-600 font-bold">se cobra aparte</strong> mediante saldo prepago, recarga de packs de mensajes o upgrades de plan."
                    </p>
                 </div>
               </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Precio Fundador</p>
                 <p className="text-xl sm:text-2xl font-black text-emerald-600 flex items-center gap-2"><Banknote className="w-5 h-5"/> $65.000 <span className="text-xs text-slate-400 font-normal">+ impuestos (ARS)</span></p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Duración Financiamiento</p>
                 <p className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><Target className="w-5 h-5 text-indigo-500"/> 12 meses pagos</p>
               </Card>
               <Card className="bg-white border border-slate-200/60 p-5 shadow-sm hover:shadow-soft transition-all">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cupo Fundador</p>
                 <p className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-brand-600"/> Primeras 100</p>
                 <p className="text-[10px] text-slate-400 mt-1">Beneficio de lanzamiento limitado</p>
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
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Licencia Vitalicia base</p>
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
                       <p className="text-sm text-slate-500">Aplica exclusivamente a las primeras 100 inmobiliarias contratadas como beneficio de lanzamiento limitado (Cupo Fundador).</p>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-base font-extrabold text-emerald-600 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Incluye (Límites de Base de Datos)
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>300</strong> propiedades activas en inventario</span></li>
                        <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>50</strong> tours 360° activos</span></li>
                        <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>10 GB</strong> de almacenamiento multimedia (Cloud Storage)</span></li>
                        <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>5</strong> usuarios de sistema activos en el CRM</span></li>
                        <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>1</strong> Agente de IA básico de cualificación</span></li>
                        <li className="flex items-center gap-3 text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> <span><strong>300</strong> conversaciones de IA por mes</span></li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-rose-500 mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5" /> No incluye (Cobro como Complementos)
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Agentes de IA adicionales o avanzados</li>
                        <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Consumo ilimitado de IA (sin supervisión/límites)</li>
                        <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Configuración (setup) física o presencial en oficinas</li>
                        <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Costos de línea oficial o mensajes de WhatsApp (Meta)</li>
                        <li className="flex items-center gap-3 text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Almacenamiento extra para imágenes equirrectangulares</li>
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
                       <TableHead className="px-5 font-bold">Precio Financiamiento (ARS)</TableHead>
                       <TableHead className="px-5 font-bold">Estado del Plan</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-900 px-5">Plan Fundador</TableCell>
                       <TableCell className="text-emerald-600 font-extrabold px-5">$65.000 <span className="text-slate-400 text-xs font-normal">+ impuestos / mes</span></TableCell>
                       <TableCell className="px-5"><Badge variant="success">Vigente (Primeras 100)</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">Plan Base futuro</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$85.000 <span className="text-slate-400 text-xs font-normal">+ impuestos / mes</span></TableCell>
                       <TableCell className="px-5"><Badge variant="neutral">Proyectado (Post-Cupo)</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">Plan Pro</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$120.000 <span className="text-slate-400 text-xs font-normal">+ impuestos / mes</span></TableCell>
                       <TableCell className="px-5"><Badge variant="neutral">Planificación</Badge></TableCell>
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
                     <Zap className="w-5 h-5 text-indigo-600" /> Catálogo de Complementos (Add-ons / Upsells)
                   </h2>
                 </div>
                 <Table>
                   <TableHeader className="bg-slate-50/50">
                     <TableRow>
                       <TableHead className="px-5 font-bold">Complemento (Add-on)</TableHead>
                       <TableHead className="px-5 font-bold">Precio Sugerido (ARS)</TableHead>
                       <TableHead className="px-5 font-bold">Categoría</TableHead>
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
                       <TableCell className="font-extrabold text-slate-700 px-5">Agente de IA adicional básico</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$29.000 <span className="text-slate-400 text-xs font-normal">+ impuestos</span></TableCell>
                       <TableCell className="px-5"><Badge variant="outline">Módulo</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">Agente de IA adicional avanzado</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$45.000 <span className="text-slate-400 text-xs font-normal">+ impuestos</span></TableCell>
                       <TableCell className="px-5"><Badge variant="outline">Módulo</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">10 GB de almacenamiento extra</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$10.000 <span className="text-slate-400 text-xs font-normal">+ impuestos</span></TableCell>
                       <TableCell className="px-5"><Badge variant="warning">Infraestructura</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">Soporte premium priorizado</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">desde $35.000 <span className="text-slate-400 text-xs font-normal">+ impuestos</span></TableCell>
                       <TableCell className="px-5"><Badge variant="outline">Servicio</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">Configuración inicial (Setup)</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$100.000</TableCell>
                       <TableCell className="px-5"><Badge variant="neutral">Pago único</Badge></TableCell>
                     </TableRow>
                     <TableRow className="hover:bg-slate-50/30">
                       <TableCell className="font-extrabold text-slate-700 px-5">Setup WhatsApp / Meta oficial</TableCell>
                       <TableCell className="text-slate-900 font-bold px-5">$200.000 a $300.000</TableCell>
                       <TableCell className="px-5"><Badge variant="neutral">Pago único</Badge></TableCell>
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
                   <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Licencia de por Vida (Lifetime Policy)</h2>
                   <p className="text-sm text-slate-500">
                     <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800 font-bold uppercase tracking-wider mr-2">Estrategia comercial interna</Badge>
                     Reglas aplicables a clientes que completen 12 cuotas consecutivas financiadas.
                   </p>
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                 <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-xl">
                   <h3 className="text-emerald-700 font-extrabold text-sm sm:text-base mb-4 flex items-center gap-2">
                     <CheckCircle2 className="w-5 h-5 text-emerald-600"/> Sí queda incluido de por vida (Vitalicio base)
                   </h3>
                   <ul className="space-y-3.5">
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Acceso continuo e irrestricto al software CRM y Panel de administración general.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Gestión activa de su catálogo inmobiliario hasta el límite contratado (ej. 300 propiedades).</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Creación y almacenamiento de tours 360° hasta el límite de su plan (ej. 50 tours activos).</span>
                     </li>
                   </ul>
                 </div>

                 <div className="bg-rose-50/40 border border-rose-100 p-5 rounded-xl">
                   <h3 className="text-rose-700 font-extrabold text-sm sm:text-base mb-4 flex items-center gap-2">
                     <XCircle className="w-5 h-5 text-rose-600"/> Nunca queda gratis de por vida (Costos de terceros)
                   </h3>
                   <ul className="space-y-3.5">
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Consumo de tokens de Inteligencia Artificial (AgentOS). OpenAI e IA se cobran por uso.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Tasas de envío y recepción de mensajes de WhatsApp facturadas directamente por Meta.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Espacio de almacenamiento (storage) extra superados los 10 GB iniciales.</span>
                     </li>
                     <li className="flex items-start gap-3">
                       <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                       <span className="text-slate-700 text-sm">Nuevos módulos premium futuros, integraciones de terceros y actualizaciones.</span>
                     </li>
                   </ul>
                 </div>
               </div>

               <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-4 items-center">
                 <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                 <p className="text-amber-800 text-sm font-semibold">
                   Directriz comercial inmutable: <span className="text-amber-900 font-normal">"No prometer todo gratis de por vida bajo ninguna circunstancia. Solamente la capa de software (SaaS) base es de carácter vitalicio."</span>
                 </p>
               </div>
            </Card>
          </TabsContent>

          {/* TAB: Expansión 2026-2030 */}
          <TabsContent value="proyecciones" className="mt-0 space-y-6">
            <Card className="bg-white border border-slate-200/60 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <Globe className="w-8 h-8 text-brand-600" />
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Expansión Regional 2026–2030: Argentina → LATAM</h2>
                  <p className="text-sm text-slate-500">Plan estratégico y proyección de crecimiento corporativo. Metas puramente aspiracionales.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 2026 */}
                <div className="relative pl-6 border-l-2 border-slate-200 pb-2">
                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-slate-300 border-2 border-white"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">2026 — Argentina / Lanzamiento Plan Fundador</span>
                    <Badge variant="brand" className="text-[10px] font-bold self-start sm:self-auto">Fase 1: Validación y Ajuste</Badge>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 mb-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[9px] text-slate-450 font-bold uppercase">Meta Mínima Viable</p>
                      <p className="text-base font-extrabold text-slate-800">50 inmobiliarias</p>
                    </div>
                    <div className="bg-brand-50/20 p-3 rounded-lg border border-brand-100/30">
                      <p className="text-[9px] text-brand-600 font-bold uppercase">Meta Objetivo</p>
                      <p className="text-base font-extrabold text-brand-700">200 inmobiliarias</p>
                    </div>
                    <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/30">
                      <p className="text-[9px] text-emerald-600 font-bold uppercase">Meta Agresiva</p>
                      <p className="text-base font-extrabold text-emerald-700">500 inmobiliarias</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-1"><strong>Foco de la Fase:</strong> Validación completa del modelo SaaS-to-Own, captación del cupo fundador, optimización de flujos de onboarding y documentación de casos de éxito.</p>
                  <p className="text-xs text-slate-500"><strong>Responsable de operaciones:</strong> CEO de IA + Área de Marketing</p>
                </div>

                {/* 2027 */}
                <div className="relative pl-6 border-l-2 border-brand-300 pb-2">
                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-brand-500 border-2 border-white"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">2027 — Argentina consolidada + pruebas iniciales LATAM</span>
                    <Badge variant="brand" className="text-[10px] font-bold self-start sm:self-auto">Fase 2: Escala y Posicionamiento</Badge>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 mb-3 w-max min-w-[200px]">
                    <p className="text-[9px] text-slate-450 font-bold uppercase">Meta Acumulada</p>
                    <p className="text-base font-extrabold text-slate-800">1.500 inmobiliarias</p>
                  </div>
                  <p className="text-xs text-slate-600 mb-1"><strong>Foco de la Fase:</strong> Consolidar liderazgo en las principales capitales argentinas e iniciar pruebas controladas de dialecto e impuestos en Uruguay, Paraguay y Chile.</p>
                </div>

                {/* 2028 */}
                <div className="relative pl-6 border-l-2 border-indigo-300 pb-2">
                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-indigo-500 border-2 border-white"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">2028 — Apertura Regional formal</span>
                    <Badge variant="brand" className="text-[10px] font-bold self-start sm:self-auto">Fase 3: Internacionalización</Badge>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 mb-3 w-max min-w-[200px]">
                    <p className="text-[9px] text-slate-450 font-bold uppercase">Meta Acumulada</p>
                    <p className="text-base font-extrabold text-slate-800">3.500 inmobiliarias</p>
                  </div>
                  <p className="text-xs text-slate-600 mb-1"><strong>Foco de la Fase:</strong> Apertura formal de operaciones comerciales y pasarelas de pago localizadas en Uruguay, Paraguay, Chile, Bolivia y Perú.</p>
                </div>

                {/* 2029 */}
                <div className="relative pl-6 border-l-2 border-violet-300 pb-2">
                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-violet-500 border-2 border-white"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">2029 — Consolidación regional</span>
                    <Badge variant="brand" className="text-[10px] font-bold self-start sm:self-auto">Fase 4: Expansión Masiva</Badge>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 mb-3 w-max min-w-[200px]">
                    <p className="text-[9px] text-slate-450 font-bold uppercase">Meta Acumulada</p>
                    <p className="text-base font-extrabold text-slate-800">6.500 inmobiliarias</p>
                  </div>
                  <p className="text-xs text-slate-600 mb-1"><strong>Foco de la Fase:</strong> Penetración agresiva en mercados masivos y estratégicos de Colombia y México, adaptando el soporte regional multi-hilo.</p>
                </div>

                {/* 2030 */}
                <div className="relative pl-6 border-l-2 border-emerald-400 pb-2">
                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">2030 — Ecosistema Raíces Pilot LATAM</span>
                    <Badge variant="success" className="text-[10px] font-bold self-start sm:self-auto">Líder Regional IA</Badge>
                  </div>
                  <div className="bg-emerald-50/30 border border-emerald-200 p-3 rounded-lg mb-3 w-max min-w-[200px]">
                    <p className="text-[9px] text-emerald-600 font-bold uppercase">Meta LATAM Corporativa</p>
                    <p className="text-lg font-black text-emerald-700">10.000 inmobiliarias / usuarios</p>
                  </div>
                  <p className="text-xs text-slate-600 mb-1"><strong>Foco de la Fase:</strong> Dominancia continental absoluta. Integración corporativa con grandes franquicias inmobiliarias de LATAM y despliegue masivo asistido por AgentOS.</p>
                </div>
              </div>
            </Card>

            {/* KPIs Regionales */}
            <Card className="bg-white border border-slate-200/60 p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" /> KPIs Regionales Clave (Mapeo Estratégico)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { title: "Inmobiliarias activas pagando (MRR)", desc: "Volumen total de ingresos recurrentes mensuales por país." },
                  { title: "Inmobiliarias lifetime con consumo", desc: "Cuentas vitalicias con facturación por uso de IA." },
                  { title: "Nuevos clientes por país", desc: "Tasa de captación mensual y efectividad comercial." },
                  { title: "Demos agendadas por país", desc: "Monitoreo del embudo comercial local." },
                  { title: "Tasa de cierre por país", desc: "Rendimiento y eficiencia del equipo comercial regional." },
                  { title: "Costo de Adquisición (CAC)", desc: "Monto invertido en marketing por cada nuevo cliente ganado." },
                  { title: "MRR por país", desc: "Desglose de facturación recurrente adaptado a tipo de cambio." },
                  { title: "Consumo de tokens IA por país", desc: "Volumen de créditos de AgentOS consumidos." },
                  { title: "Tasa de cancelación (Churn)", desc: "Porcentaje de bajas de inmobiliarias antes de cumplir el año." },
                  { title: "Conversión a Lifetime", desc: "Inmobiliarias que superan el mes 12 y migran a licencia vitalicia." },
                  { title: "Complementos (Add-ons) vendidos", desc: "Facturación mensual por módulos extra contratados." },
                  { title: "Agentes de IA adicionales activos", desc: "Cantidad de asistentes virtuales contratados por los tenants." },
                  { title: "Packs de conversaciones vendidos", desc: "Volumen de recargas de mensajes conversacionales." },
                  { title: "Tickets de soporte por país", desc: "Indicador operativo de fallos o fricciones localizadas." }
                ].map((kpi, index) => (
                  <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 hover:bg-slate-100/50 transition-colors">
                    <p className="text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      {kpi.title}
                    </p>
                    <p className="text-xs text-slate-500">{kpi.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
          
          {/* TAB: Reglas */}
          <TabsContent value="agentos" className="mt-0 space-y-6">
            <Card className="bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                 <Bot className="w-8 h-8 text-violet-600" />
                 <div>
                   <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Reglas Críticas de AgentOS</h2>
                   <p className="text-sm text-slate-500">Directivas inmutables de gobernanza para la IA que opera el sistema.</p>
                 </div>
               </div>

               <div className="grid gap-4 md:grid-cols-2">
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">1. Límites Estrictos de Costo</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">Nunca absorber consumo variable ilimitado. Toda API cuesta dinero real.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">2. Margen de Operación Positivo</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">Todo cliente activo debe generar rentabilidad positiva neta al final del mes.</p>
                 </div>
                 <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200">
                   <h4 className="font-extrabold text-rose-700 text-sm mb-1">3. Pausa por Exceso de Límite</h4>
                   <p className="text-xs text-rose-800 leading-relaxed">Pausar servicios IA inmediatamente si el cliente supera límites mensuales y no dispone de saldo prepago activo.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">4. Revisión Trimestral de Precios</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">Revisar precios de planes y complementos cada 3 meses para ajustar contra inflación y costos de proveedores.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">5. Control de Cupo Fundador</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">Respetar el cupo máximo de 100 licencias iniciales vitalicias para no sobre-vender capacidades.</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                   <h4 className="font-extrabold text-slate-900 text-sm mb-1">6. Transparencia en la Oferta</h4>
                   <p className="text-xs text-slate-600 leading-relaxed">No prometer "todo gratis de por vida". Aclarar qué es base (SaaS base) y qué es variable (IA/WhatsApp).</p>
                 </div>
                 <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-200 md:col-span-2">
                   <h4 className="font-extrabold text-indigo-800 text-sm mb-1 flex items-center gap-1.5"><Globe className="w-4 h-4"/> 7. [Estratégica 2030] Visión LATAM 2030</h4>
                   <p className="text-xs text-indigo-900 leading-relaxed">AgentOS debe operar con visión LATAM 2030. Su objetivo es impulsar a Raíces Pilot hacia 10.000 inmobiliarias activas o lifetime para 2030, coordinando marketing, ventas, onboarding, soporte, alertas financieras, complementos y control de rentabilidad por cliente.</p>
                 </div>
                 <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-200 md:col-span-2">
                   <h4 className="font-extrabold text-indigo-800 text-sm mb-1 flex items-center gap-1.5"><Globe className="w-4 h-4"/> 8. [Validación de Expansión] Apertura de Países</h4>
                   <p className="text-xs text-indigo-900 leading-relaxed">Antes de abrir un nuevo país, AgentOS debe validar de manera estricta: moneda local, marco de impuestos, medios de pago integrables, costos reales de WhatsApp/Meta oficiales, lenguaje comercial y dialecto local, franja de soporte horario y competencia inmobiliaria digital local.</p>
                 </div>
                 <div className="bg-brand-50/50 p-5 rounded-xl border border-brand-200 md:col-span-2">
                   <h4 className="font-extrabold text-brand-800 text-sm mb-1">9. Upselling Proactivo</h4>
                   <p className="text-xs text-brand-900 leading-relaxed">Detectar automáticamente clientes de alto consumo y sugerir upsells o recargas de saldo.</p>
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
                  <AlertCircle className="w-5 h-5 text-rose-500" /> Matriz de Riesgos Identificados
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">IA ilimitada (Uso excesivo de tokens OpenAI sin control)</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Storage ilimitado (Almacenamiento multimedia desmedido)</span>
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">WhatsApp masivo/spam (Bloqueo de línea por Meta)</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Inflación / Incremento en costos de APIs</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Clientes vitalicios (Lifetime) sin consumo de add-ons</span>
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Soporte técnico excesivo en planes de bajo costo</span>
                    <Badge variant="warning" className="text-[10px] font-extrabold uppercase">Medio</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">API de OpenAI sin saldo (Interrupción de Agentes)</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                  <li className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">Ausencia de Términos Aceptados (Vacío legal de resguardo)</span>
                    <Badge variant="danger" className="text-[10px] font-extrabold uppercase">Alto</Badge>
                  </li>
                </ul>
              </Card>

              {/* Alertas Operativas */}
              <Card className="bg-white border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Alertas del Ecosistema
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-amber-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <HardDrive className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">OpenAI &lt; USD 20</p>
                      <p className="text-xs text-slate-505 font-medium">Recargar saldo en la plataforma de facturación OpenAI.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-rose-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Error 429 (Rate Limit)</p>
                      <p className="text-xs text-slate-505 font-medium">Límite de tasa en API superado. Revisar cuotas asignadas.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-brand-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <MessageSquare className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cliente cerca de 300 convers.</p>
                      <p className="text-xs text-slate-505 font-medium">Disparar acción sugerida de cobranza / upsell de IA.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-indigo-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <HardDrive className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cliente superó almacenamiento / tours</p>
                      <p className="text-xs text-slate-505 font-medium">Notificar al cliente e incentivar la compra de almacenamiento extra.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-amber-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <HardDrive className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cloudinary al 80%</p>
                      <p className="text-xs text-slate-505 font-medium">Revisar el consumo global de imágenes optimizadas.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start p-3 bg-slate-50 border-l-2 border-rose-500 rounded-r-lg border border-y-slate-100 border-r-slate-100">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Redis o Webhooks fallando</p>
                      <p className="text-xs text-slate-505 font-medium">Chequear la cola de tareas del worker y la respuesta de Mercado Pago.</p>
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
