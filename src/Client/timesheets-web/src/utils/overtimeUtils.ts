/** Weekly overtime threshold in hours */
export const OT_THRESHOLD = 40;

/**
 * Calculate daily overtime breakdown for a week.
 * Total hours (worked + PTO) count toward the weekly threshold.
 * Only worked hours beyond the threshold are overtime (PTO itself isn't OT).
 */
export function calculateDailyOvertime(days: { workedHours: number; ptoHours?: number }[]): number[] {
  let cumulativeTotal = 0;
  return days.map((day) => {
    const prevCumulative = cumulativeTotal;
    const dayTotal = day.workedHours + (day.ptoHours ?? 0);
    cumulativeTotal += dayTotal;
    if (cumulativeTotal <= OT_THRESHOLD) return 0;
    // Only worked hours can be overtime, not PTO
    const overAmount = cumulativeTotal - Math.max(prevCumulative, OT_THRESHOLD);
    return Math.min(overAmount, day.workedHours);
  });
}
