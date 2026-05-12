"use client";

import { Printer, ShieldCheck, Zap, Bot, Database, Globe, CreditCard, MessageCircle, AlertCircle, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MasterManualPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      {/* Header â€” Oculto en impresión */}
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
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500 mt-2">Especificación Técnica y Operativa v2.0</p>
        </div>

        <article className="prose prose-slate max-w-none prose-headings:tracking-tight prose-h2:border-b prose-h2:pb-3 prose-h2:mt-16 prose-h2:text-3xl prose-h2:font-black prose-h3:text-xl prose-h3:font-bold prose-strong:text-slate-900 prose-blockquote:border-brand-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:rounded-r-lg">
          
          <div className="bg-slate-900 text-white p-8 rounded-2xl mb-12 print:bg-slate-50 print:text-slate-900 print:border">
            <h2 className="text-white border-none pb-0 mt-0 print:text-slate-900">0. Introducción al Ecosistema</h2>
            <p className="text-slate-300 print:text-slate-600">
              RaicesPilot es una plataforma <strong>SaaS Multi-tenant</strong> de grado industrial diseñada para el sector inmobiliario. Integra inteligencia artificial generativa, CRM de ventas, gestión de inventario y automatización de mensajería en un solo núcleo operativo.
            </p>
          </div>

          {/* 1. ARQUITECTURA */}
          <h2>1. Arquitectura de Datos y Entidades</h2>
          <p>El sistema utiliza una arquitectura relacional en PostgreSQL para garantizar la integridad y el aislamiento:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-8">
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Database className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Organización (Tenant)</span>
              </div>
              <p className="text-sm text-slate-600">Es la unidad comercial independiente. Posee su propio subdominio (slug), base de leads, propiedades, tokens de WhatsApp y configuración de agentes IA.</p>
            </div>
            <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Usuario y Membresía</span>
              </div>
              <p className="text-sm text-slate-600">Los usuarios son globales. Las membresías definen su rol dentro de cada Org (OWNER, ADMIN, AGENT, ASSISTANT).</p>
            </div>
          </div>

          {/* 2. ONBOARDING */}
          <h2>2. Ciclo de Vida del Onboarding</h2>
          <p>El proceso de alta de una nueva inmobiliaria sigue un flujo técnico controlado:</p>
          <ol>
            <li><strong>Creación en Plataforma:</strong> El Superadmin define nombre y slug. El sistema crea la base relacional del tenant.</li>
            <li><strong>Generación de Invitación:</strong> Se genera un <code>InviteToken</code> criptográfico vinculado al email del titular.</li>
            <li><strong>Activación de Cuenta:</strong> El cliente accede al link, acepta las Políticas de Privacidad (bloqueo obligatorio) y establece su clave.</li>
            <li><strong>Vinculación WABA:</strong> Configuración del <code>phoneNumberId</code> y <code>AccessToken</code> de Meta para habilitar el envío de mensajes.</li>
          </ol>

          {/* 3. INTELIGENCIA ARTIFICIAL */}
          <h2>3. El Motor de Inteligencia Artificial</h2>
          <p>El "Cerebro" de RaicesPilot no es un chat genérico, sino un agente especializado con tres fuentes de conocimiento:</p>
          <ul>
            <li><strong>Knowledge Base de la Org:</strong> Datos de la inmobiliaria, servicios y tono de marca.</li>
            <li><strong>Contexto de Propiedades:</strong> Acceso en tiempo real al inventario indexado.</li>
            <li><strong>Memoria de Conversación:</strong> Capacidad para recordar acuerdos previos con el lead dentro de la sesión actual.</li>
          </ul>

          <h3>3.1. Sincronización Automática (PropertySource)</h3>
          <p>Permite a la inmobiliaria indexar su sitio web actual. El sistema utiliza scraping asistido por IA para:</p>
          <ol>
            <li>Leer el HTML del sitio externo.</li>
            <li>Mapear campos técnicos (precio, ambientes, zona).</li>
            <li>Descargar y optimizar imágenes.</li>
            <li>Indexar la información para que el Bot pueda responder consultas técnicas.</li>
          </ol>

          {/* 4. OPERACIÓN COMERCIAL */}
          <h2>4. Operación del CRM y Leads</h2>
          <p>Cada lead entrante por WhatsApp es procesado por un pipeline de calificación:</p>
          <ul>
            <li><strong>Lead Scoring:</strong> La IA asigna prioridad según la intención detectada (Venta, Alquiler, Inversión).</li>
            <li><strong>Follow-up Active:</strong> Flag que indica si el lead requiere un seguimiento proactivo del equipo humano.</li>
            <li><strong>Handoff:</strong> Cuando se detecta una señal de cierre, el Bot se silencia y notifica al agente mediante la campana de notificaciones y WhatsApp.</li>
          </ul>

          {/* 5. GESTIÓN DE VISITAS */}
          <h2>5. Agendamiento de Visitas e IA</h2>
          <p>Uno de los módulos más avanzados permite a la IA coordinar agendas físicas:</p>
          <ol>
            <li>La inmobiliaria carga sus franjas horarias en <code>/settings/availability</code>.</li>
            <li>Cuando un lead calificado quiere visitar una propiedad, la IA consulta los slots disponibles.</li>
            <li>La IA propone el turno y, si el lead acepta, se crea automáticamente la <strong>Visita</strong> en estado <code>PENDING</code>.</li>
          </ol>

          {/* 6. PLATAFORMA (SUPERADMIN) */}
          <h2>6. Módulos de Control de Plataforma</h2>
          <p>El Superadmin tiene herramientas de monitoreo en tiempo real:</p>
          <ul>
            <li><strong>Radar de Operaciones IA:</strong> Auditoría de qué clientes están recibiendo leads y si su bot está respondiendo con éxito.</li>
            <li><strong>Health Check:</strong> Monitoreo del <em>Worker Heartbeat</em>. Si el worker de BullMQ falla, las automatizaciones se detienen.</li>
            <li><strong>Audit Logs:</strong> Registro inmutable de cada vez que un administrador de plataforma accede a datos de un cliente.</li>
          </ul>

          {/* 7. PAGOS Y FACTURACIÓN */}
          <h2>7. Infraestructura de Pagos (Mercado Pago)</h2>
          <p>El sistema gestiona suscripciones mediante la API de Mercado Pago:</p>
          <ul>
            <li><strong>Webhook de Pagos:</strong> El sistema escucha las notificaciones IPN. Al confirmarse un pago, la organización se activa o prorroga su vigencia.</li>
            <li><strong>Suspensión Automática:</strong> Si el pago no se registra, el sistema redirige a los usuarios a una pantalla de <code>/suspended</code>, bloqueando la operación hasta la regularización.</li>
          </ul>

          {/* 8. SEGURIDAD TÉCNICA */}
          <h2>8. Protocolos de Seguridad y Estabilidad</h2>
          <p>Para garantizar una disponibilidad del 99.9%, aplicamos:</p>
          <ul>
            <li><strong>Aislamiento de Sesiones:</strong> Validación vía HMAC-SHA256 en cada request al App Router.</li>
            <li><strong>Protección de Base de Datos:</strong> Prohibición de <code>db push</code> en producción; uso estricto de migraciones controladas.</li>
            <li><strong>Cifrado de Tokens:</strong> Los tokens de WhatsApp de los clientes se almacenan con cifrado en reposo.</li>
          </ul>

        </article>

        <div className="mt-24 border-t-2 border-slate-100 pt-10 text-center">
          <div className="flex justify-center gap-8 mb-6 grayscale opacity-30">
            <Globe className="h-6 w-6" />
            <Bot className="h-6 w-6" />
            <Zap className="h-6 w-6" />
            <Database className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            RaicesPilot Technical Blueprint â€” Propiedad Intelectual de Inmuebles Digitales
          </p>
        </div>
      </div>
    </div>
  );
}
