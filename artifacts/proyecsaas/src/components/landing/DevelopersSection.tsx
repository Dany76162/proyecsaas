import { Map, Activity, Compass, ArrowRight, CheckCircle2 } from "lucide-react";

const DEV_WHATSAPP_URL =
  "https://wa.me/5491166037990?text=Hola%2C%20quiero%20una%20demo%20de%20Ra%C3%ADces%20Pilot%20para%20mi%20desarrollo%20o%20loteo.";

const CARDS = [
  {
    icon: Map,
    title: "Masterplan interactivo",
    desc: "Tu plano, navegable. Cada manzana y lote sobre el plano real del emprendimiento, con su superficie, precio y estado. El cliente hace clic y ve la ficha completa.",
  },
  {
    icon: Activity,
    title: "Disponibilidad en tiempo real",
    desc: "Disponible, reservado o vendido: cuando tu equipo cambia el estado de un lote, el plano público lo refleja al instante para todos. Se terminaron los PDFs desactualizados.",
  },
  {
    icon: Compass,
    title: "Tour 360° del lugar",
    desc: "Recorré el emprendimiento sin moverte. Subí tomas 360° reales y dejá que el cliente camine por el loteo desde el celular, antes de pisar el terreno.",
  },
] as const;

export function DevelopersSection() {
  return (
    <section
      id="desarrollos"
      className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 py-20 lg:py-24 border-y border-slate-100 dark:border-slate-900 transition-colors duration-300"
    >
      {/* Decorative background */}
      <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[700px] h-[700px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400 mb-6">
            <Compass className="h-3.5 w-3.5" />
            Para Desarrolladoras y Loteos
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl leading-tight">
            Mostrá tu loteo como{" "}
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              nunca antes.
            </span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-350 font-medium">
            Llevá tu emprendimiento a una experiencia digital: tus clientes exploran el plano
            interactivo, ven qué lotes están disponibles en tiempo real y recorren el lugar en 360°.
            Todo conectado a la misma IA que atiende y califica tus consultas por WhatsApp.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-7 shadow-sm transition-all duration-300 hover:shadow-md dark:hover:border-brand-500/30"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <card.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{card.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={DEV_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-700 sm:w-auto"
          >
            Solicitar demo para mi desarrollo <ArrowRight className="h-4 w-4" />
          </a>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-brand-500" />
            Te acompañamos en la carga de tu primer loteo.
          </span>
        </div>
      </div>
    </section>
  );
}
