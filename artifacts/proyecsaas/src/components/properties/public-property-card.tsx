import Link from "next/link";
import { Compass, MapPin, BedDouble, Bath, Maximize2, ChevronRight } from "lucide-react";

// Tarjeta visual ÚNICA de propiedad pública. Extraída tal cual del catálogo
// público (/cat/[orgSlug]) para compartir el mismo diseño con el Modo Demo
// (/demo) sin duplicar estilos. Es 100% presentacional: recibe valores ya
// formateados (labels, hrefs) y no toca DB, estado ni mutaciones.
export type PublicPropertyCardProps = {
  imageUrl: string | null;
  title: string;
  propertyType: string;
  opText: string;
  location: string;
  hasTour360?: boolean;
  bedroomsLabel: string;
  bathroomsLabel: string;
  surfaceLabel: string;
  priceLabel: string;
  expensesLabel?: string | null;
  /** CTA "Ver ficha". Si es null/undefined se renderiza no-clickable (demo). */
  detailHref?: string | null;
  detailLabel?: string;
  /** Segundo CTA ("Consultar"). Si es null se renderiza no-clickable (demo). */
  consultHref?: string | null;
  consultLabel?: string;
  consultExternal?: boolean;
  consultIsWhatsapp?: boolean;
};

const WhatsAppIcon = () => (
  <svg className="mr-1 h-3.5 w-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CTA_BASE =
  "inline-flex h-11 items-center justify-center rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all active:scale-95 duration-200";

export function PublicPropertyCard(props: PublicPropertyCardProps) {
  const {
    imageUrl,
    title,
    propertyType,
    opText,
    location,
    hasTour360 = false,
    bedroomsLabel,
    bathroomsLabel,
    surfaceLabel,
    priceLabel,
    expensesLabel,
    detailHref,
    detailLabel = "Ver ficha",
    consultHref,
    consultLabel = "Consultar",
    consultExternal = false,
    consultIsWhatsapp = false,
  } = props;

  const primaryCtaClass = `${CTA_BASE} bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md`;
  const secondaryCtaClass = `${CTA_BASE} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-350`;

  return (
    <article className="group overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white transition-all duration-300 hover:shadow-xl hover:border-slate-300/85 flex flex-col h-full hover:-translate-y-1.5">
      {/* Image wrapper with consistent scale */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-103"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl bg-slate-100 text-slate-350 select-none">
            🏢
          </div>
        )}

        {/* Operation tag */}
        <div className="absolute top-4 left-4 z-10">
          <span className="rounded-full bg-slate-900/90 backdrop-blur-sm px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-sm">
            {opText}
          </span>
        </div>

        {/* Tour 360 Badge */}
        {hasTour360 && (
          <div className="absolute bottom-4 right-4 z-10">
            <span className="rounded-full bg-blue-600/90 backdrop-blur-sm px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1 shadow-md animate-pulse">
              <Compass className="h-3.5 w-3.5 animate-spin-slow text-blue-100" />
              Tour 360°
            </span>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
              {propertyType}
            </p>
          </div>
          <h3 className="text-lg font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-blue-700 transition-colors duration-250">
            {title}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-slate-400 line-clamp-1 font-semibold">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            {location}
          </p>

          {/* Specs section */}
          <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-slate-100 mt-4 text-slate-500">
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <BedDouble className="h-4 w-4 text-slate-400" />
              <span>{bedroomsLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <Bath className="h-4 w-4 text-slate-400" />
              <span>{bathroomsLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <Maximize2 className="h-4 w-4 text-slate-400" />
              <span>{surfaceLabel}</span>
            </div>
          </div>
        </div>

        {/* Footer values and CTAs */}
        <div className="border-t border-slate-100 mt-5 pt-4.5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valor de publicación</p>
            <p className="text-xl font-black text-slate-900 tabular-nums leading-none">{priceLabel}</p>
          </div>
          {expensesLabel ? (
            <p className="text-[10px] font-semibold text-slate-450 text-right -mt-2">{expensesLabel}</p>
          ) : null}

          <div className="grid gap-2.5 grid-cols-2">
            {/* CTA: Ver Ficha */}
            {detailHref ? (
              <Link href={detailHref} className={primaryCtaClass}>
                {detailLabel}
                <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <span className={`${primaryCtaClass} cursor-default`}>
                {detailLabel}
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </span>
            )}

            {/* CTA: Consultar (WhatsApp o ficha) */}
            {consultHref ? (
              consultExternal ? (
                <a href={consultHref} target="_blank" rel="noopener noreferrer" className={secondaryCtaClass}>
                  {consultIsWhatsapp && <WhatsAppIcon />}
                  {consultLabel}
                </a>
              ) : (
                <Link href={consultHref} className={secondaryCtaClass}>
                  {consultIsWhatsapp && <WhatsAppIcon />}
                  {consultLabel}
                </Link>
              )
            ) : (
              <span className={`${secondaryCtaClass} cursor-default`}>
                {consultIsWhatsapp && <WhatsAppIcon />}
                {consultLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
