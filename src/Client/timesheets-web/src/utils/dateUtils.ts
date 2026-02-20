// Shared date utility functions for weekly views

/**
 * Get the start of the week containing the given date, based on a configurable start day.
 * @param d - The date to find the week start for
 * @param startDay - Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getWeekStart(d: Date, startDay: number): Date {
  const copy = new Date(d);
  const currentDay = copy.getDay();
  const diff = (currentDay - startDay + 7) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const monthStart = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const monthEnd = weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${monthStart} - ${monthEnd}`;
}
