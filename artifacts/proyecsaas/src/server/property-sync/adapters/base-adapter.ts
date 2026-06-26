/**
 * Contrato de adaptador por portal/familia tecnológica.
 *
 * Un adaptador encapsula la extracción específica de un dominio conocido.
 * Si el adaptador no puede extraer (p. ej. el portal es SPA / requiere render JS
 * o bloquea bots), debe devolver null para que el orquestador caiga a las
 * estrategias genéricas (WordPress / JSON-LD / HTML estático).
 */
import type { SyncProperty } from "../types";

export interface PortalAdapter {
  /** Identificador legible del adaptador (para logs). */
  id: string;
  /** ¿Este adaptador maneja esta URL/dominio? */
  matches(url: string): boolean;
  /** Extrae propiedades desde la URL fuente; null si no puede (→ fallback genérico). */
  extract(sourceUrl: string): Promise<SyncProperty[] | null>;
}
