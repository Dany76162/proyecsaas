interface ParsedPrice {
  cents: number;
  currency: "USD" | "ARS";
}

export function parsePrice(text: string): ParsedPrice | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ");

  const usdPrefix = t.match(/(?:USD?|U\$S|u\$s|dólar(?:es)?)\s*[:$]?\s*([\d.,]+)/i);
  if (usdPrefix) {
    const cents = parseAmountToCents(usdPrefix[1]);
    if (cents !== null) return { cents, currency: "USD" };
  }

  const usdSuffix = t.match(/([\d.,]+)\s*(?:USD?|U\$S|u\$s|dólar(?:es)?)/i);
  if (usdSuffix) {
    const cents = parseAmountToCents(usdSuffix[1]);
    if (cents !== null) return { cents, currency: "USD" };
  }

  const arsPrefix = t.match(/\$\s*([\d.,]+)/);
  if (arsPrefix) {
    const cents = parseAmountToCents(arsPrefix[1]);
    if (cents !== null) return { cents, currency: "ARS" };
  }

  return null;
}

function parseAmountToCents(raw: string): number | null {
  if (!raw) return null;
  const noSep = raw.replace(/[,.](?=(\d{3})+(?!\d))/g, "");
  const normalized = noSep.replace(",", ".");
  const amount = parseFloat(normalized);
  if (isNaN(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function parseSurfaceM2(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mt2|mts2|metros?(?:\s*cuadrados?)?)/i);
  if (!match) return null;
  const val = parseInt(match[1].replace(",", "."), 10);
  return isNaN(val) ? null : val;
}

export function parseRooms(text: string): number | null {
  if (!text) return null;
  if (/monoambiente/i.test(text)) return 1;
  const match = text.match(/(\d+)\s*(?:ambientes?|amb\.?)/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

export function parseBedrooms(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:dormitorios?|habitaciones?|dorm\.?|cuartos?)/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

export function parseBathrooms(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:baños?|baths?)/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

export function parseOperationType(text: string): string | null {
  if (!text) return null;
  if (/alquiler\s*temporario|temporari/i.test(text)) return "Alquiler temporario";
  if (/alquiler|arrendar|rent/i.test(text)) return "Alquiler";
  if (/venta|vende|sale/i.test(text)) return "Venta";
  return null;
}

const PROPERTY_TYPE_MAP: Array<[RegExp, string]> = [
  [/departamento|depto|dpto|apartment/i, "Departamento"],
  [/ph\b|p\.h\.|penthouse/i, "PH"],
  [/casa(?:\s+quinta)?|chalet|villa/i, "Casa"],
  [/terreno|lote|tierra/i, "Terreno"],
  [/local\s*comercial|local/i, "Local"],
  [/oficina|consultorio/i, "Oficina"],
  [/cochera|garaje|garage/i, "Cochera"],
  [/galpón|depósito|bodega/i, "Galpón"],
];

export function parsePropertyType(text: string): string | null {
  if (!text) return null;
  for (const [regex, label] of PROPERTY_TYPE_MAP) {
    if (regex.test(text)) return label;
  }
  return null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
