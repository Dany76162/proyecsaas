export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare, 
  Inbox, 
  Users, 
  BarChart3, 
  Clock, 
  LayoutGrid,
  Zap,
  Building,
  ShieldCheck,
  Compass,
  Activity,
  Globe,
  Smartphone,
  Laptop
} from "lucide-react";

import { resolveSignedInHomePath } from "@/server/auth/access";
import { getSessionUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";
import { AccessRequestForm } from "./solicitar-acceso/access-request-form";
import { ClientMarquee } from "@/components/landing/client-marquee";
import { LandingHeroCarousel } from "@/components/landing/LandingHeroCarousel";
import { MobilitySection } from "@/components/landing/MobilitySection";
import Image from "next/image";

const DEMO_WHATSAPP_URL =
  "https://wa.me/5491161630205?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20RaicesPilot%20para%20mi%20inmobiliaria.";

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-0 shrink-0">
          <img 
            src="/brand/logo_transparent_icon.png" 
            alt="RaícesPilot Logo" 
            className="h-10 sm:h-16 w-auto object-contain brightness-0" 
          />
          <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900 -ml-1">
            <span className="text-brand-600">RAÍCES</span><span className="font-light">Pilot</span>
          </span>
        </div>
        
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#producto" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition">Producto</a>
          <a href="#como-funciona" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition">Cómo funciona</a>
          <a href="#beneficios" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition">Beneficios</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Acceder</Link>
          </Button>
          <Button asChild size="sm" className="sm:hidden">
            <Link href="/login">
              Acceder
            </Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Solicitar demo
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(await resolveSignedInHomePath(sessionUser));
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 text-slate-900">
      <Navbar />

      <main className="pt-16 pb-16">
        {/* CAROUSEL VISUAL PREMIUM */}
        <LandingHeroCarousel />

        {/* HERO SECTION - COMPACT */}
        <section className="mx-auto max-w-7xl px-6 pt-12 pb-12 text-center lg:pt-16">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700 mb-6">
              <Zap className="h-3.5 w-3.5" />
              Infraestructura Comercial
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              La plataforma operativa para inmobiliarias modernas.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 max-w-2xl mx-auto">
              Centralizá leads, conversaciones, propiedades y seguimiento comercial en un sistema diseñado para trabajar mejor todos los días.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto shadow-md bg-brand-600 hover:bg-brand-700">
                <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Solicitar demo <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto border-slate-300">
                <Link href="/login">Acceder al sistema</Link>
              </Button>
            </div>
          </div>

        </section>

        <ClientMarquee />

        {/* BENEFICIOS PRINCIPALES */}
        <section id="beneficios" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Eficiencia en cada paso</h2>
            <p className="mt-4 text-slate-600">Diseñado para minimizar la fricción operativa y maximizar conversiones.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Clock,
                title: "Respondé mientras tu equipo está ocupado",
                desc: "Atención 24/7 sin demoras ni pérdida de interés."
              },
              {
                icon: Inbox,
                title: "Cada consulta entra con contexto",
                desc: "Los prospectos se perfilan y organizan automáticamente en tu embudo."
              },
              {
                icon: LayoutGrid,
                title: "Seguimiento claro desde el inicio",
                desc: "Un CRM diseñado específicamente para la operativa inmobiliaria."
              },
              {
                icon: Users,
                title: "Intervención en el momento clave",
                desc: "Tu equipo asume el control solo cuando hay oportunidad real de cierre."
              }
            ].map((b, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900">{b.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">
                  Flujo de trabajo inteligente
                </h2>
                <div className="space-y-8">
                  {[
                    {
                      num: "01",
                      title: "El prospecto escribe por WhatsApp",
                      desc: "Cualquier consulta nueva ingresa inmediatamente al sistema sin demoras."
                    },
                    {
                      num: "02",
                      title: "RaicesPilot responde y organiza",
                      desc: "La IA interactúa, califica el interés y perfila al cliente basándose en tu inventario."
                    },
                    {
                      num: "03",
                      title: "Tu equipo interviene",
                      desc: "Los agentes asumen el control en el momento adecuado con todo el contexto necesario."
                    }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                        {step.num}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{step.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-lg lg:max-w-xl">
                <div className="relative aspect-square overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-brand-500/10">
                  <Image
                    src="/landing/brand_final.png"
                    alt="Identidad corporativa de Raices Pilot - Real Estate Company"
                    fill
                    className="object-cover rounded-[2rem]"
                  />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-brand-500/10 blur-3xl rounded-full" />
                <div className="absolute -top-6 -left-6 h-32 w-32 bg-slate-500/10 blur-3xl rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* MOBILITY & WEB ACCESS SECTION */}
        <MobilitySection />

        {/* PRODUCT PREVIEW / INFRASTRUCTURE (Dark Section) */}

        {/* PRODUCT PREVIEW / INFRASTRUCTURE (Dark Section) */}
        <section id="producto" className="bg-slate-950 py-20 text-slate-50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center">
              <span className="text-brand-400 font-bold tracking-widest uppercase text-xs mb-2 block">Infraestructura</span>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Todo lo que necesitas en un solo lugar</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Un entorno operativo profesional, diseñado para escalar la gestión de tu inmobiliaria sin perder el control.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Panel Analítico", icon: BarChart3, desc: "Métricas comerciales y estado del embudo en tiempo real." },
                { title: "CRM Inmobiliario", icon: Users, desc: "Gestión de oportunidades, estados y asignación de agentes." },
                { title: "Bandeja Conversacional", icon: MessageSquare, desc: "Centro de inteligencia que unifica IA y equipo humano." },
                { title: "Inventario Activo", icon: Building, desc: "Control total sobre tu catálogo de propiedades." },
                { title: "Panel de Administración", icon: ShieldCheck, desc: "Control de permisos, roles y configuración de sucursales." },
                { title: "Métricas Operativas", icon: Activity, desc: "Visibilidad total sobre tiempos de respuesta y conversión." }
              ].map((feature, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10">
                  <feature.icon className="h-6 w-6 text-brand-400 mb-4" />
                  <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONFIANZA OPERATIVA */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="rounded-3xl bg-brand-50 border border-brand-100 p-8 md:p-16 text-center">
            <h2 className="text-2xl font-bold text-brand-900 mb-8">Nuestros Objetivos Operativos</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xl font-bold text-brand-600 mb-2">Más velocidad</div>
                <div className="text-sm font-medium text-brand-800">Diseñado para minimizar prospectos perdidos por falta de respuesta.</div>
              </div>
              <div>
                <div className="text-xl font-bold text-brand-600 mb-2">Más agilidad</div>
                <div className="text-sm font-medium text-brand-800">En la calificación inicial y perfilado de prospectos.</div>
              </div>
              <div>
                <div className="text-xl font-bold text-brand-600 mb-2">Visibilidad total</div>
                <div className="text-sm font-medium text-brand-800">Sobre la operación y rendimiento de tu equipo comercial.</div>
              </div>
              <div>
                <div className="text-xl font-bold text-brand-600 mb-2">Atención 24/7</div>
                <div className="text-sm font-medium text-brand-800">Seguimiento centralizado y activo en todo momento.</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION FORMULARIO DIRECTO */}
        <section id="contacto" className="w-full bg-gradient-to-b from-white to-slate-50/50 border-y border-slate-100 py-24 lg:py-32 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-brand-50/50 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-slate-100/50 rounded-full blur-3xl opacity-50 pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              
              {/* Texto explicativo */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700 mb-6">
                  Comienza Hoy
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl mb-6 leading-tight">
                  ¿Estás listo para modernizar tu inmobiliaria?
                </h2>
                <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                  Completá el formulario y coordinamos una demo. Te mostramos cómo RaicesPilot puede ayudarte a organizar tus prospectos, automatizar el seguimiento y cerrar más ventas sin complicaciones técnicas.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700">
                  <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 mt-0.5">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Implementación</div>
                      <div className="text-xs text-slate-500 mt-0.5">Te guiamos paso a paso.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 mt-0.5">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Soporte</div>
                      <div className="text-xs text-slate-500 mt-0.5">Asistencia técnica directa.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sm:col-span-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 mt-0.5">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Configuración de IA</div>
                      <div className="text-xs text-slate-500 mt-0.5">Ajustamos los agentes a las respuestas ideales de tu inmobiliaria.</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Formulario */}
              <div className="relative lg:ml-auto w-full max-w-lg xl:max-w-xl">
                <div className="absolute -inset-4 bg-brand-500/10 blur-2xl rounded-full pointer-events-none" />
                <div className="relative bg-white rounded-3xl shadow-xl ring-1 ring-slate-100 p-2 sm:p-4">
                  <AccessRequestForm />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto px-6 py-20 lg:py-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-16 sm:px-12 text-center shadow-2xl relative">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6 relative z-10">
              Modernizá la operación comercial de tu inmobiliaria.
            </h2>
            <p className="text-slate-400 mb-10 max-w-2xl mx-auto relative z-10 text-lg">
              Dejá atrás el caos de los mensajes perdidos y el seguimiento manual. Sumate a las agencias que ya operan a otro nivel.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
              <Button size="lg" className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-white border-0" asChild>
                <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Solicitar demo
                </a>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" asChild>
                <Link href="/login">Acceder al sistema</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-0 font-bold text-slate-900">
            <img 
              src="/brand/logo_transparent_icon.png" 
              alt="Logo" 
              className="h-10 md:h-12 w-auto object-contain brightness-0" 
            />
            <span className="text-brand-600 -ml-0.5">RAÍCES</span>Pilot
          </div>
          <p>© {new Date().getFullYear()} RaicesPilot. Plataforma Operativa Inmobiliaria.</p>
        </div>
      </footer>
    </div>
  );
}
