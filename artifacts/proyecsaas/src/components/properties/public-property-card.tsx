import Link from "next/link";
import { Building2, Compass, MapPin, Maximize2, Bed, Bath, Car, ChevronRight, Phone } from "lucide-react";

// Tarjeta visual ÚNICA de propiedad pública. Clona el subcomponente `FullCard`
// del buscador global (`public-map-wrapper.tsx`, la tarjeta pública real) para
// que el Modo Demo (/demo) use el mismo sistema visual sin duplicar diseño ni
// acoplarse a Prisma/DB. 100% presentacional: recibe strings/props simples.
// `readOnly` (demo) renderiza los CTA como spans no-clickables, visualmente
// idénticos, sin navegación ni WhatsApp real.
export type PublicPropertyCardProps = {
  imageUrl: string | null;
  title: string;
  priceLabel: string;
  location: string;
  /** Badge oscuro de operación (ej. "Venta", "Alquiler", "Propiedad"). */
  badgeLabel?: string;
  organizationName: string;
  /** Ya formateado, ej. "84m²" o "–". */
  surfaceLabel: string;
  /** Ya formateado, ej. "2" o "–". */
  bedroomsLabel: string;
  bathroomsLabel: string;
  /** Si null/undefined, no se muestra la cochera (igual que FullCard real). */
  garageLabel?: string | null;
  hasTour360?: boolean;
  hasPlan?: boolean;
  isFeatured?: boolean;
  detailHref?: string | null;
  consultHref?: string | null;
  consultExternal?: boolean;
  /** Demo: CTAs visuales pero inofensivos (spans, sin navegación). */
  readOnly?: boolean;
};

const VER_FICHA_CLS =
  "flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition";
const CONSULTAR_CLS =
  "flex items-center justify-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-semibold text-white transition";

export function PublicPropertyCard(props: PublicPropertyCardProps) {
  const {
    imageUrl,
    title,
    priceLabel,
    location,
    badgeLabel = "Propiedad",
    organizationName,
    surfaceLabel,
    bedroomsLabel,
    bathroomsLabel,
    garageLabel,
    hasTour360 = false,
    hasPlan = false,
    isFeatured = false,
    detailHref,
    consultHref,
    consultExternal = false,
    readOnly = false,
  } = props;

  const detailClickable = !readOnly && !!detailHref;
  const consultClickable = !readOnly && !!consultHref;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Building2 className="h-12 w-12" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isFeatured && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm">Destacada</span>
          )}
          <span className="rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
            {badgeLabel}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          {hasTour360 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow">
              <Compass className="h-3 w-3 animate-spin-slow" /> Tour 360°
            </span>
          )}
          {hasPlan && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow">
              Plano
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ofrecido por</span>
            <span className="rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {organizationName}
            </span>
          </div>
          <h3 className="line-clamp-2 font-bold text-slate-950 group-hover:text-brand-600 transition leading-snug">{title}</h3>
          <p className="mt-1.5 text-xl font-extrabold text-slate-900 tracking-tight">{priceLabel}</p>
          <div className="mt-2 flex items-center gap-1 text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-xs">{location}</span>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
              {surfaceLabel}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bed className="h-3.5 w-3.5 text-slate-400" />
              {bedroomsLabel}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bath className="h-3.5 w-3.5 text-slate-400" />
              {bathroomsLabel}
            </span>
            {garageLabel != null && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Car className="h-3.5 w-3.5 text-slate-400" />{garageLabel}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {detailClickable ? (
            <Link href={detailHref!} className={VER_FICHA_CLS}>
              Ver ficha <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className={`${VER_FICHA_CLS} cursor-default`}>
              Ver ficha <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}

          {consultClickable ? (
            consultExternal ? (
              <a href={consultHref!} target="_blank" rel="noopener noreferrer" className={CONSULTAR_CLS}>
                <Phone className="h-3.5 w-3.5" /> Consultar
              </a>
            ) : (
              <Link href={consultHref!} className={CONSULTAR_CLS}>
                <Phone className="h-3.5 w-3.5" /> Consultar
              </Link>
            )
          ) : (
            <span className={`${CONSULTAR_CLS} cursor-default`}>
              <Phone className="h-3.5 w-3.5" /> Consultar
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
