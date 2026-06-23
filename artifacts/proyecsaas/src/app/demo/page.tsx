import type { Metadata } from "next";
import {
  Eye,
  Users,
  MessageSquare,
  Home,
  CalendarCheck,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getDemoShowcase } from "@/server/demo/demo-content";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Demo Raíces Pilot — Modo demo (datos de ejemplo)",
  description:
    "Demo read-only de Raíces Pilot: CRM, Inbox IA, propiedades, catálogo y desarrollos con datos ficticios.",
  robots: { index: false, follow: false },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default function DemoPage() {
  const data = getDemoShowcase();
  const { org, kpis, leads, properties, visits, inbox, development } = data;

  const kpiCards = [
    { label: "Oportunidades", value: kpis.opportunities, icon: Users },
    { label: "Conversaciones IA", value: kpis.aiConversations, icon: MessageSquare },
    { label: "Propiedades activas", value: kpis.activeProperties, icon: Home },
    { label: "Visitas", value: kpis.visits, icon: CalendarCheck },
    { label: "Lotes (demo)", value: kpis.lots, icon: LayoutGrid },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Banner Modo demo */}
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50/95 backdrop-blur px-4 py-2.5">
        <div className="mx-auto flex max-w-6xl items-start gap-2 text-amber-800">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs font-medium leading-snug">
            <span className="font-black uppercase tracking-widest">Modo demo — Datos de ejemplo.</span>{" "}
            Estás viendo una demo read-only de Raíces Pilot. Estos datos son ficticios y no se guardan cambios, no se envían WhatsApp, no se crean reservas y no se modifican datos reales.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-12">
        {/* Hero */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> Demo Raíces Pilot
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Una inmobiliaria, todo en un solo lugar
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Mirá cómo {org.name} ({org.city}) organiza oportunidades, conversaciones de IA, propiedades y desarrollos desde Raíces Pilot — sin planillas ni mensajes perdidos.
          </p>
          <nav className="flex flex-wrap gap-2 pt-1">
            {[
              ["#crm", "Ver CRM"],
              ["#inbox", "Ver Inbox IA"],
              ["#propiedades", "Ver propiedades"],
              ["#desarrollo", "Ver desarrollo"],
              ["#catalogo", "Ver catálogo"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
                {label}
              </a>
            ))}
          </nav>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpiCards.map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <k.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{k.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
            </div>
          ))}
        </section>

        {/* CRM / Oportunidades */}
        <section id="crm" className="space-y-4">
          <SectionTitle icon={Users} kicker="CRM" title="Oportunidades" />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Origen</th>
                  <th className="px-4 py-3 hidden md:table-cell">Interés</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Presupuesto</th>
                  <th className="px-4 py-3">Último contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{l.fullName}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{l.statusEs}</span></td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500">{l.sourceEs}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">{l.interestEs}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{l.budgetLabel}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(l.lastContactAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Inbox IA */}
        <section id="inbox" className="space-y-4">
          <SectionTitle icon={MessageSquare} kicker="Atención IA" title="Inbox IA" />
          <p className="-mt-2 text-xs text-slate-500">
            Simulación read-only: en producción, estas conversaciones llegan desde WhatsApp y Raíces Pilot puede crear la oportunidad automáticamente.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {inbox.map((c) => (
              <div key={c.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-900">{c.contact}</p>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{c.interestEs}</span>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-xs text-slate-700">{c.clientMessage}</p>
                  <p className="rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-2 text-xs text-white">{c.aiReply}</p>
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Oportunidad: <span className="text-brand-600">{c.linkedOpportunity}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Propiedades */}
        <section id="propiedades" className="space-y-4">
          <SectionTitle icon={Home} kicker="Inventario" title="Propiedades" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.titleEs}
                  loading="lazy"
                  className="h-40 w-full bg-slate-100 object-cover"
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">{p.titleEs}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{p.statusEs}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{p.neighborhood}, {p.city} · {p.typeEs}</p>
                  <p className="mt-2 text-lg font-black text-brand-700">{p.priceLabel}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{p.bedrooms} amb · {p.bathrooms} baños · {p.surfaceM2} m²</p>
                  <span className="mt-3 inline-flex w-fit cursor-default items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ver ficha (demo)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Desarrollo / Masterplan */}
        <section id="desarrollo" className="space-y-4">
          <SectionTitle icon={LayoutGrid} kicker="Desarrollos" title="Desarrollo demo" />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">{development.name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{development.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Lotes totales", development.totalLots, "text-slate-900"],
                ["Disponibles", development.available, "text-emerald-600"],
                ["Reservados", development.reserved, "text-amber-600"],
                ["Vendidos", development.sold, "text-slate-500"],
              ].map(([label, value, color]) => (
                <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                  <p className={`text-2xl font-black ${color}`}>{value as number}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label as string}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              En producción, el masterplan interactivo muestra cada lote con su estado en tiempo real y la reserva se gestiona desde el catálogo público.
            </p>
          </div>
        </section>

        {/* Catálogo público demo */}
        <section id="catalogo" className="space-y-4">
          <SectionTitle icon={LayoutGrid} kicker="Cara pública" title="Catálogo público demo" />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Este es el tipo de catálogo que una inmobiliaria puede compartir con sus clientes por un enlace: las propiedades marcadas como públicas aparecen con fotos, ubicación y tour 360°. Tus clientes consultan y la IA responde por WhatsApp.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {properties.filter((p) => p.publicVisible).map((p) => (
                <span key={p.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {p.titleEs} · {p.priceLabel}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre HITL / seguridad */}
        <footer className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p>
            Demo de solo lectura. Ningún dato de esta pantalla se guarda ni se envía. Para operar con datos reales, una inmobiliaria conecta su WhatsApp, activa su agente IA y carga su inventario.
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, kicker, title }: { icon: React.ComponentType<{ className?: string }>; kicker: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600">{kicker}</p>
        <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>
    </div>
  );
}
