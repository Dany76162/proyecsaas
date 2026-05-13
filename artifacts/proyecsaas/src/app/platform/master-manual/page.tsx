"use client";

import { Printer, ShieldCheck, Zap, Bot, Database, Globe, CreditCard, MessageCircle, AlertCircle, Terminal, LayoutDashboard, Flag, ShieldAlert, Share2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MasterManualPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      {/* Header — Oculto en impresión */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Manual Maestro <span className="text-brand-600">RaicesPilot</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Documentación exhaustiva de arquitectura, procesos y operación global.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="font-bold border-slate-200"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Manual Completo
          </Button>
        </div>
      </div>

      {/* Cuerpo del Manual */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-16 print:shadow-none print:border-none print:p-0">
        
        {/* Cabecera de Impresión */}
        <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter">RaicesPilot Enterprise</h1>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500 mt-2">Especificación Técnica y Operativa v3.1</p>
        </div>

        <article className="prose prose-slate max-w-none prose-headings:tracking-tight prose-h2:border-b prose-h2:pb-3 prose-h2:mt-16 prose-h2:text-3xl prose-h2:font-black prose-h3:text-xl prose-h3:font-bold prose-strong:text-slate-900 prose-blockquote:border-brand-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:rounded-r-lg">
          
          <div className="bg-slate-900 text-white p-8 rounded-2xl mb-12 print:bg-slate-50 print:text-slate-900 print:border">
            <h2 className="text-white border-none pb-0 mt-0 print:text-slate-900">0. Estado de la Plataforma v3.1</h2>
            <p className="text-slate-300 print:text-slate-600">
              RaicesPilot ha evolucionado a un ecosistema de <strong>Agentes Operativos (AgentOS)</strong>. La versión 3.1 introduce capas de gobernanza, integración con Meta y centros de preparación para producción, actualmente operando de forma exclusiva para el nivel Superadmin.
            </p>
          </div>

          {/* 1. ESTRUCTURA DE PANELES */}
          <h2>1. Estructura de Paneles y Roles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-8">
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Globe className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Admin Inmobiliario (Tenant)</span>
              </div>
              <p className="text-sm text-slate-600">Gestión de leads, inventario y agentes locales de WhatsApp. Optimizado para la operación comercial diaria de la inmobiliaria.</p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Superadmin (AgentOS)</span>
              </div>
              <p className="text-sm text-slate-600">Control total de la infraestructura. Incluye el motor AgentOS 3.1 para orquestación de contenido y gobernanza global.</p>
            </div>
          </div>

          {/* 2. AGENTOS 3.1 */}
          <h2>2. AgentOS: El Cerebro Operativo</h2>
          <p>AgentOS es el sistema de orquestación asistido por IA para tareas complejas de plataforma:</p>
          <ul>
            <li><strong>Objetivos y Canvas:</strong> Definición visual de metas operativas y seguimiento de ejecuciones (Runs).</li>
            <li><strong>Biblioteca de Agentes:</strong> Perfiles especializados (Director Operativo, Marketing) con autonomía configurable.</li>
            <li><strong>Automatizaciones Controladas:</strong> Programación de tareas internas que no afectan a terceros sin aprobación humana.</li>
            <li><strong>Calendario de Contenido:</strong> Planificación y previsualización de publicaciones en redes sociales.</li>
          </ul>

          {/* 3. GOBERNANZA Y SEGURIDAD */}
          <h2>3. Gobernanza y Seguridad en Producción</h2>
          <p>Para mitigar riesgos operativos, la v3.1 introduce el <strong>Budget Guard</strong>:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose mb-8">
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <ShieldAlert className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Budget Guard</span>
              </div>
              <p className="text-xs text-slate-600">Límites estrictos de ejecuciones y autonomía para evitar costos imprevistos de API.</p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <LayoutDashboard className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Readiness Center</span>
              </div>
              <p className="text-xs text-slate-600">Checklist técnico que valida variables de entorno y estado de servicios antes de operar.</p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Flag className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Feature Flags</span>
              </div>
              <p className="text-xs text-slate-600">Activación dinámica de funciones de alto riesgo (Meta Publishing) mediante entorno seguro.</p>
            </div>
          </div>

          {/* 4. INTEGRACIÓN META */}
          <h2>4. Integración con Meta (Facebook & Instagram)</h2>
          <p>AgentOS 3.1 permite la gestión de contenido externo con capas de seguridad:</p>
          <ol>
            <li><strong>Modo Read-Only:</strong> Lectura de métricas y páginas sin permiso de escritura por defecto.</li>
            <li><strong>Aprobación Humana:</strong> Todo post generado por IA debe ser revisado y aprobado en el Calendario antes de publicarse.</li>
            <li><strong>Scheduler Protegido:</strong> Las publicaciones programadas se ejecutan mediante un Worker seguro con secreto de autenticación.</li>
          </ol>

          {/* 5. PROTOCOLO DE DESPLIEGUE */}
          <h2>5. Protocolo de Despliegue y Estabilidad</h2>
          <p>Para garantizar el tiempo de actividad del 99.9%, el Superadmin debe seguir el protocolo técnico:</p>
          <blockquote>
            <strong>Regla de Oro:</strong> Nunca usar <code>db push</code> en producción. Utilizar siempre <code>migrate deploy</code> para garantizar la trazabilidad de la base de datos.
          </blockquote>
          <ul>
            <li><strong>Validación de Tipos:</strong> Ejecución obligatoria de <code>tsc --noEmit</code> antes de cualquier despliegue.</li>
            <li><strong>Cifrado de Secretos:</strong> Los tokens de Meta y WhatsApp se almacenan cifrados (AES-256) y nunca se exponen al cliente final.</li>
            <li><strong>Cron Security:</strong> El endpoint de publicación está protegido por <code>AGENTOS_CRON_SECRET</code>.</li>
          </ul>

        </article>

        <div className="mt-24 border-t-2 border-slate-100 pt-10 text-center">
          <div className="flex justify-center gap-8 mb-6 grayscale opacity-30">
            <Globe className="h-6 w-6" />
            <Bot className="h-6 w-6" />
            <Zap className="h-6 w-6" />
            <Share2 className="h-6 w-6" />
            <Calendar className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            RaicesPilot Technical Blueprint v3.1 — Propiedad Intelectual de Inmuebles Digitales
          </p>
        </div>
      </div>
    </div>
  );
}
