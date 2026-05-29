"use client";

import { Printer, ShieldCheck, Zap, Bot, Database, Globe, CreditCard, MessageCircle, AlertCircle, Terminal, LayoutDashboard, Flag, ShieldAlert, Share2, Calendar, Camera, Map, List, Layers, ScanLine, MessageSquare, BookOpen, KeyRound, Cpu, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MasterManualPage() {
  return (
    <div className="w-full max-w-none px-6 lg:px-8 space-y-8 pb-32 print:max-w-none print:px-0 print:mx-0">
      
      {/* Estilos CSS específicos de impresión y scroll suave */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        @media print {
          /* Ocultar barra lateral, barra de navegación, botones y pie de página en impresión */
          header, footer, nav, aside, .print\\:hidden, button, .no-print {
            display: none !important;
          }
          /* Expandir contenedor principal al 100% */
          body, main, .print\\:max-w-none {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: #0f172a !important; /* slate-900 */
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          /* Evitar cortes feos en tarjetas, secciones y tablas */
          .print\\:avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Títulos legibles y saltos de página controlados */
          h2 {
            page-break-before: always;
          }
          h2:first-of-type {
            page-break-before: avoid;
          }
        }
      `}</style>

      {/* Header — Oculto en impresión */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Manual Maestro <span className="text-brand-600">Raíces Pilot</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Documentación superior de arquitectura, procesos, gobernanza y doctrina técnica/comercial.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="font-bold border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          >
            <Printer className="mr-2 h-4 w-4 text-slate-500" />
            Imprimir manual completo
          </Button>
        </div>
      </div>

      {/* Índice Interactivo / Tabla de Contenidos — Oculto en impresión */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 print:hidden">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brand-600" />
          Índice de Contenidos del Manual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-sm">
          <a href="#estado" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">0. Estado de la plataforma v3.1</a>
          <a href="#roles" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">1. Estructura de paneles y roles</a>
          <a href="#agentos" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">2. AgentOS: El cerebro operativo</a>
          <a href="#seguridad" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">3. Gobernanza y seguridad en producción</a>
          <a href="#meta" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">4. Integración con Meta (Facebook, Instagram & WhatsApp)</a>
          <a href="#protocolo" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">5. Protocolo de despliegue y estabilidad</a>
          <a href="#tour360" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">6. Tour virtual 360°</a>
          <a href="#catalogo" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">7. Catálogo público de propiedades</a>
          <a href="#ia-tour" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">8. Agente IA en el tour virtual</a>
          <a href="#gobernanza" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">9. Gobernanza comercial y reglas de suscripción</a>
        </div>
      </div>

      {/* Cuerpo del Manual */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-16 print:shadow-none print:border-none print:p-0">
        
        {/* Cabecera de Impresión */}
        <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Raíces Pilot Enterprise</h1>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500 mt-2">Especificación Técnica y Operativa v3.1</p>
        </div>

        <article className="prose prose-slate max-w-none prose-p:max-w-4xl prose-li:max-w-4xl prose-blockquote:max-w-4xl prose-headings:tracking-tight prose-h2:border-b prose-h2:pb-3 prose-h2:mt-16 prose-h2:text-3xl prose-h2:font-black prose-h3:text-xl prose-h3:font-bold prose-strong:text-slate-900 prose-blockquote:border-brand-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:rounded-r-lg">
          
          {/* 0. ESTADO DE LA PLATAFORMA */}
          <div id="estado" className="bg-slate-900 text-white p-8 rounded-2xl mb-12 print:bg-slate-50 print:text-slate-900 print:border print:avoid-break">
            <h2 className="text-white border-none pb-0 mt-0 print:text-slate-900">0. Estado de la plataforma v3.1</h2>
            <p className="text-slate-300 print:text-slate-600">
              Raíces Pilot ha evolucionado hacia un ecosistema avanzado basado en <strong>AgentOS (el cerebro operativo de Agentes de IA)</strong>. La versión 3.1 introduce robustas capas de gobernanza comercial, integración segura con Meta y centros de validación de variables en producción. Toda la funcionalidad se encuentra consolidada y protegida en el panel del Superadministrador.
            </p>
            <div className="mt-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2 text-slate-300 print:bg-slate-100 print:border-slate-300 print:text-slate-800">
              <span className="font-bold text-slate-100 print:text-slate-900 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Nota de Transparencia de Auditoría:
              </span>
              <p>
                Este manual refleja el estado actual de la plataforma, distinguiendo con precisión la funcionalidad del código frente a dependencias externas:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Integración con Meta:</strong> Totalmente implementada y lista a nivel código; la activación de mensajería productiva de WhatsApp y webhooks en vivo depende actualmente del proceso de revisión y verificación de negocio de Meta Developers.</li>
                <li><strong>Worker de Railway / BullMQ:</strong> La arquitectura de tareas en segundo plano está completamente estructurada. Se encuentra condicionada externamente al reinicio del worker para restaurar su señal de vida (Heartbeat) en Railway.</li>
                <li><strong>Atención a Clientes y Captación:</strong> Finalizados por código, a la espera de la liberación de los webhooks de WhatsApp por parte del proveedor externo.</li>
                <li><strong>Salud del Sistema:</strong> Monitoreo real corregido y alineado sin uso de valores dummy, interactuando de forma nativa y directa con los servicios de OpenAI.</li>
              </ul>
            </div>
          </div>

          {/* 1. ESTRUCTURA DE PANELES */}
          <h2 id="roles">1. Estructura de paneles y roles</h2>
          <p>
            La plataforma opera bajo un modelo de software multiempresa seguro (Multi-tenant), asegurando el aislamiento absoluto de los datos de cada cliente:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-8 print:avoid-break">
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Globe className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Admin Inmobiliario (Tenant)</span>
              </div>
              <p className="text-sm text-slate-600">
                Instancia aislada asignada a cada cliente/inmobiliaria corporativa. Permite la administración diaria de leads, inventarios de propiedades, y la interacción con los agentes de WhatsApp asignados a su organización.
              </p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Superadmin (AgentOS)</span>
              </div>
              <p className="text-sm text-slate-600">
                Panel global restringido a los administradores generales de la plataforma. Proporciona control total de la infraestructura, supervisión del consumo de IA, administración comercial de las suscripciones de los tenants y configuración de marca.
              </p>
            </div>
          </div>

          {/* 2. AGENTOS 3.1 */}
          <h2 id="agentos">2. AgentOS: El cerebro operativo</h2>
          <p>
            <strong>AgentOS</strong> es el motor de inteligencia artificial de Raíces Pilot diseñado para automatizar y optimizar la operación de la plataforma de manera controlada y escalable:
          </p>
          <ul>
            <li><strong>Objetivos y Canvas:</strong> Mapeo visual y secuencial de objetivos de negocio, permitiendo la trazabilidad y auditoría paso a paso de cada ejecución (Run) realizada por la IA.</li>
            <li><strong>Biblioteca de Agentes:</strong> Módulo de perfiles altamente especializados (tales como Director Operativo, Agente de Marketing) con niveles de autonomía minuciosamente configurables por el Superadministrador.</li>
            <li><strong>Automatizaciones Controladas:</strong> Sistema de disparadores internos que no interactúan de forma directa con agentes externos sin contar previamente con una confirmación o aprobación humana estricta.</li>
            <li><strong>Calendario de Contenido:</strong> Interfaz gráfica interactiva que planifica, previsualiza y programa publicaciones destinadas a redes sociales, resguardando la calidad editorial y previniendo errores.</li>
          </ul>

          {/* 3. GOBERNANZA Y SEGURIDAD */}
          <h2 id="seguridad">3. Gobernanza y seguridad en producción</h2>
          <p>
            Con el objetivo de garantizar una operación segura y económicamente viable, AgentOS 3.1 implementa tres salvaguardas arquitectónicas principales:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-prose mb-8 print:avoid-break">
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <ShieldAlert className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Budget Guard</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">Control de presupuesto</p>
              <p className="text-xs text-slate-600">Establece límites duros a los consumos mensuales y diarios de tokens en APIs externas de IA para evitar sobrecostos accidentales.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <LayoutDashboard className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Readiness Center</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">Centro de preparación operativa</p>
              <p className="text-xs text-slate-600">Validador técnico automatizado que chequea en tiempo real las variables de entorno del servidor y la disponibilidad de los servicios externos críticos.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Flag className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Feature Flags</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">Controles de funciones</p>
              <p className="text-xs text-slate-600">Interruptores dinámicos que permiten activar o desactivar en caliente funciones experimentales o de alta sensibilidad en producción sin desplegar nuevo código.</p>
            </div>
          </div>

          {/* 4. INTEGRACIÓN META */}
          <h2 id="meta">4. Integración con Meta (Facebook, Instagram & WhatsApp)</h2>
          <p>
            La comunicación masiva y automatizada se gestiona a través de la API oficial de Meta, gobernada bajo los siguientes criterios de protección de marca:
          </p>
          <ol>
            <li><strong>Modo Read-Only (Solo Lectura):</strong> La plataforma se comunica de manera predeterminada en modo de consulta de métricas e historial de publicaciones, evitando escrituras directas no deseadas.</li>
            <li><strong>Aprobación Humana Obligatoria:</strong> Absolutamente todo el contenido multimedia o textual propuesto por el motor de IA CEO requiere una revisión visual y aprobación explícita dentro del Calendario de Contenido antes de ser publicado en las redes.</li>
            <li><strong>Scheduler (Programador de Tareas) Protegido:</strong> Las tareas de publicación agendadas son procesadas por un Worker en segundo plano, autenticado bajo secreto criptográfico exclusivo para prevenir manipulaciones de terceros.</li>
          </ol>

          {/* 5. PROTOCOLO DE DESPLIEGUE */}
          <h2 id="protocolo">5. Protocolo de despliegue y estabilidad</h2>
          <p>
            Para sostener un tiempo de actividad (uptime) superior al 99.9% en producción, el equipo de desarrollo debe cumplir rigurosamente el protocolo de estabilidad:
          </p>
          <blockquote>
            <strong>Regla de Oro de Base de Datos:</strong> Bajo ninguna circunstancia está permitido el uso de <code>prisma db push</code> en entornos de producción. Los cambios estructurales se deben aplicar exclusivamente mediante <code>prisma migrate deploy</code> para garantizar la coherencia del esquema relacional y evitar pérdida accidental de datos.
          </blockquote>
          <ul>
            <li><strong>Validación Estricta de Tipos:</strong> Es obligatoria la ejecución y paso exitoso de <code>tsc --noEmit</code> y <code>pnpm run build</code> de forma previa a autorizar cualquier despliegue automático hacia producción.</li>
            <li><strong>Cifrado Avanzado de Secretos:</strong> Los tokens de acceso de Meta y WhatsApp Business se resguardan mediante encriptación robusta AES-256 en reposo, garantizando que ninguna credencial crítica sea expuesta en respuestas del lado del cliente.</li>
            <li><strong>Cron Security:</strong> El endpoint encargado de disparar el planificador y la publicación automática está securizado mediante el secreto de autenticación <code>AGENTOS_CRON_SECRET</code>.</li>
          </ul>

          {/* 6. TOUR VIRTUAL 360° */}
          <h2 id="tour360">6. Tour virtual 360°</h2>
          <p>
            Raíces Pilot incorpora un módulo nativo de captura y visualización de tours inmersivos 360°, diseñado específicamente para que los corredores inmobiliarios puedan digitalizar y publicar propiedades directamente utilizando sus teléfonos inteligentes u otros dispositivos de captura:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-prose mb-8 print:avoid-break">
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Camera className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Captura Guiada Móvil</span>
              </div>
              <p className="text-xs text-slate-600">Asistente en pantalla que orienta al fotógrafo inmobiliario en la toma secuencial de <strong>18 capturas</strong> en ángulos fijos para componer una vista envolvente de manera fluida.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Layers className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Navegación Multi-Ambiente</span>
              </div>
              <p className="text-xs text-slate-600">Soporte nativo para mapear múltiples espacios de la propiedad (como Cocina, Habitación o Terraza) vinculándolos mediante transiciones cinemáticas fluidas.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <ScanLine className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Carga de Cámaras y Drones</span>
              </div>
              <p className="text-xs text-slate-600">Compatibilidad con imágenes equirrectangulares capturadas con drones o cámaras profesionales de 360° (ej: Ricoh Theta). Se admite un peso máximo de <strong>100 MB por imagen</strong> procesada en Cloudinary.</p>
            </div>
          </div>
          <h3>Hotspots (Puntos de Navegación Interactivos)</h3>
          <p>
            Los Hotspots funcionan como elementos de enlace visual interactivo distribuidos sobre la escena virtual. El administrador inmobiliario puede situar estos marcadores interactivos mediante un editor interactivo en el panel de control de la propiedad: simplemente se realiza un toque o clic en el suelo de la previsualización 360° para fijar la coordenada exacta y asignarle el ambiente de destino.
          </p>
          <blockquote>
            <strong>Flujo operativo estándar:</strong> Ficha de Propiedad → Módulo de Tours 360° → Crear Ambiente → Cargar Panorama equirrectangular → Abrir Editor → Posicionar Hotspots con un clic → Guardar y Publicar.
          </blockquote>

          {/* 7. CATÁLOGO PÚBLICO */}
          <h2 id="catalogo">7. Catálogo público de propiedades</h2>
          <p>
            Cada inmobiliaria tenant posee un catálogo en línea optimizado a nivel de motores de búsqueda, que permite exhibir de forma pública su inventario sin fricciones de inicio de sesión:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-8 print:avoid-break">
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Globe className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Dirección Única del Catálogo</span>
              </div>
              <p className="text-xs text-slate-600">Disponible públicamente en la ruta estándar <code>/{"{orgSlug}"}/catalog</code>, donde <code>orgSlug</code> representa el identificador exclusivo asignado a la inmobiliaria durante su registro.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <List className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Reglas de Visibilidad Estricta</span>
              </div>
              <p className="text-xs text-slate-600">Para asegurar un catálogo limpio y calificado, una propiedad es visible únicamente si su estado de inventario es <code>AVAILABLE</code> (Disponible) y cuenta con la bandera <code>publicVisible = true</code> activa.</p>
            </div>
          </div>
          <h3>Funcionalidades Clave del Catálogo</h3>
          <ul>
            <li><strong>Distintivo (Badge) de Tour 360°:</strong> Una etiqueta visual premium resalta de forma automática a aquellas propiedades que disponen de una experiencia de recorrido virtual cargada, atrayendo mayor volumen de clics de los usuarios.</li>
            <li><strong>Filtros Avanzados por URL:</strong> La segmentación de búsquedas (ej. Venta, Alquiler y con Tour Virtual) está mapeada mediante parámetros estándar de consulta (<code>?type=sale</code>, <code>?type=rent</code>, <code>?hasTour=true</code>), lo que permite compartir enlaces pre-filtrados para campañas de marketing en redes sociales.</li>
            <li><strong>Optimización SEO y OpenGraph:</strong> Todas las páginas de propiedades inyectan dinámicamente títulos descriptivos, descripciones de marketing y metatags OpenGraph para asegurar visualizaciones profesionales y llamativas al compartir enlaces por WhatsApp o redes sociales.</li>
          </ul>

          {/* 8. AGENTE IA EN EL TOUR */}
          <h2 id="ia-tour">8. Agente IA en el tour virtual</h2>
          <p>
            Cada recorrido interactivo publicado integra de forma complementaria un asistente virtual inteligente conversacional, disponible mediante un chat flotante interactivo en la ruta <code>/map/{"{propertyId}"}</code>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-prose mb-8 print:avoid-break">
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <MessageSquare className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Datos Factuales de la DB</span>
              </div>
              <p className="text-xs text-slate-600">El asistente responde estrictamente con los valores estructurados almacenados en la base de datos (precio, ubicación, cantidad de ambientes). No genera alucinaciones; si un dato no está registrado, invita cordialmente a contactar a un asesor.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Map className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Mapeo de Contexto Local</span>
              </div>
              <p className="text-xs text-slate-600">El modelo comprende de manera exacta qué propiedad está visualizando el usuario en pantalla, integrando su ficha descriptiva y las particularidades del sector geográfico en cada respuesta.</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 text-brand-700">
                <Bot className="h-4 w-4" />
                <span className="font-bold uppercase text-[11px] tracking-wider">Español Rioplatense Natural</span>
              </div>
              <p className="text-xs text-slate-600">Configurado con un voseo natural y amigable enfocado al mercado local. Opera bajo una <strong>temperatura estricta de 0.35</strong> para evitar variaciones creativas o imprecisión en los datos provistos al potencial comprador.</p>
            </div>
          </div>
          <blockquote>
            <strong>Experiencia Fluida sin Fricciones:</strong> La interacción del chat flotante no exige al visitante registrarse, completar formularios de contacto ni ingresar contraseñas de forma obligatoria. El asistente evacúa dudas fácticas al instante para elevar el compromiso de navegación del prospecto.
          </blockquote>

          {/* 9. GOBERNANZA COMERCIAL */}
          <h2 id="gobernanza">9. Gobernanza comercial y reglas de suscripción</h2>
          <p>
            Para proteger la estabilidad del servicio SaaS y resguardar la reputación operativa frente a posibles abusos en la creación de cuentas de prueba, el motor comercial de facturación y límites rige los accesos y visibilidad de los tenants de acuerdo con la siguiente matriz estructurada:
          </p>
          
          <h3>Matriz de Estados de Suscripción y Accesos</h3>
          <div className="overflow-x-auto not-prose mb-8 print:avoid-break">
            <table className="w-full border-collapse border border-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Estado (SubscriptionStatus)</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">¿Acceso al Panel?</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">¿Catálogo / Página Pública?</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Descripción de Comportamiento Comercial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">ACTIVE</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-bold">SÍ</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-bold">SÍ</td>
                  <td className="px-4 py-3 text-slate-600">Suscripción activa y al día mediante pago verificado en pasarela de cobros o cortesía del Superadministrador. Acceso total a funcionalidades.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">TRIALING</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-bold">SÍ</td>
                  <td className="px-4 py-3 text-center text-rose-600 font-bold">NO</td>
                  <td className="px-4 py-3 text-slate-600">Periodo inicial de pruebas gratuito (14 días). El acceso al panel está completamente habilitado, pero la página pública permanece inactiva para evitar la proliferación de cuentas de prueba, registros inactivos o clientes sin valor comercial confirmado.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">PAST_DUE</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-bold">SÍ (Con Alerta)</td>
                  <td className="px-4 py-3 text-center text-rose-600 font-bold">NO</td>
                  <td className="px-4 py-3 text-slate-600">Periodo de gracia tras registrarse un fallo en la renovación automática. El panel advierte mediante un aviso destacado sobre la mora y activa los flujos de cobro asistido conversacional.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">SUSPENDED</td>
                  <td className="px-4 py-3 text-center text-rose-600 font-bold">NO</td>
                  <td className="px-4 py-3 text-center text-rose-600 font-bold">NO</td>
                  <td className="px-4 py-3 text-slate-600">Servicio suspendido formalmente por mora persistente o decisión explícita del Superadministrador. El ingreso al panel queda bloqueado y se pausan automáticamente los flujos asíncronos y bots de WhatsApp.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Directrices de Actuación para la IA CEO</h3>
          <ul>
            <li><strong>Prioridad Absoluta de Anulación Manual:</strong> En caso de que el Superadministrador apruebe o fuerce una actualización manual en la base de datos (por ejemplo, asignando un método de pago offline como transferencia bancaria o cortesía), la lógica de negocio y las acciones de IA CEO priorizarán dicho cambio por sobre cualquier notificación o webhook automático de pasarelas de pago.</li>
            <li><strong>Exclusión en el Carrusel Público:</strong> Para resguardar la reputación estética y la solidez institucional de Raíces Pilot en sus canales de venta masiva, en ningún caso se listarán tenants que se encuentren en estado <code>TRIALING</code> o demostraciones inactivas dentro del carrusel corporativo o página pública del producto.</li>
            <li><strong>Gestión Asistida de Cobranzas:</strong> Ante escenarios de pago vencido (<code>PAST_DUE</code>), la IA puede emplear la acción estructurada <code>suggestBillingMessageAction</code> (Acción sugerida de cobranza asistida) para redactar y sugerir comunicaciones cordiales de recordatorio a los administradores del tenant, adjuntando el enlace directo y seguro de pago.</li>
          </ul>

        </article>

        <div className="mt-24 border-t-2 border-slate-100 pt-10 text-center print:avoid-break">
          <div className="flex justify-center gap-8 mb-6 grayscale opacity-30">
            <Globe className="h-6 w-6" />
            <Bot className="h-6 w-6" />
            <Zap className="h-6 w-6" />
            <Share2 className="h-6 w-6" />
            <Calendar className="h-6 w-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            Raíces Pilot Technical Blueprint v3.1 — Propiedad Intelectual de Inmuebles Digitales
          </p>
        </div>
      </div>
    </div>
  );
}
