/**
 * Field parser utilities for extracting structured data from unstructured
 * real estate text (Argentine market conventions).
 */

// â”€â”€â”€ Price â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ParsedPrice {
  cents: number;
  currency: "USD" | "ARS";
}

/**
 * Extracts price from a text string.
 * Handles: "USD 120.000", "U$S 54.900", "$ 15.000.000", "120.000 USD", "VALOR: USD 72.000"
 * Returns null if no price found.
 */
export function parsePrice(text: string): ParsedPrice | null {
  if (!text) return null;

  const t = text.replace(/\s+/g, " ");

  // "A consultar" / "Consultar" / "Precio a convenir" → no hay precio real (no inventar).
  if (/(a\s*consultar|consultar\s*precio|precio\s*a\s*convenir|precio\s*:?\s*consultar)/i.test(t)) {
    return null;
  }

  // ── USD ──────────────────────────────────────────────────────────────────
  // Prefijos: USD, US$, USD$, U$S, u$s, dólares — con o sin espacio/$ entre medio.
  // Cubre "USD$130.000", "USD 130.000", "USD139.000", "US$ 130.000", "u$s 54.900".
  const usd =
    t.match(/(?:USD?\s*\$?|U\$S|u\$s|US\$|d[óo]lar(?:es)?)\s*[:]?\s*([\d.,]+)/i) ??
    t.match(/([\d.,]+)\s*(?:USD?|U\$S|u\$s|US\$|d[óo]lar(?:es)?)/i);
  if (usd) {
    const cents = parseAmountToCents(usd[1]);
    if (cents !== null) return { cents, currency: "USD" };
  }

  // ── ARS literal ──────────────────────────────────────────────────────────
  // Prefijo/sufijo ARS / AR$ / "pesos". Cubre "ARS 600.000", "600.000 pesos".
  const ars =
    t.match(/(?:ARS|AR\$|pesos?)\s*[:$]?\s*([\d.,]+)/i) ??
    t.match(/([\d.,]+)\s*(?:ARS|pesos?)/i);
  if (ars) {
    const cents = parseAmountToCents(ars[1]);
    if (cents !== null) return { cents, currency: "ARS" };
  }

  // ── $ suelto → ARS ─────────────────────────────────────────────────────────
  // Convención local: un "$" sin moneda explícita se asume ARS (ambiguo pero razonable).
  const arsPrefix = t.match(/\$\s*([\d.,]+)/);
  if (arsPrefix) {
    const cents = parseAmountToCents(arsPrefix[1]);
    if (cents !== null) return { cents, currency: "ARS" };
  }

  return null;
}

/**
 * Converts a Spanish/Argentine number string to cents (integer).
 * "120.000" → 12000000 (USD 120,000 → 12,000,000 cents)
 * "1.500.000" → 150000000 (ARS 1,500,000 → 150,000,000 cents)
 * "54.900" → 5490000
 */
function parseAmountToCents(raw: string): number | null {
  if (!raw) return null;
  // Remove thousands separators (dot or comma followed by 3 digits)
  const noSep = raw.replace(/[,.](?=(\d{3})+(?!\d))/g, "");
  // Normalize comma decimal to dot
  const normalized = noSep.replace(",", ".");
  const amount = parseFloat(normalized);
  if (isNaN(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

// â”€â”€â”€ Surface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Extracts surface area in mÂ² from text.
 * Handles: "85 m2", "120 mÂ²", "75mt2", "Superficie: 200 mÂ²"
 */
export function parseSurfaceM2(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|mÂ²|mt2|mts2|metros?(?:\s*cuadrados?)?)/i);
  if (!match) return null;
  const val = parseInt(match[1].replace(",", "."), 10);
  return isNaN(val) ? null : val;
}

// â”€â”€â”€ Rooms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Extracts number of ambientes (rooms) from text.
 * "2 ambientes" → 2, "3 amb." → 3, "Monoambiente" → 1
 */
export function parseRooms(text: string): number | null {
  if (!text) return null;
  if (/monoambiente/i.test(text)) return 1;
  const match = text.match(/(\d+)\s*(?:ambientes?|amb\.?)/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

/**
 * Extracts bedrooms from text.
 * "3 dormitorios" → 3, "2 habitaciones" → 2, "2 dorm." → 2
 */
export function parseBedrooms(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:dormitorios?|habitaciones?|dorm\.?|cuartos?)/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

/**
 * Extracts bathrooms from text.
 * "2 baños" → 2, "1 baño" → 1
 */
export function parseBathrooms(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:baños?|baths?)/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

// â”€â”€â”€ Operation type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Guesses operation type from text/URL/title.
 * Returns "Venta", "Alquiler", or "Alquiler temporario"
 */
export function parseOperationType(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/alquiler\s*temporario|alquiler\s*temp|temporari/i.test(t)) return "Alquiler temporario";
  if (/alquiler|arrendar|rent/i.test(t)) return "Alquiler";
  if (/venta|vende|sale|compra/i.test(t)) return "Venta";
  return null;
}

// â”€â”€â”€ Property type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Orden importante: los tipos más específicos primero, para que
// "Local con vivienda" → Local (no Casa), "Galpón" → Galpón (no Departamento),
// y "Lote" no termine como "Terreno" ni como "Casa".
const PROPERTY_TYPE_MAP: Array<[RegExp, string]> = [
  [/departamento|depto|dpto|apartment/i, "Departamento"],
  [/\bph\b|p\.h\.|penthouse/i, "PH"],
  [/galp[óo]n|dep[óo]sito|bodega/i, "Galpón"],
  [/local\s*comercial|\blocal\b/i, "Local"],
  [/oficina|consultorio/i, "Oficina"],
  [/cochera|garaje|garage/i, "Cochera"],
  [/casa(?:\s+quinta)?|chalet|villa/i, "Casa"],
  [/\blote\b|loteo/i, "Lote"],
  [/terreno|tierra|fracci[óo]n/i, "Terreno"],
];

/**
 * Guesses property type from text.
 */
export function parsePropertyType(text: string): string | null {
  if (!text) return null;
  for (const [regex, label] of PROPERTY_TYPE_MAP) {
    if (regex.test(text)) return label;
  }
  return null;
}

// â”€â”€â”€ Strip HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Confianza / sanitización (P0 integridad: mejor no importar que importar mal) ──

/**
 * ¿Es un título "limpio" de propiedad? Rechaza títulos sucios: HTML/entidades
 * residuales, IDs concatenados (ej. "ZP-M-...", "6450169::"), separadores raros,
 * o demasiados símbolos/números en proporción a letras. Evita guardar fichas
 * con datos mezclados de otra propiedad.
 */
export function isCleanTitle(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 8 || t.length > 200) return false;
  if (/[<>]|::|\{\{|\}\}|&[a-z]+;/i.test(t)) return false; // HTML/entidades/códigos
  if (/[A-Z0-9]{6,}[-_:][A-Z0-9]/i.test(t)) return false; // IDs tipo ZP-M-..., 6450169::ZP
  const letters = (t.match(/[a-záéíóúñü]/gi) || []).length;
  if (letters < 6) return false; // casi sin letras
  if (letters / t.length < 0.45) return false; // mayoría símbolos/números → sospechoso
  return true;
}

/**
 * Cuenta importes de precio DISTINTOS en el texto. Si hay más de uno, no se puede
 * asociar el precio a la propiedad con seguridad → el llamador debe dejarlo vacío
 * ("A consultar") en vez de adivinar y arriesgar mezclar precios de otra ficha.
 */
export function countDistinctPrices(text: string): number {
  if (!text) return 0;
  const t = text.replace(/\s+/g, " ");
  const matches =
    t.match(/(?:USD?\s*\$?|U\$S|u\$s|US\$|ARS|AR\$|d[óo]lar(?:es)?|\$)\s*[\d.,]{2,}/gi) || [];
  const norm = new Set(
    matches.map((m) => m.replace(/\D/g, "")).filter((d) => d.length >= 2),
  );
  return norm.size;
}
