"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, ImageOff, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  dismissImportedPropertyAction,
  publishImportedPropertyAction,
} from "@/modules/properties/actions";
import type { ImportedDraftProperty } from "@/modules/properties/types";

type ImportedReviewListProps = {
  orgSlug: string;
  properties: ImportedDraftProperty[];
};

function priceLabel(property: ImportedDraftProperty): string {
  if (property.priceCents == null || !property.currency) return "A consultar";
  return formatCurrency(property.priceCents, property.currency);
}

function specsLabel(property: ImportedDraftProperty): string {
  const parts: string[] = [];
  if (property.rooms != null) parts.push(`${property.rooms} amb`);
  if (property.bedrooms != null) parts.push(`${property.bedrooms} dorm`);
  if (property.bathrooms != null) parts.push(`${property.bathrooms} baño${property.bathrooms === 1 ? "" : "s"}`);
  if (property.surfaceM2 != null) parts.push(`${property.surfaceM2} m²`);
  return parts.join(" · ");
}

export function ImportedReviewList({ orgSlug, properties }: ImportedReviewListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function runPublish(id: string) {
    setPendingId(id);
    setConfirmDismissId(null);
    startTransition(async () => {
      const result = await publishImportedPropertyAction(orgSlug, { propertyId: id });
      setPendingId(null);
      if (result.success) {
        toast.success(result.message ?? "Propiedad publicada.");
        router.refresh();
      } else {
        toast.error(result.message ?? "No se pudo publicar la propiedad.");
      }
    });
  }

  function runDismiss(id: string) {
    setPendingId(id);
    setConfirmDismissId(null);
    startTransition(async () => {
      const result = await dismissImportedPropertyAction(orgSlug, { propertyId: id });
      setPendingId(null);
      if (result.success) {
        toast.success(result.message ?? "Propiedad descartada de la revisión.");
        router.refresh();
      } else {
        toast.error(result.message ?? "No se pudo descartar la propiedad.");
      }
    });
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">No hay propiedades importadas pendientes</p>
        <p className="mt-1 text-sm text-slate-500">
          Cuando sincronices propiedades desde un sitio web, aparecerán acá en borrador para revisarlas antes de publicar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {properties.map((property) => {
        const noPrice = property.priceCents == null || !property.currency;
        const noImage = property.imageCount === 0 && property.panoramaCount === 0;
        const isBusy = pendingId === property.id;
        const confirming = confirmDismissId === property.id;

        return (
          <div
            key={property.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {property.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={property.imageUrl} alt={property.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{property.title}</p>
                {noPrice && (
                  <Badge variant="warning">⚠️ Sin precio</Badge>
                )}
                {noImage && (
                  <Badge variant="warning">⚠️ Sin imagen</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{priceLabel(property)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[property.operationType, property.propertyType, specsLabel(property)].filter(Boolean).join(" · ") ||
                  "Sin datos detectados"}
              </p>
              {property.externalLink && (
                <a
                  href={property.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Ver fuente
                </a>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/${orgSlug}/properties/${property.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Link>

              {confirming ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => runDismiss(property.id)}
                    disabled={isBusy}
                    className="h-8 bg-slate-700 px-3 text-xs text-white hover:bg-slate-800"
                  >
                    Confirmar descarte
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setConfirmDismissId(null)}
                    disabled={isBusy}
                    className="h-8 bg-white px-3 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setConfirmDismissId(property.id)}
                  disabled={isBusy}
                  className="h-8 bg-white px-3 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Descartar
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={() => runPublish(property.id)}
                disabled={isBusy}
                className="h-8 gap-1.5 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" /> {isBusy ? "..." : "Publicar"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
