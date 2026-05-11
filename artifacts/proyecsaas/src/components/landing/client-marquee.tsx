import { Building2, Home, Landmark, School, Store, Warehouse } from "lucide-react";

const CLIENTS = [
  { main: "MelePropiedades", sub: "Inmobiliaria" },
  { main: "Alberto Capelli", sub: "Martillero" },
  { main: "SevenToop", sub: "Marketing Digital" },
  { main: "RaicesPilot", sub: "Tecnología Inmobiliaria", isPlaceholder: true },
];

export function ClientMarquee() {
  return (
    <section className="w-full py-16 bg-white overflow-hidden border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-6 mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Quienes ya usan RaicesPilot
        </h2>
      </div>

      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...CLIENTS, ...CLIENTS, ...CLIENTS, ...CLIENTS].map((client, i) => (
            <div key={`client-${i}`} className={`mx-16 flex flex-col items-center justify-center text-center transition-all duration-500 cursor-default group`}>
              <span className="text-2xl font-black tracking-tighter text-slate-800 uppercase grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                {client.main}
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-1 opacity-60 group-hover:opacity-100 transition-all">
                {client.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Shadow Overlays for fade effect */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
      </div>
    </section>
  );
}
