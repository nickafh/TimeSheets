/** Weekly overtime threshold in hours */
export const OT_THRESHOLD = 40;

/**
 * Calculate daily overtime breakdown for a week of worked hours.
 * Hours beyond OT_THRESHOLD are allocated to the day they cross the threshold.
 */
export function calculateDailyOvertime(days: { workedHours: number }[]): number[] {
  let cumulativeWorked = 0;
  return days.map((day) => {
    const prevCumulative = cumulativeWorked;
    cumulativeWorked += day.workedHours;
    if (cumulativeWorked <= OT_THRESHOLD) return 0;
    if (prevCumulative >= OT_THRESHOLD) return day.workedHours;
    return cumulativeWorked - OT_THRESHOLD;
  });
}
