/**
 * Adaptadores para portales grandes (Fase 2 light, sin headless).
 *
 * IMPORTANTE / LIMITACIÓN: Zonaprop, Argenprop y Properati son SPA con render
 * JS y protección anti-bot. El HTML server-side normalmente NO trae el listado,
 * así que estos adaptadores intentan únicamente datos estructurados (JSON-LD)
 * y, si no hay, devuelven null → el orquestador usa la estrategia genérica o
 * reporta "requiere adaptador". El soporte real de estos portales requeriría
 * un HeadlessStrategy (Puppeteer/Playwright), postergado por costo/complejidad.
 */
import type { PortalAdapter } from "./base-adapter";
import type { SyncProperty } from "../types";
import { extractFromJsonLd } from "../strategies/json-ld";

function domainMatcher(...domains: string[]): (url: string) => boolean {
  return (url: string) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return domains.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  };
}

/** Adaptador base por JSON-LD para un portal: si no hay JSON-LD útil, null (fallback). */
function jsonLdPortalAdapter(id: string, ...domains: string[]): PortalAdapter {
  const matches = domainMatcher(...domains);
  return {
    id,
    matches,
    async extract(sourceUrl: string): Promise<SyncProperty[] | null> {
      const props = await extractFromJsonLd(sourceUrl);
      if (props && props.length > 0) {
        console.info(`[property-sync][adapter:${id}] ${props.length} propiedades vía JSON-LD`);
        return props;
      }
      console.warn(
        `[property-sync][adapter:${id}] sin datos estructurados server-side (probable SPA/anti-bot) → fallback genérico / requiere headless`,
      );
      return null;
    },
  };
}

const ADAPTERS: PortalAdapter[] = [
  jsonLdPortalAdapter("zonaprop", "zonaprop.com.ar"),
  jsonLdPortalAdapter("argenprop", "argenprop.com"),
  jsonLdPortalAdapter("properati", "properati.com.ar", "properati.com"),
];

/** Devuelve el adaptador que maneja esta URL, o null si no hay específico. */
export function getAdapterForUrl(url: string): PortalAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}
