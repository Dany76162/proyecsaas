export function getCatalogPath(orgSlug: string): string {
  return `/catalogo/${orgSlug}`;
}

export function getPropertyPublicPath(orgSlug: string, propertyId: string): string {
  return `/catalogo/${orgSlug}/${propertyId}`;
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

export function getCatalogUrl(orgSlug: string): string {
  return `${getAppBaseUrl()}${getCatalogPath(orgSlug)}`;
}

export function getPropertyPublicUrl(orgSlug: string, propertyId: string): string {
  return `${getAppBaseUrl()}${getPropertyPublicPath(orgSlug, propertyId)}`;
}
