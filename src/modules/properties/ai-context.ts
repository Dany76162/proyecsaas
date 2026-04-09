import { getPropertyPublicUrl } from "@/lib/catalog-urls";
import type { PropertyImageItem } from "@/modules/properties/types";

export function formatPropertyImageSummary(images: PropertyImageItem[]): string[] {
  return images.map((img) => img.url);
}

export function buildPropertyAiContext(
  property: {
    id: string;
    organizationSlug: string;
    images?: PropertyImageItem[];
    publicVisible?: boolean;
  },
): {
  publicUrl: string | null;
  imageCount: number;
  imageUrls: string[];
} {
  const publicUrl = property.publicVisible
    ? getPropertyPublicUrl(property.organizationSlug, property.id)
    : null;

  const images = property.images ?? [];

  return {
    publicUrl,
    imageCount: images.length,
    imageUrls: formatPropertyImageSummary(images),
  };
}
