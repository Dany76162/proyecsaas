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

  // Pattern 1: Currency prefix â€” USD/U$S/u$s/DÃ“LARES followed by number
  const usdPrefix = t.match(
    /(?:USD?|U\$S|u\$s|dÃ³lar(?:es)?)\s*[:$]?\s*([\d.,]+)/i
  );
  if (usdPrefix) {
    const cents = parseAmountToCents(usdPrefix[1]);
    if (cents !== null) return { cents, currency: "USD" };
  }

  // Pattern 2: Number followed by USD/U$S
  const usdSuffix = t.match(/([\d.,]+)\s*(?:USD?|U\$S|u\$s|dÃ³lar(?:es)?)/i);
  if (usdSuffix) {
    const cents = parseAmountToCents(usdSuffix[1]);
    if (cents !== null) return { cents, currency: "USD" };
  }

  // Pattern 3: $ prefix (ARS)
  const arsPrefix = t.match(/\$\s*([\d.,]+)/);
  if (arsPrefix) {
    const cents = parseAmountToCents(arsPrefix[1]);
    if (cents !== null) return { cents, currency: "ARS" };
  }

  return null;
}

/**
 * Converts a Spanish/Argentine number string to cents (integer).
 * "120.000" â†’ 12000000 (USD 120,000 â†’ 12,000,000 cents)
 * "1.500.000" â†’ 150000000 (ARS 1,500,000 â†’ 150,000,000 cents)
 * "54.900" â†’ 5490000
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
 * "2 ambientes" â†’ 2, "3 amb." â†’ 3, "Monoambiente" â†’ 1
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
 * "3 dormitorios" â†’ 3, "2 habitaciones" â†’ 2, "2 dorm." â†’ 2
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
 * "2 baÃ±os" â†’ 2, "1 baÃ±o" â†’ 1
 */
export function parseBathrooms(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:baÃ±os?|baths?)/i);
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

const PROPERTY_TYPE_MAP: Array<[RegExp, string]> = [
  [/departamento|depto|dpto|apartment/i, "Departamento"],
  [/ph\b|p\.h\.|penthouse/i, "PH"],
  [/casa(?:\s+quinta)?|chalet|villa/i, "Casa"],
  [/terreno|lote|tierra/i, "Terreno"],
  [/local\s*comercial|local/i, "Local"],
  [/oficina|consultorio/i, "Oficina"],
  [/cochera|garaje|garage/i, "Cochera"],
  [/galpÃ³n|depÃ³sito|bodega/i, "GalpÃ³n"],
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
