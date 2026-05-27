"use client";

import { useState } from "react";
import { Download, Briefcase, FileText, TrendingUp, Bot, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BusinessModelPage() {
  const [activeTab, setActiveTab] = useState("resumen");

  const handleExport = () => {
    const content = `# Modelo de Negocio Oficial de RaicesPilot v1.0

## 1. Resumen Ejecutivo
RaicesPilot se posiciona como el CRM inmobiliario inteligente definitivo, integrando herramientas operativas con Agentes IA autónomos. El objetivo inicial es la penetración de mercado mediante una oferta irresistible (Plan Fundador) que fidelice a los early adopters y genere el flujo de caja necesario para escalar.
- Target: Inmobiliarias en crecimiento que buscan modernizar su atención al cliente y gestión de propiedades.
- Estrategia de entrada: Pago por 12 meses para obtener licencia operativa vitalicia, pagando luego sólo consumos de IA (AgentOS) y add-ons premium.
- Diferenciador principal: AgentOS (Agentes IA autónomos) + Tour Virtual 360 integrado nativamente + CRM.

## 2. Plan Fundador
### Estructura de Precios
- Costo mensual: $65.000 + impuestos.
- Duración del compromiso: 12 meses consecutivos.
- Beneficio principal: Licencia base de por vida desde el mes 13.

### Límites y Capacidades (Por Tenant)
- Agentes IA: 1 agente IA incluido.
- Interacciones IA: 300 conversaciones simples mensuales incluidas.
- Catálogo: 300 propiedades activas simultáneas.
- Tours Virtuales: 50 tours activos.
- Almacenamiento: 10 GB de capacidad.
- Usuarios: Hasta 5 usuarios por cuenta.

## 3. Planes Futuros & Add-ons
### Add-ons Pagos (Upsells)
- Paquetes de Conversaciones IA: Venta de recargas o suscripciones adicionales.
- Agentes IA Adicionales: Agentes especializados extra.
- Expansión de Catálogo: Módulos para +500 o +1000 propiedades.
- Almacenamiento Extra: Paquetes de GB adicionales.
- Usuarios Adicionales: Cobro por asiento extra.

### Futuros Planes (Post-Fundador)
Una vez alcanzada la cuota de Fundadores, el sistema migrará a un modelo SaaS tradicional con tiers (Starter, Pro, Enterprise) sin licencia vitalicia.

## 4. Licencia de por Vida
Al completar el 12º pago, la inmobiliaria obtiene una Licencia Base Operativa Vitalicia.

### ¿Qué QUEDA gratis de por vida?
- Acceso ilimitado al CRM y Panel Admin.
- Gestión del catálogo inmobiliario (hasta 300 propiedades).
- Cámara 360 y creación de tours (hasta 50 tours).
- Soporte técnico básico.

### ¿Qué NO QUEDA gratis de por vida?
- Consumo de Inteligencia Artificial (AgentOS): El cliente deberá abonar una tarifa de consumo IA o comprar paquetes.
- Servicios de terceros con costo variable (ej. envíos masivos).
- Almacenamiento extra (sobre los 10 GB).

## 5. Proyecciones 2026–2030
### Fase 1: Tracción y Validación (2026)
- Captación de 100 inmobiliarias con Plan Fundador.
- MRR Objetivo: $6.500.000 ARS (Bruto).

### Fase 2: Expansión de Servicios (2027-2028)
- Lanzamiento de planes SaaS regulares.
- Introducción agresiva de Add-ons.
- Integraciones nativas con portales (Zonaprop, Argenprop).

### Fase 3: Ecosistema y Escala (2029-2030)
- Expansión regional.
- Desarrollo de IA Predictiva para tasaciones y prospección autónoma.

## 6. Reglas de AgentOS
- Intervención Superadmin: AgentOS no puede alterar planes financieros sin humanos.
- Bloqueo por deuda: Si hay deuda IA, se corta el servicio de mensajería (Handoff forzado).
- Métrica de Conversación: 1 conversación = sesión interactiva resuelta.
- Auditoría: Toda interacción IA queda registrada y es auditada por el Agente IA CEO.

## 7. Riesgos y Alertas
### Alertas Financieras
- Costos Variables IA: Peligro de abuso si no hay hard-limit técnico estricto.
- Inflación: El precio de $65.000 ARS puede quedar desactualizado. Evaluar ajustes.
- Storage: Monitorear límite de 10 GB estrictamente por Tours 360.

### Riesgos Operativos
- Fricción en la adopción por asesores tradicionales.
- Dependencia de la calidad de respuesta de LLMs.
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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Briefcase className="h-6 w-6 text-brand-400" />
            Modelo de Negocio
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Reglas comerciales, financieras y operativas oficiales de RaicesPilot.
          </p>
        </div>
        <Button onClick={handleExport} className="bg-brand-600 hover:bg-brand-700 text-white border border-brand-500 shadow-sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar Markdown
        </Button>
      </div>

      <Tabs defaultValue="resumen" onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-slate-900/50 border border-white/10 p-1 inline-flex rounded-lg">
            <TabsTrigger value="resumen" className="text-xs font-semibold px-4 rounded-md">Resumen Ejecutivo</TabsTrigger>
            <TabsTrigger value="fundador" className="text-xs font-semibold px-4 rounded-md">Plan Fundador</TabsTrigger>
            <TabsTrigger value="futuro" className="text-xs font-semibold px-4 rounded-md">Planes Futuros & Add-ons</TabsTrigger>
            <TabsTrigger value="licencia" className="text-xs font-semibold px-4 rounded-md">Licencia de por Vida</TabsTrigger>
            <TabsTrigger value="proyecciones" className="text-xs font-semibold px-4 rounded-md">Proyecciones 2026–2030</TabsTrigger>
            <TabsTrigger value="agentos" className="text-xs font-semibold px-4 rounded-md">Reglas de AgentOS</TabsTrigger>
            <TabsTrigger value="riesgos" className="text-xs font-semibold px-4 rounded-md">Riesgos y Alertas</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="resumen" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-4 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-400" /> Resumen Ejecutivo
              </h2>
              <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
                <p><strong>RaicesPilot</strong> se posiciona como el CRM inmobiliario inteligente definitivo, integrando herramientas operativas con Agentes IA autónomos. El objetivo inicial es la penetración de mercado mediante una oferta irresistible (Plan Fundador) que fidelice a los early adopters y genere el flujo de caja necesario para escalar.</p>
                <ul className="list-disc pl-5 mt-4 space-y-2">
                  <li><strong>Target:</strong> Inmobiliarias en crecimiento que buscan modernizar su atención al cliente y gestión de propiedades.</li>
                  <li><strong>Estrategia de entrada:</strong> Pago por 12 meses para obtener licencia operativa vitalicia, pagando luego sólo consumos de IA (AgentOS) y add-ons premium.</li>
                  <li><strong>Diferenciador principal:</strong> AgentOS (Agentes IA autónomos) + Tour Virtual 360 integrado nativamente + CRM.</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="fundador" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" /> Plan Fundador
              </h2>
              
              <div>
                <h3 className="text-emerald-300 font-semibold mb-2">Estructura de Precios</h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li><strong>Costo mensual:</strong> $65.000 + impuestos.</li>
                  <li><strong>Duración del compromiso:</strong> 12 meses consecutivos.</li>
                  <li><strong>Beneficio principal:</strong> Licencia base de por vida desde el mes 13.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-emerald-300 font-semibold mb-2">Límites y Capacidades (Por Tenant)</h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li><strong>Agentes IA:</strong> 1 agente IA incluido.</li>
                  <li><strong>Interacciones IA:</strong> 300 conversaciones simples mensuales incluidas.</li>
                  <li><strong>Catálogo:</strong> 300 propiedades activas simultáneas.</li>
                  <li><strong>Tours Virtuales:</strong> 50 tours activos.</li>
                  <li><strong>Almacenamiento:</strong> 10 GB de capacidad.</li>
                  <li><strong>Usuarios:</strong> Hasta 5 usuarios por cuenta.</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="futuro" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" /> Planes Futuros & Add-ons
              </h2>
              
              <div>
                <h3 className="text-indigo-300 font-semibold mb-2">Add-ons Pagos (Upsells)</h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li><strong>Paquetes de Conversaciones IA:</strong> Venta de recargas o suscripciones adicionales para superar las 300 interacciones mensuales.</li>
                  <li><strong>Agentes IA Adicionales:</strong> Agentes especializados extra (ej. Agente de Carga, Agente de Prospección).</li>
                  <li><strong>Expansión de Catálogo:</strong> Módulos para +500 o +1000 propiedades.</li>
                  <li><strong>Almacenamiento Extra:</strong> Paquetes de GB adicionales para fotos y videos en alta resolución.</li>
                  <li><strong>Usuarios Adicionales:</strong> Cobro por asiento extra superando los 5 iniciales.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-indigo-300 font-semibold mb-2">Futuros Planes (Post-Fundador)</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Una vez alcanzada la cuota de Fundadores, el sistema migrará a un modelo SaaS tradicional (SaaS MRR) con tiers (Starter, Pro, Enterprise) sin la promesa de licencia vitalicia.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="licencia" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" /> Licencia de por Vida
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Al completar el 12º pago consecutivo, la inmobiliaria obtiene una <strong>Licencia Base Operativa Vitalicia</strong>.
              </p>

              <div>
                <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                  ¿Qué QUEDA gratis de por vida?
                </h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li>Acceso ilimitado al CRM y Panel Admin.</li>
                  <li>Gestión del catálogo inmobiliario (hasta 300 propiedades).</li>
                  <li>Cámara 360 y creación de tours (hasta 50 tours).</li>
                  <li>Soporte técnico básico y actualizaciones de seguridad de la plataforma central.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-rose-400 font-semibold mb-2 flex items-center gap-2">
                  ¿Qué NO QUEDA gratis de por vida?
                </h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li><strong>Consumo de Inteligencia Artificial (AgentOS):</strong> Las 300 conversaciones gratuitas finalizan. El cliente deberá abonar una tarifa de mantenimiento/consumo IA o comprar paquetes.</li>
                  <li>Servicios de terceros que impliquen costo variable por transacción o envío.</li>
                  <li>Almacenamiento extra (sobre los 10 GB).</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="proyecciones" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Proyecciones 2026–2030
              </h2>
              
              <div className="grid gap-6 md:grid-cols-3">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-emerald-400 font-bold mb-3">Fase 1 (2026)<br/>Tracción y Validación</h3>
                  <ul className="list-disc pl-5 text-xs text-slate-300 space-y-2">
                    <li>Captación de 100 inmobiliarias (Plan Fundador).</li>
                    <li>MRR Objetivo: $6.500.000 ARS (Bruto).</li>
                    <li>Enfoque: Estabilizar AgentOS y optimizar costos de API LLMs.</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-indigo-400 font-bold mb-3">Fase 2 (2027-2028)<br/>Expansión de Servicios</h3>
                  <ul className="list-disc pl-5 text-xs text-slate-300 space-y-2">
                    <li>Lanzamiento de planes SaaS regulares.</li>
                    <li>Introducción agresiva de Add-ons y upsells IA.</li>
                    <li>Integraciones nativas con Zonaprop y Argenprop.</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-amber-400 font-bold mb-3">Fase 3 (2029-2030)<br/>Ecosistema y Escala</h3>
                  <ul className="list-disc pl-5 text-xs text-slate-300 space-y-2">
                    <li>Expansión regional Latam.</li>
                    <li>Conversión de Fundadores a clientes de alto consumo IA.</li>
                    <li>Desarrollo de IA Predictiva autónoma (tasaciones).</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="agentos" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-4 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-400" /> Reglas de AgentOS
              </h2>
              <ul className="list-disc pl-5 text-sm text-slate-300 space-y-3">
                <li><strong>Intervención Superadmin:</strong> AgentOS no puede alterar planes financieros de forma autónoma sin intervención humana o supervisión del Superadmin.</li>
                <li><strong>Bloqueo por deuda:</strong> Si el tenant no renueva la cuota de IA o su suscripción entra en mora, AgentOS cortará el servicio de mensajería (Handoff forzado inmediato).</li>
                <li><strong>Métrica de Conversación:</strong> 1 "conversación" se contabiliza como una sesión interactiva que resulta resuelta o derivada a humano, no por mensaje individual de chat.</li>
                <li><strong>Auditoría:</strong> Toda interacción IA queda registrada. El Agente IA CEO audita y reporta ineficiencias, sobreconsumos o riesgos reputacionales.</li>
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="riesgos" className="mt-0">
            <Card className="bg-slate-900/50 border border-white/10 p-6 space-y-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" /> Riesgos y Alertas
              </h2>
              
              <div>
                <h3 className="text-rose-300 font-semibold mb-2">Alertas Financieras Críticas</h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li><strong>Costos Variables IA:</strong> Riesgo de abuso de LLMs si no se implementa un <em>hard-limit</em> técnico estricto al llegar a las 300 conversaciones.</li>
                  <li><strong>Inflación ARS:</strong> El precio estático de $65.000 ARS puede licuarse. Urgente definir cláusula de ajuste indexado en términos y condiciones.</li>
                  <li><strong>Storage Cloudinary/S3:</strong> Los Tours 360 consumen gran ancho de banda y espacio. Bloquear subidas automáticamente al llegar a 10 GB.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-orange-300 font-semibold mb-2">Riesgos Operativos</h3>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                  <li>Fricción en la adopción del Agente IA por parte de asesores tradicionales que prefieren el control manual 100%.</li>
                  <li>Dependencia técnica de infraestructura de terceros (Meta WhatsApp Cloud API, OpenAI, Railway).</li>
                  <li>Riesgo de respuestas alucinadas por la IA si la base de datos de propiedades está desactualizada por el cliente.</li>
                </ul>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
