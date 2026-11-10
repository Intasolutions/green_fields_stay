const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function getDateRange(start: Date, numDays: number): Date[] {
  return Array.from({ length: numDays }, (_, i) => addDays(start, i));
}

/** dd/mm/yyyy for a YYYY-MM-DD string, an ISO datetime string, or a Date. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date =
    typeof value !== "string"
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? parseDateOnly(value)
        : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Parses dd/mm/yyyy into YYYY-MM-DD, or null if it isn't a real calendar date. */
export function parseDisplayDate(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return toDateOnly(date);
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function isSameDate(a: Date, b: Date): boolean {
  return toDateOnly(a) === toDateOnly(b);
}

/** Number of nights between two YYYY-MM-DD date-only strings. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = parseDateOnly(checkIn);
  const end = parseDateOnly(checkOut);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: toDateOnly(startOfMonth(now)),
    to: toDateOnly(endOfMonth(now)),
  };
}
