/** Weekly overtime threshold in hours */
export const OT_THRESHOLD = 40;

/** Default standard work day in hours */
export const STD_DAY_HOURS = 8;

/**
 * Calculate daily overtime breakdown for a week.
 * Overtime is attributed to the day where worked hours exceed the standard day (e.g. 8h).
 * For example: if someone works 10h on Tuesday, 2h of OT is shown on Tuesday —
 * not deferred to the last day of the week.
 */
export function calculateDailyOvertime(
  days: { workedHours: number; ptoHours?: number }[],
  stdDayHours: number = STD_DAY_HOURS
): number[] {
  // Daily OT = worked hours beyond the standard day, but only if the week total exceeds the threshold.
  const totalHours = days.reduce(
    (sum, d) => sum + d.workedHours + (d.ptoHours ?? 0),
    0
  );

  if (totalHours <= OT_THRESHOLD) {
    return days.map(() => 0);
  }

  // Attribute overtime to days where worked hours exceed the standard day
  const weeklyOvertime = totalHours - OT_THRESHOLD;
  let remainingOT = weeklyOvertime;

  return days.map((day) => {
    if (remainingOT <= 0) return 0;
    const excess = Math.max(0, day.workedHours - stdDayHours);
    const ot = Math.min(excess, remainingOT);
    remainingOT -= ot;
    return ot;
  });
}
