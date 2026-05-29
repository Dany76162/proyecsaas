import Image from "next/image";
import Link from "next/link";
import { Shield, Lock, FileText, ArrowLeft, Mail, Calendar, Scale, Bot, Globe, ShieldAlert } from "lucide-react";
import { Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Términos y Condiciones de Uso | Raíces Pilot",
  description: "Términos y condiciones de uso de la plataforma operativa de automatización y gestión inmobiliaria Raíces Pilot.",
};

export default function TermsAndConditionsPage() {
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
              alt="Raíces Pilot Logo" 
              width={40} 
              height={40} 
              className="h-9 w-auto brightness-200" 
            />
            <span className="font-extrabold tracking-wider text-white text-lg">
              RAÍCES<span className="text-violet-500 font-medium">PILOT</span>
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 hover:text-white transition shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Inicio
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <div className="space-y-8">
          {/* Título e introducción */}
          <div className="text-center sm:text-left space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">
              <Scale className="h-3.5 w-3.5" />
              Marco Legal de Operación
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Términos y Condiciones
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

            {/* Nota de revisión legal */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                <strong>NOTA IMPORTANTE:</strong> Este documento constituye la base operativa de uso de la plataforma. Queda expresamente establecido que el mismo se encuentra sujeto a revisión legal profesional definitiva antes del lanzamiento masivo al mercado.
              </p>
            </div>

            <p className="text-slate-300 text-sm leading-7 pt-2">
              Te damos la bienvenida a **Raíces Pilot**. Al utilizar nuestro software, servicios y canales autorizados, aceptás de forma íntegra los presentes Términos y Condiciones de Uso. Leé detenidamente este documento para comprender tus derechos, responsabilidades y las políticas que regulan el uso de nuestra tecnología.
            </p>
          </div>

          <hr className="border-white/5 my-8" />

          {/* Secciones */}
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">1</span>
                Introducción y Aceptación
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma **Raíces Pilot**. Al registrar una cuenta de inmobiliaria, habilitar agentes autorizados o acceder al software desde cualquier navegador, declarás tener la autoridad legal para vincular comercialmente a tu organización y aceptás someterte a este marco operativo.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">2</span>
                Identificación del Servicio
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                **Raíces Pilot** es una plataforma integral SaaS (Software as a Service) de gestión comercial y automatización para inmobiliarias. La plataforma centraliza consultas, gestiona un catálogo de propiedades, asiste en la creación de tours virtuales 360°, programa visitas en calendarios compartidos y automatiza flujos conversacionales iniciales de calificación mediante agentes inteligentes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">3</span>
                Uso Permitido y Responsabilidad
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  El Usuario se compromete a hacer un uso exclusivamente comercial, lícito y ético de la plataforma. Queda estrictamente prohibido:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>El uso del sistema para el envío masivo de mensajes no solicitados (spam) o acoso comercial.</li>
                  <li>La manipulación de variables internas o vulneración del aislamiento multi-tenant del software.</li>
                  <li>Cualquier intento de extracción no autorizada de datos de propiedades de otros miembros de la red.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">4</span>
                Cuentas de Usuario y Permisos
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                La inmobiliaria titular es la única responsable por la veracidad de la información del inventario publicado, del comportamiento comercial de sus agentes de ventas autorizados y de resguardar de forma segura las credenciales de acceso de su equipo de trabajo.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">5</span>
                Uso de Inteligencia Artificial (IA)
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  La plataforma utiliza modelos avanzados de lenguaje de terceros (como OpenAI) para perfilar, organizar y agilizar las respuestas. El Usuario reconoce y acepta que:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>La inteligencia artificial opera como asistente o copiloto automatizado, no sustituyendo el criterio ni la supervisión periódica de un operador humano.</li>
                  <li>La plataforma no garantiza la infalibilidad absoluta de la IA en la redacción de respuestas y el Usuario deslinda a Raíces Pilot de cualquier error de alucinación del modelo en la interacción con prospectos.</li>
                  <li>No se promete acceso a consumo ilimitado de IA de manera gratuita ni incluida bajo precios base.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">6</span>
                WhatsApp / Meta y Servicios de Terceros
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  Las integraciones de mensajería interactúan con las plataformas y APIs oficiales provistas por Meta Platforms, Inc.
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>El funcionamiento en producción del canal oficial de WhatsApp queda estrictamente supeditado a los procesos de aprobación externa de Meta Business.</li>
                  <li>Raíces Pilot no asume ninguna responsabilidad ante suspensiones de números, bloqueos de canales o cambios en las políticas tarifarias comerciales dictados de forma directa y unilateral por Meta Platforms, Inc.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">7</span>
                CRM, Catálogo e Inventario
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                La inmobiliaria garantiza que ostenta plenos derechos y autorizaciones sobre las fichas, descripciones e imágenes de las propiedades cargadas en su inventario activo. El Usuario acepta que la creación de tours virtuales 360° mediante el giroscopio de la web está sujeta a la estabilidad y compatibilidad técnica del hardware del teléfono inteligente utilizado.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">8</span>
                Planes, Suscripciones y Pagos
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                El acceso general se regula bajo esquemas de suscripción mensuales o anuales controlados técnicamente. La plataforma utiliza pasarelas de pago seguras de terceros (como Mercado Pago). El retraso en los pagos facultará la auto-pausa de los agentes de IA y la suspensión temporal del acceso a los módulos operativos del workspace.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">9</span>
                Licencia Vitalicia (Lifetime / SaaS-to-Own)
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 space-y-3">
                <p>
                  Cualquier política comercial vinculada a la licencia vitalicia se asocia exclusivamente al derecho de uso del software base.
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>**Consumos Externos Excluidos**: Los consumos por procesamiento de modelos de IA, envíos de WhatsApp Cloud API, almacenamiento extra de imágenes/tours 360° de gran escala, soporte avanzado y módulos premium complementarios **NO** quedan incluidos de por vida y se cobrarán de forma independiente según el uso.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">10</span>
                Suspensión y Limitación de Acceso
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Nos reservamos el derecho unilateral de suspender el acceso de cualquier organización que incurra en malas prácticas comerciales verificadas, retrasos prolongados en pagos de consumos, intentos de manipulación técnica del código o comportamientos fraudulentos que atenten contra la reputación de la red.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">11</span>
                Protección de Datos y Privacidad
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                La recopilación y el resguardo de la información de tu cuenta, equipo técnico e historial conversacional con prospectos se rigen de forma directa y complementaria bajo los lineamientos seguros de nuestra{" "}
                <Link href="/privacy" className="text-violet-400 hover:text-violet-300 font-bold underline transition-colors">
                  Política de Privacidad
                </Link>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">12</span>
                Propiedad Intelectual
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Todo el código de programación, arquitectura multi-tenant, logotipos, motores de integración conversacional de IA y diseños del software son propiedad intelectual exclusiva de los propietarios de **Raíces Pilot**. Queda estrictamente prohibida la ingeniería inversa, copia, distribución o plagio parcial o total de la infraestructura técnica.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">13</span>
                Limitación de Responsabilidad
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                **Raíces Pilot** provee herramientas tecnológicas "tal como están" y no garantiza cierres de ventas, conversiones aseguradas ni el éxito de las negociaciones de las inmobiliarias aliadas. No seremos responsables en ningún caso por lucro cesante, pérdidas operativas o interrupciones técnicas derivadas de fallos en proveedores de nube o APIs de mensajería.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">14</span>
                Modificaciones Futuras
              </h2>
              <p className="text-slate-300 text-sm leading-7 pl-9">
                Nos reservamos el derecho de modificar los presentes términos en el futuro para ajustarlos a cambios regulatorios en APIs de Meta, integraciones de IA o evoluciones del modelo operativo SaaS. El uso continuo de la plataforma representará la aceptación voluntaria de las nuevas directrices.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 text-sm font-black">15</span>
                Contacto Oficial
              </h2>
              <div className="text-slate-300 text-sm leading-7 pl-9 flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-4 flex-1">
                  <Mail className="h-5 w-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correo Electrónico</p>
                    <a href="mailto:adminraicespilot@gmail.com" className="text-sm font-bold text-white hover:text-violet-300 transition-colors">
                      adminraicespilot@gmail.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-4 flex-1">
                  <Globe className="h-5 w-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WhatsApp Oficial</p>
                    <a href="https://wa.me/5491166037990" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-violet-300 transition-colors">
                      +54 9 11 6603-7990
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
