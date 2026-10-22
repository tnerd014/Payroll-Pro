/**
 * Global Date Formatting Utilities for Payroll Pro
 * Ensures consistent DD/MM/YYYY formatting throughout the entire application.
 */

/**
 * Formats any Date, ISO string, timestamp, or YYYY-MM-DD string into strictly consistent `DD/MM/YYYY`.
 * Handles timezone issues by parsing YYYY-MM-DD components directly when available.
 * 
 * @example
 * formatDate("2026-01-31") -> "31/01/2026"
 * formatDate("2026-01-31T15:30:00.000Z") -> "31/01/2026"
 * formatDate(new Date(2026, 0, 31)) -> "31/01/2026"
 */
export function formatDate(input?: string | number | Date | null, fallback: string = '—'): string {
  if (!input) return fallback;

  // Direct check for YYYY-MM-DD strings to avoid UTC-to-local timezone shift issues
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  }

  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    return typeof input === 'string' ? input : fallback;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a Date/string into `DD/MM/YYYY, HH:MM`
 */
export function formatDateTime(input?: string | number | Date | null, fallback: string = '—'): string {
  if (!input) return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    return typeof input === 'string' ? input : fallback;
  }

  const dateStr = formatDate(d, fallback);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr}, ${hours}:${minutes}`;
}
