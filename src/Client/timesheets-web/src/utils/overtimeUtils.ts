/** Weekly overtime threshold in hours */
export const OT_THRESHOLD = 40;

/** Default standard work day in hours */
export const STD_DAY_HOURS = 8;

/**
 * Calculate daily overtime breakdown for a week.
 *
 * OT is only shown when total weekly hours (worked + PTO) exceed OT_THRESHOLD.
 * Attribution priority:
 *  1. Weekend worked hours (all weekend hours are excess)
 *  2. Weekday hours beyond the standard day (e.g. >8h)
 *  3. Any remaining OT distributed sequentially from last day backward
 */
export function calculateDailyOvertime(
  days: { workedHours: number; ptoHours?: number; isWeekend?: boolean }[],
  stdDayHours: number = STD_DAY_HOURS
): number[] {
  const totalHours = days.reduce(
    (sum, d) => sum + d.workedHours + (d.ptoHours ?? 0),
    0
  );

  if (totalHours <= OT_THRESHOLD) {
    return days.map(() => 0);
  }

  let remaining = totalHours - OT_THRESHOLD;
  const result = days.map(() => 0);

  // Pass 1: Weekend hours (all worked hours on weekends are excess)
  for (let i = 0; i < days.length; i++) {
    if (remaining <= 0) break;
    if (!days[i].isWeekend || days[i].workedHours <= 0) continue;
    const ot = Math.min(days[i].workedHours, remaining);
    result[i] = ot;
    remaining -= ot;
  }

  // Pass 2: Weekday excess (hours beyond standard day)
  for (let i = 0; i < days.length; i++) {
    if (remaining <= 0) break;
    if (days[i].isWeekend) continue;
    const excess = Math.max(0, days[i].workedHours - stdDayHours);
    if (excess <= 0) continue;
    const ot = Math.min(excess, remaining);
    result[i] = ot;
    remaining -= ot;
  }

  return result;
}
