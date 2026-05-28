import Image from "next/image";
import Link from "next/link";
import { Shield, Eye, Lock, FileText, ArrowLeft, Mail, Calendar } from "lucide-react";
import { Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export default function PrivacyPolicyPage() {
  return (
    <div className={cn("min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-white", montserrat.className)}>
      {/* Fondo decorativo premium */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-[10%] h-[600px] w-[600px] rounded-full bg-violet-950/10 blur-[150px]" />
        <div className="absolute top-[30%] right-[5%] h-[500px] w-[500px] rounded-full bg-slate-900/30 blur-[130px]" />
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.01) 1px, transparent 0)`,
            backgroundSize: '48px 48px' 
          }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#020617]/80 backdrop-blur-md sticky top-0">
        <div className="mx-auto max-w-5xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/brand/logo_transparent_icon.png" 
              alt="RaícesPilot Logo" 
              width={40} 
              height={40} 
              className="h-9 w-auto brightness-200" 
            />
            <span className="font-extrabold tracking-wider text-white text-lg">
              RAÍCES<span className="text-violet-500 font-medium">PILOT</span>
            </span>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 hover:text-white transition shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Acceso
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <div className="space-y-8">
          {/* Título e introducción */}
          <div className="text-center sm:text-left space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">
              <Shield className="h-3.5 w-3.5" />
              Privacidad y Seguridad
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Política de Privacidad
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Última actualización: Mayo 2026
              </span>
              <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-slate-800" />
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Raíces Pilot SaaS
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-7 max-w-3xl pt-2">
              En Raíces Pilot nos tomamos muy en serio la confidencialidad y protección de los datos de su inmobiliaria y de sus clientes. Esta Política de Privacidad describe de manera clara y profesional cómo recopilamos, utilizamos y resguardamos la información en el marco de la prestación de nuestros servicios de software para la gestión comercial y automatización inmobiliaria.
            </p>
          </div>

          <hr className="border-white/5 my-8" />

          {/* Secciones de la política */}
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">1</span>
                Información sobre el Servicio
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                <strong>Raíces Pilot</strong> es una plataforma tecnológica SaaS (Software as a Service) de alto rendimiento diseñada específicamente para empresas inmobiliarias. Nuestro sistema permite centralizar leads, gestionar flujos de comunicación a través de múltiples canales, automatizar la cualificación de clientes potenciales mediante inteligencia artificial y organizar el seguimiento operativo del inventario de propiedades.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">2</span>
                Datos que Recopilamos
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  Para proveer el software y garantizar su correcto funcionamiento, procesamos los siguientes tipos de información:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li><strong>Datos de contacto del usuario:</strong> Nombre completo, número de teléfono corporativo y dirección de correo electrónico al registrarse e interactuar con la plataforma.</li>
                  <li><strong>Mensajes y comunicaciones:</strong> Historial y contenido de los mensajes enviados y recibidos por los usuarios finales a través de los canales oficiales conectados, como WhatsApp Cloud API.</li>
                  <li><strong>Datos de inmobiliarias y usuarios corporativos:</strong> Información sobre la configuración de las inmobiliarias aliadas, equipos de agentes y sus permisos de acceso.</li>
                  <li><strong>Datos del CRM y operaciones:</strong> Historial de contactos, leads registrados, agendamiento de visitas, fichas de propiedades y notas internas de seguimiento.</li>
                  <li><strong>Interacciones con IA:</strong> Registros de las conversaciones asistidas por los agentes inteligentes del sistema, creados exclusivamente para optimizar la respuesta comercial.</li>
                  <li><strong>Registros de auditoría:</strong> Bitácora de logs operativos del sistema para garantizar el cumplimiento normativo, la trazabilidad del servicio y la seguridad de la información.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">3</span>
                Finalidad del Tratamiento de Datos
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  Los datos recopilados se utilizan únicamente para los siguientes propósitos operativos y comerciales legítimos:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>Prestar de manera correcta y estable las funciones del software SaaS.</li>
                  <li>Responder de manera inmediata y automatizada a las consultas comerciales de clientes interesados a través del número oficial de la plataforma.</li>
                  <li>Gestionar solicitudes de soporte técnico, incidentes y requerimientos de atención al cliente.</li>
                  <li>Facilitar la automatización de la cualificación comercial de leads para aumentar el rendimiento de su inmobiliaria.</li>
                  <li>Monitorear la estabilidad técnica y el rendimiento operativo del software para prevenir fraudes, intrusiones o errores.</li>
                  <li>Mantener la bitácora de auditoría y logs requeridos para la trazabilidad operativa del Panel Superadmin.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">4</span>
                Integración con WhatsApp / Meta
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  Nuestra plataforma utiliza herramientas de comunicación de terceros para optimizar la mensajería del sistema.
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>El procesamiento de mensajes enviados al número maestro oficial de Raíces Pilot y a los números individuales de las inmobiliarias utiliza los servicios oficiales de **WhatsApp Cloud API** provistos por **Meta Platforms, Inc.**</li>
                  <li>El tratamiento de estos datos cumple estrictamente con las políticas requeridas por Meta Developers para las aplicaciones en producción.</li>
                  <li>Estos mensajes son procesados únicamente con fines de comunicación instantánea, soporte directo y automatización comercial autorizada.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">5</span>
                Uso de Inteligencia Artificial
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Algunos flujos de comunicación inicial pueden ser asistidos o delegados temporalmente a módulos de inteligencia artificial de Raíces Pilot con el objetivo de perfilar el interés de compra, venta o alquiler de manera ágil. El sistema cuenta con mecanismos para que los agentes inmobiliarios o el equipo de soporte tomen el control manual de la conversación en cualquier momento, asegurando siempre una supervisión humana adecuada.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">6</span>
                Protección y Confidencialidad
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  Raíces Pilot aplica las mejores prácticas de seguridad de la industria para salvaguardar sus datos:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li><strong>No comercialización:</strong> Bajo ninguna circunstancia vendemos, alquilamos ni transferimos sus datos personales o los de sus clientes a terceros con fines publicitarios o ajenos a la prestación del servicio.</li>
                  <li><strong>Seguridad de Datos:</strong> Implementamos medidas de seguridad técnicas, lógicas y organizativas razonables, como conexiones cifradas y almacenamiento aislado.</li>
                  <li><strong>Control de Acceso:</strong> El acceso a los datos está restringido de manera estricta únicamente al personal técnico y operativo autorizado bajo acuerdos de confidencialidad.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">7</span>
                Proveedores y Terceros Autorizados
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Para el cumplimiento estable de las funciones, los datos pueden ser procesados a través de infraestructura de proveedores tecnológicos de confianza, incluyendo: **Meta Platforms, Inc.** (WhatsApp Cloud API), **OpenAI Inc.** (asistencia de IA para cualificación comercial), infraestructura de hosting y bases de datos seguras contratadas por la plataforma, y herramientas corporativas internas estrictamente controladas.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">8</span>
                Derechos de los Usuarios
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Usted y sus clientes cuentan con el pleno derecho de solicitar el acceso, rectificación, limitación o eliminación completa de sus datos personales almacenados en la plataforma, conforme a las normativas de protección de datos personales vigentes en la República Argentina y demás territorios de alcance del software.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">9</span>
                Contacto y Consultas
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 flex flex-col gap-3">
                <p>
                  Para ejercer sus derechos de privacidad, realizar consultas o solicitar asistencia directa sobre el tratamiento de datos, puede comunicarse oficialmente con nuestro equipo:
                </p>
                <div className="inline-flex self-start items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-4 mt-1">
                  <Mail className="h-5 w-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correo Electrónico Oficial</p>
                    <a href="mailto:adminraicespilot@gmail.com" className="text-sm font-bold text-white hover:text-violet-300 transition-colors">
                      adminraicespilot@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#010409] py-8 text-center text-xs text-slate-500 font-semibold tracking-wider uppercase">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Inmuebles Digitales / Raíces Pilot. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span className="text-slate-600">v2.5.1 Stable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
