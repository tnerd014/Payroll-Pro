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

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Checks if an employee is eligible/employed for a specific payroll period.
 * Supports start date, end date (exit date), and multi-stint employment history.
 * An employee who exits on a date in Month X is active for Month X (their final month),
 * but excluded from Month X + 1 onwards.
 */
export function isEmployeeActiveForPeriod(
  emp: { status?: string; startDate?: string; endDate?: string; stints?: Array<{ startDate: string; endDate?: string }> } | null | undefined,
  year: number,
  monthKey: string
): boolean {
  if (!emp) return false;

  const mKey = (monthKey || '').toLowerCase();
  const monthIdx = MONTH_MAP[mKey] ?? 0;
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStartStr = `${year}-${pad(monthIdx + 1)}-01`;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const monthEndStr = `${year}-${pad(monthIdx + 1)}-${pad(lastDay)}`;

  // If employee has stints history
  if (emp.stints && Array.isArray(emp.stints) && emp.stints.length > 0) {
    return emp.stints.some(stint => {
      const sStart = (stint.startDate || '').trim();
      const sEnd = (stint.endDate || '').trim();
      if (!sStart && !sEnd) return true;
      if (sStart && sStart > monthEndStr) return false;
      if (sEnd && sEnd < monthStartStr) return false;
      return true;
    });
  }

  const sStart = (emp.startDate || '').trim();
  const sEnd = (emp.endDate || '').trim();

  // If start date is after this month end, haven't joined yet
  if (sStart && sStart > monthEndStr) {
    return false;
  }

  // If end date is before this month start, already exited before this month
  if (sEnd && sEnd < monthStartStr) {
    return false;
  }

  // If marked Inactive manually without an endDate, respect the Inactive flag
  if (emp.status === 'Inactive' && !sEnd) {
    return false;
  }

  return true;
}

/**
 * Calculates the proration ratio (0.0 to 1.0) for an employee who joined or exited mid-month.
 * Returns 1.0 if the employee was employed for the entire month.
 */
export function getMidMonthProrationRatio(
  emp: { startDate?: string; endDate?: string } | null | undefined,
  year?: number,
  monthKey?: string
): number {
  if (!emp || !year || !monthKey) return 1;

  const mKey = (monthKey || '').toLowerCase();
  const monthIdx = MONTH_MAP[mKey];
  if (monthIdx === undefined) return 1;

  const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthStartStr = `${year}-${pad(monthIdx + 1)}-01`;
  const monthEndStr = `${year}-${pad(monthIdx + 1)}-${pad(totalDaysInMonth)}`;

  let effectiveStartDay = 1;
  let effectiveEndDay = totalDaysInMonth;

  const sStart = (emp.startDate || '').trim();
  const sEnd = (emp.endDate || '').trim();

  // If start date falls within this month
  if (sStart && sStart >= monthStartStr && sStart <= monthEndStr) {
    const parts = sStart.split('-');
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && day >= 1 && day <= totalDaysInMonth) {
      effectiveStartDay = day;
    }
  }

  // If end date falls within this month
  if (sEnd && sEnd >= monthStartStr && sEnd <= monthEndStr) {
    const parts = sEnd.split('-');
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && day >= 1 && day <= totalDaysInMonth) {
      effectiveEndDay = day;
    }
  }

  if (effectiveStartDay <= 1 && effectiveEndDay >= totalDaysInMonth) {
    return 1;
  }

  const activeDays = Math.max(0, effectiveEndDay - effectiveStartDay + 1);
  return Math.min(1, Math.max(0, activeDays / totalDaysInMonth));
}

