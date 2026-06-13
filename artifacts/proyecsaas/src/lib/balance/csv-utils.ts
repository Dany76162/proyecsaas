/**
 * Shared CSV helpers for Balance financial reports.
 * All exports are pure functions with no side-effects.
 */

/** Escape a single CSV cell value per RFC 4180. */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Must quote if contains comma, double-quote, or newline
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV row from an array of values. */
export function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(",");
}

/** Format cents as a decimal string with 2 decimal places. */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format a Date as YYYY-MM-DD (ISO date only). */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's date formatted as YYYY-MM-DD for filenames. */
export function todayString(): string {
  return formatDate(new Date());
}

/** Build the full CSV string from headers + data rows. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines: string[] = [csvRow(headers)];
  for (const row of rows) {
    lines.push(csvRow(row));
  }
  // BOM for Excel UTF-8 compatibility
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
