// src/pages/WeeklyTimeEntries.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DailyTimeEntryDto, PtoRequestWithUserDto, ClockStatusDto, ClockPunchDto, MyIncompleteItemDto } from "../api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  fetchDailyTimeEntries,
  saveDailyTimeEntriesBulk,
  fetchUserPtoRequests,
  getSystemSettings,
  fetchClockStatus,
  recordPunch,
  undoLastPunch,
  fetchMyIncompleteEntries,
} from "../api";
import { useAuth } from "../auth/useAuth";
import { getWeekStart, addDays, toDateOnlyString, getDayName, formatWeekLabel } from "../utils/dateUtils";
import { OT_THRESHOLD, calculateDailyOvertime } from "../utils/overtimeUtils";

const UNDO_WINDOW_MS = 5000;

interface WeekEntry {
  date: string;
  workedHours: number;
  ptoHours: number;
  dayType: string;
  notes: string;
  id?: number;
  isWeekend: boolean;
  dayName: string;
  approvedPto: boolean;
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  days: WeekEntry[];
  totalWorked: number;
  totalPto: number;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

// --- Punch type labels and colors ---
const PUNCH_TYPE_LABELS: Record<string, string> = {
  ClockIn: "Clock In",
  LunchOut: "Lunch Out",
  LunchIn: "Lunch In",
  ClockOut: "Clock Out",
};

const STATE_LABELS: Record<string, string> = {
  not_started: "Not Started",
  clocked_in: "Clocked In",
  lunch_out: "On Lunch",
  lunch_in: "Back from Lunch",
  clocked_out: "Day Complete",
};

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ----- Hourly Clock View (inline) -----

function HourlyClockView({
  userId,
  weekStartDay,
}: {
  userId: number;
  weekStartDay: number;
}) {
  const today = useMemo(() => new Date(), []);

  // Clock status state
  const [clockStatus, setClockStatus] = useState<ClockStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [error, setError] = useState("");

  // Incomplete items state
  const [incompleteItems, setIncompleteItems] = useState<MyIncompleteItemDto[]>([]);

  // Undo state
  const [undoPunchId, setUndoPunchId] = useState<number | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Elapsed time
  const [elapsed, setElapsed] = useState<string>("00:00:00");

  // Weekly summary state
  const [weekStart] = useState<Date>(() => getWeekStart(today, weekStartDay));
  const [weeklyHours, setWeeklyHours] = useState<{ date: string; dayName: string; hours: number }[]>([]);

  // Fetch incomplete items on mount
  useEffect(() => {
    fetchMyIncompleteEntries()
      .then(setIncompleteItems)
      .catch((err) => console.error("Failed to load incomplete entries:", err));
  }, []);

  // Fetch clock status on mount
  useEffect(() => {
    setLoading(true);
    fetchClockStatus()
      .then((s) => setClockStatus(s))
      .catch((e) => setError(e?.message ?? "Failed to load clock status"))
      .finally(() => setLoading(false));
  }, []);

  // Live elapsed timer
  useEffect(() => {
    if (!clockStatus?.clockInTime) {
      setElapsed("00:00:00");
      return;
    }

    const clockInMs = new Date(clockStatus.clockInTime).getTime();
    const lunchMs = (clockStatus.lunchMinutes ?? 0) * 60 * 1000;
    const state = clockStatus.currentState;

    function tick() {
      const now = Date.now();
      let elapsedMs = now - clockInMs - lunchMs;

      // If on lunch, freeze elapsed at the pre-lunch value
      if (state === "lunch_out") {
        elapsedMs = now - clockInMs - lunchMs;
        // lunchMinutes hasn't been updated yet for the active lunch, so we need to
        // calculate by finding when lunch started
        const lunchOutPunch = clockStatus?.todayPunches
          ?.filter((p: ClockPunchDto) => p.punchType === "LunchOut")
          .pop();
        if (lunchOutPunch) {
          const lunchStartMs = new Date(lunchOutPunch.punchTime).getTime();
          const activeLunchMs = now - lunchStartMs;
          elapsedMs = now - clockInMs - lunchMs - activeLunchMs;
        }
      }

      if (elapsedMs < 0) elapsedMs = 0;
      setElapsed(formatElapsed(Math.floor(elapsedMs / 1000)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clockStatus]);

  // Fetch weekly summary
  useEffect(() => {
    const start = toDateOnlyString(weekStart);
    const end = toDateOnlyString(addDays(weekStart, 6));

    fetchDailyTimeEntries(userId, start, end)
      .then((entries) => {
        const hoursByDate = new Map<string, number>();
        for (const e of entries) {
          hoursByDate.set(e.workDate.slice(0, 10), e.workedHours);
        }

        const days: { date: string; dayName: string; hours: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          const ds = toDateOnlyString(d);
          days.push({
            date: ds,
            dayName: getDayName(ds),
            hours: hoursByDate.get(ds) ?? 0,
          });
        }
        setWeeklyHours(days);
      })
      .catch((err) => console.error("Failed to load weekly hours:", err));
  }, [userId, weekStart, clockStatus?.currentState]);

  // Clear undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handlePunch = useCallback(async (punchType: string) => {
    setPunching(true);
    setError("");

    // Clear any existing undo state
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoPunchId(null);

    try {
      const result = await recordPunch(punchType);
      setClockStatus(result);

      // Set undo for the newly created punch
      const newPunch = result.todayPunches[result.todayPunches.length - 1];
      if (newPunch) {
        setUndoPunchId(newPunch.id);
        undoTimerRef.current = setTimeout(() => {
          setUndoPunchId(null);
          undoTimerRef.current = null;
        }, UNDO_WINDOW_MS);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to record punch");
    } finally {
      setPunching(false);
    }
  }, []);

  const handleUndo = useCallback(async () => {
    if (!undoPunchId) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    try {
      const result = await undoLastPunch(undoPunchId);
      setClockStatus(result);
      setUndoPunchId(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to undo punch");
      setUndoPunchId(null);
    }
  }, [undoPunchId]);

  const todayFormatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const weeklyTotal = weeklyHours.reduce((s, d) => s + d.hours, 0);

  if (loading) {
    return (
      <LoadingSpinner message="Loading clock status..." />
    );
  }

  const state = clockStatus?.currentState ?? "not_started";
  const validActions = clockStatus?.validNextActions ?? [];
  const isDayComplete = state === "clocked_out";

  const buttonConfig: { type: string; label: string; activeColor: string; activeBorder: string; activeText: string }[] = [
    { type: "ClockIn", label: "Clock In", activeColor: "#ecfdf5", activeBorder: "#059669", activeText: "#059669" },
    { type: "LunchOut", label: "Lunch Out", activeColor: "#fffbeb", activeBorder: "#d97706", activeText: "#d97706" },
    { type: "LunchIn", label: "Lunch In", activeColor: "#fffbeb", activeBorder: "#d97706", activeText: "#d97706" },
    { type: "ClockOut", label: "Clock Out", activeColor: "#fef2f2", activeBorder: "#dc2626", activeText: "#dc2626" },
  ];

  return (
    <>
      {/* Missed Clock-Out Warning Banner */}
      {incompleteItems.length > 0 && (
        <div style={{
          marginBottom: '24px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fbbf24',
          borderLeft: '4px solid #d97706',
          borderRadius: '0 8px 8px 0',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>warning</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
              Missed Clock-Out
            </p>
            <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '12px' }}>
              You have incomplete clock entries on the following date(s). Please contact your manager to correct your time.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {incompleteItems.map((item) => (
                <span key={item.punchDate} style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  backgroundColor: 'rgba(217, 119, 6, 0.15)',
                  color: '#92400e',
                  borderRadius: '4px',
                }}>
                  {new Date(item.punchDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clock Controls Card */}
      <div style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "24px",
      }}>
        {/* Card Header */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          padding: "16px 20px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
        }}>
          <div style={{
            fontSize: "16px",
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            color: "#002349",
          }}>
            Clock - {todayFormatted}
          </div>
          <div style={{
            backgroundColor: isDayComplete ? "#059669" : state === "lunch_out" ? "#d97706" : state === "not_started" ? "#64748b" : "#2563eb",
            color: "white",
            padding: "6px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}>
            {STATE_LABELS[state] ?? state}
          </div>
        </div>

        {/* Elapsed Time + Day Complete */}
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          {isDayComplete ? (
            <div>
              <div style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#64748b",
                marginBottom: "8px",
              }}>
                Day Complete
              </div>
              <div style={{
                fontSize: "48px",
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                color: "#059669",
              }}>
                {clockStatus?.totalHoursToday != null ? clockStatus.totalHoursToday.toFixed(2) : "--"} hrs
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#64748b",
                marginBottom: "8px",
              }}>
                {state === "not_started" ? "Ready to Clock In" : "Elapsed Time"}
              </div>
              <div style={{
                fontSize: "48px",
                fontFamily: "monospace",
                fontWeight: 700,
                color: state === "lunch_out" ? "#d97706" : "#002349",
                letterSpacing: "0.05em",
              }}>
                {state === "not_started" ? "--:--:--" : elapsed}
              </div>
              {state === "lunch_out" && (
                <div style={{ fontSize: "13px", color: "#d97706", marginTop: "4px" }}>
                  Timer paused during lunch
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - 2x2 grid on mobile, single row on desktop */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          padding: "0 24px 24px",
          maxWidth: "720px",
          margin: "0 auto",
        }}>
          {buttonConfig.map((btn) => {
            const isValid = validActions.includes(btn.type);
            return (
              <button
                key={btn.type}
                type="button"
                disabled={!isValid || punching}
                onClick={() => handlePunch(btn.type)}
                style={{
                  padding: "18px 12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderRadius: "8px",
                  cursor: isValid && !punching ? "pointer" : "not-allowed",
                  opacity: isValid ? 1 : 0.4,
                  backgroundColor: isValid ? btn.activeColor : "#f8fafc",
                  border: `2px solid ${isValid ? btn.activeBorder : "#e2e8f0"}`,
                  color: isValid ? btn.activeText : "#94a3b8",
                  transition: "all 0.15s ease",
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            margin: "0 24px 16px",
            borderLeft: "4px solid #ef4444",
            backgroundColor: "#fef2f2",
            padding: "12px 16px",
            borderRadius: "0 8px 8px 0",
            fontSize: "14px",
            color: "#b91c1c",
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Today's Punch Log */}
        {clockStatus && clockStatus.todayPunches.length > 0 && (
          <div style={{
            borderTop: "1px solid #e2e8f0",
            padding: "16px 24px",
            backgroundColor: "#fafafa",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#64748b",
              marginBottom: "8px",
            }}>
              Today's Punches
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {clockStatus.todayPunches.map((punch: ClockPunchDto) => (
                <div
                  key={punch.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#002349", fontWeight: 600, fontFamily: "monospace" }}>
                    {formatTime(punch.punchTime)}
                  </span>
                  <span style={{ color: "#64748b" }}>
                    {PUNCH_TYPE_LABELS[punch.punchType] ?? punch.punchType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Read-Only Weekly Summary */}
      <div style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
        }}>
          <div style={{
            fontSize: "14px",
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            color: "#002349",
          }}>
            Weekly Summary
          </div>
          <div style={{
            backgroundColor: weeklyTotal >= OT_THRESHOLD ? "#059669" : "#64748b",
            color: "white",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
          }}>
            {weeklyTotal.toFixed(1)} / {OT_THRESHOLD}h
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#002349" }}>
                {weeklyHours.map((day) => (
                  <th
                    key={day.date}
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "white",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <div>{day.dayName}</div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                      {day.date.slice(5)}
                    </div>
                  </th>
                ))}
                <th style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "white",
                  letterSpacing: "0.05em",
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {weeklyHours.map((day) => (
                  <td
                    key={day.date}
                    style={{
                      padding: "16px 8px",
                      textAlign: "center",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: day.hours > 0 ? "#002349" : "#cbd5e1",
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {day.hours > 0 ? day.hours.toFixed(1) : "--"}
                  </td>
                ))}
                <td style={{
                  padding: "16px",
                  textAlign: "right",
                  fontSize: "18px",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  color: "#002349",
                  backgroundColor: "#f8fafc",
                }}>
                  {weeklyTotal.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Undo Toast - bottom: 80px to clear mobile bottom nav */}
      {undoPunchId !== null && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#1e293b",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "16px",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          <span>Punch recorded.</span>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              background: "none",
              border: "none",
              color: "#60a5fa",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}

// ----- Main Component -----

export default function WeeklyTimeEntries() {
  const today = useMemo(() => new Date(), []);
  const { user: authUser } = useAuth();
  const isHourly = authUser?.payType === "Hourly";
  const isNonExempt = authUser?.exemptionStatus === "NonExempt";
  const isExempt = authUser?.exemptionStatus === "Exempt";
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Dynamic work week start day from SystemSettings (0=Sun, 1=Mon, ..., 6=Sat)
  const [weekStartDay, setWeekStartDay] = useState<number>(1); // default Monday

  // Start with current week start (recalculated when weekStartDay changes)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(today, 1));
  const weeksToShow = 1; // Always show 1 week at a time

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [approvedPtoRequests, setApprovedPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const grandTotalWorked = useMemo(
    () => weeks.reduce((sum, w) => sum + w.totalWorked, 0),
    [weeks]
  );

  const grandTotalPto = useMemo(
    () => weeks.reduce((sum, w) => sum + w.totalPto, 0),
    [weeks]
  );

  // Fetch system settings for work week start day
  useEffect(() => {
    getSystemSettings()
      .then((settings) => setWeekStartDay(settings.workWeekStartDay))
      .catch((err) => console.error("Failed to load system settings:", err)); // fallback to default Monday
  }, []);

  // Re-compute week start when weekStartDay changes
  useEffect(() => {
    setCurrentWeekStart((prev) => getWeekStart(prev, weekStartDay));
  }, [weekStartDay]);

  // Select the authenticated user directly to avoid cross-user fallback behavior
  useEffect(() => {
    if (authUser?.id) {
      setSelectedUserId(authUser.id);
      setError("");
    }
  }, [authUser]);

  // Load approved PTO requests for this user (salary path only)
  useEffect(() => {
    if (isHourly) return;
    if (!selectedUserId) return;
    fetchUserPtoRequests(selectedUserId)
      .then((reqs) => setApprovedPtoRequests(reqs.filter((r) => r.status === 1)))
      .catch((err) => console.error("Failed to load PTO requests:", err));
  }, [selectedUserId, isHourly]);

  // Build a set of dates with approved PTO and a map of date -> { hours, reason, ptoTypeName }
  const approvedPtoByDate = useMemo(() => {
    if (isHourly) return new Map<string, { hours: number; note: string }>();
    const PTO_TYPE_NAMES: Record<number, string> = {
      1: "PTO", 2: "Jury Duty", 3: "Volunteer", 4: "Bereavement", 5: "Leave",
    };
    const map = new Map<string, { hours: number; note: string }>();
    for (const req of approvedPtoRequests) {
      const startStr = req.dateOfLeave.slice(0, 10);
      const endStr = req.endDate ? req.endDate.slice(0, 10) : startStr;
      const start = new Date(startStr + "T00:00:00");
      const end = new Date(endStr + "T00:00:00");
      const typeName = PTO_TYPE_NAMES[req.ptoTypeId] || "PTO";

      if (startStr === endStr) {
        // Single day - use exact hours from request
        const note = `Approved ${typeName}${req.reason ? ` - ${req.reason}` : ""}`;
        const existing = map.get(startStr);
        map.set(startStr, {
          hours: (existing?.hours || 0) + req.hours,
          note: existing ? `${existing.note}; ${note}` : note,
        });
      } else {
        // Date range - count working days and distribute hours evenly
        let workDays = 0;
        for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
          const dow = cur.getDay();
          if (dow !== 0 && dow !== 6) workDays++;
        }
        const hoursPerDay = workDays > 0 ? req.hours / workDays : req.hours;
        const note = `Approved ${typeName}${req.reason ? ` - ${req.reason}` : ""}`;
        for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
          const dow = cur.getDay();
          if (dow === 0 || dow === 6) continue;
          const ds = toDateOnlyString(cur);
          const existing = map.get(ds);
          map.set(ds, {
            hours: (existing?.hours || 0) + hoursPerDay,
            note: existing ? `${existing.note}; ${note}` : note,
          });
        }
      }
    }
    return map;
  }, [approvedPtoRequests, isHourly]);

  // Load time entries (salary path only)
  useEffect(() => {
    if (isHourly) return;
    if (!selectedUserId) return;

    (async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        // Calculate date range for all weeks
        const startDate = toDateOnlyString(currentWeekStart);
        const endDate = toDateOnlyString(addDays(currentWeekStart, weeksToShow * 7 - 1));

        const apiEntries = await fetchDailyTimeEntries(
          selectedUserId,
          startDate,
          endDate
        );

        // Index by date
        const byDate = new Map<string, DailyTimeEntryDto>();
        for (const e of apiEntries) byDate.set(e.workDate.slice(0, 10), e);

        // Build week data
        const weeksData: WeekData[] = [];

        for (let w = 0; w < weeksToShow; w++) {
          const weekStartDate = addDays(currentWeekStart, w * 7);
          const days: WeekEntry[] = [];

          for (let d = 0; d < 7; d++) {
            const date = addDays(weekStartDate, d);
            const dateStr = toDateOnlyString(date);
            const existing = byDate.get(dateStr);
            const approvedPto = approvedPtoByDate.get(dateStr);

            const ptoHours = approvedPto ? approvedPto.hours : (existing ? Number(existing.ptoHours) || 0 : 0);
            const notes = approvedPto ? approvedPto.note : (existing?.notes || "");

            days.push({
              date: dateStr,
              workedHours: existing ? Number(existing.workedHours) || 0 : 0,
              ptoHours,
              dayType: existing?.dayType || (approvedPto ? "PTO" : "Work"),
              notes,
              id: existing?.id,
              isWeekend: isWeekend(dateStr),
              dayName: getDayName(dateStr),
              approvedPto: !!approvedPto,
            });
          }

          const totalWorked = days.reduce((sum, d) => sum + d.workedHours, 0);
          const totalPto = days.reduce((sum, d) => sum + d.ptoHours, 0);

          weeksData.push({
            weekStart: toDateOnlyString(weekStartDate),
            weekEnd: toDateOnlyString(addDays(weekStartDate, 6)),
            weekLabel: formatWeekLabel(weekStartDate),
            days,
            totalWorked,
            totalPto,
          });
        }

        setWeeks(weeksData);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load time entries.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedUserId, currentWeekStart, weeksToShow, approvedPtoByDate, isHourly]);

  // Navigation
  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(getWeekStart(today, weekStartDay));
  };

  // Update entry
  const handleEntryChange = (
    weekIndex: number,
    dayIndex: number,
    field: "workedHours" | "ptoHours" | "notes",
    value: string
  ) => {
    setWeeks((prev) => {
      const next = [...prev];
      const week = { ...next[weekIndex] };
      const days = [...week.days];
      const day = { ...days[dayIndex] };

      // PTO and notes are always read-only (driven by approved PTO requests)
      if (field === "ptoHours" || field === "notes") return prev;

      const n = value === "" ? 0 : Number(value);
      day.workedHours = Number.isFinite(n) ? n : 0;

      // Auto-update dayType
      const wh = day.workedHours;
      const ph = day.ptoHours;
      if (ph > 0 && wh > 0) day.dayType = "Mixed";
      else if (ph > 0) day.dayType = "PTO";
      else day.dayType = "Work";

      days[dayIndex] = day;
      week.days = days;
      week.totalWorked = days.reduce((sum, d) => sum + d.workedHours, 0);
      week.totalPto = days.reduce((sum, d) => sum + d.ptoHours, 0);
      next[weekIndex] = week;
      return next;
    });
  };

  // Quick fill: 8 hours Mon-Fri for a specific week
  const handleFillStandardWeek = (weekIndex: number) => {
    setWeeks((prev) => {
      const next = [...prev];
      const week = { ...next[weekIndex] };
      const days = [...week.days];

      for (let i = 0; i < 5; i++) { // Mon-Fri
        if (days[i].approvedPto) {
          days[i] = { ...days[i], workedHours: Math.max(0, 8 - days[i].ptoHours) };
        } else {
          days[i] = { ...days[i], workedHours: 8, ptoHours: 0, dayType: "Work" };
        }
      }

      week.days = days;
      week.totalWorked = days.reduce((sum, d) => sum + d.workedHours, 0);
      week.totalPto = days.reduce((sum, d) => sum + d.ptoHours, 0);
      next[weekIndex] = week;
      return next;
    });
  };

  // Save
  const handleSave = async () => {
    if (!selectedUserId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: DailyTimeEntryDto[] = weeks.flatMap((w) =>
        w.days.map((d) => ({
          id: d.id ?? 0,
          userId: selectedUserId,
          workDate: d.date,
          workedHours: d.workedHours,
          ptoHours: d.ptoHours,
          dayType: d.dayType,
          notes: d.notes || "",
        }))
      );

      await saveDailyTimeEntriesBulk(payload);
      setSuccess("Saved successfully!");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save entries.");
    } finally {
      setSaving(false);
    }
  };

  // --- Hourly employee: render clock interface ---
  if (isHourly && selectedUserId) {
    return (
      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "36px", fontFamily: "'Playfair Display', serif", color: "#002349", marginBottom: "8px" }}>
            Time Entries
          </h1>
          <p style={{ color: "#666666", fontSize: "15px" }}>
            Clock in and out to track your work hours.
          </p>
        </div>

        <HourlyClockView userId={selectedUserId} weekStartDay={weekStartDay} />
      </div>
    );
  }

  // --- Salary employee: existing weekly grid ---
  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Time Entries
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          Weekly time entry grid. Use "Fill 8h M-F" for standard work weeks.
        </p>

        {(error || success) && (
          <div style={{ marginTop: '16px' }}>
            {error && (
              <div style={{
                borderLeft: '4px solid #ef4444',
                backgroundColor: '#fef2f2',
                padding: '12px 16px',
                borderRadius: '0 8px 8px 0',
                fontSize: '14px',
                color: '#b91c1c',
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            {success && (
              <div style={{
                borderLeft: '4px solid #10b981',
                backgroundColor: '#ecfdf5',
                padding: '12px 16px',
                borderRadius: '0 8px 8px 0',
                fontSize: '14px',
                color: '#047857',
              }}>
                <strong>Success!</strong> {success}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        <div className="controls-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Week navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}>
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Previous week"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg style={{ width: '16px', height: '16px', color: '#64748b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div style={{ minWidth: '150px', textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Week of</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginTop: '4px' }}>
                  {weeks[0]?.weekLabel || "\u2014"}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextWeek}
                title="Next week"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg style={{ width: '16px', height: '16px', color: '#64748b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Totals */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: 'rgba(194, 155, 64, 0.05)',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(194, 155, 64, 0.2)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Total</div>
                <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349', marginTop: '4px' }}>{(grandTotalWorked + grandTotalPto).toFixed(1)}</div>
              </div>
              <div style={{ height: '40px', width: '1px', backgroundColor: 'rgba(194, 155, 64, 0.3)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Worked</div>
                <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349', marginTop: '4px' }}>{grandTotalWorked.toFixed(1)}</div>
              </div>
              <div style={{ height: '40px', width: '1px', backgroundColor: 'rgba(194, 155, 64, 0.3)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>PTO</div>
                <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>{grandTotalPto.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="controls-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleThisWeek}
              style={{
                backgroundColor: 'white',
                color: '#002349',
                padding: '12px 20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                backgroundColor: '#002349',
                color: 'white',
                padding: '12px 24px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: 'none',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Grids */}
      {loading ? (
        <LoadingSpinner message="Loading time entries..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {weeks.map((week, weekIdx) => {
            const totalCombined = week.totalWorked + week.totalPto;
            const isUnderHours = totalCombined < OT_THRESHOLD;
            const isOverHours = totalCombined > OT_THRESHOLD;
            const isPerfect = totalCombined === OT_THRESHOLD;

            // Overtime calculation for non-exempt employees
            const overtimeByDay = calculateDailyOvertime(week.days);
            const totalOvertime = overtimeByDay.reduce((sum, ot) => sum + ot, 0);

            // Exempt employee: warn when worked hours exceed threshold
            const exemptOverWorked = isExempt && week.totalWorked > OT_THRESHOLD;

            return (
              <div
                key={week.weekStart}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Week header */}
                <div className="week-header-bar" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                }}>
                  <div>
                    <div style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349' }}>
                      {week.weekLabel} {"\u2022"} {new Date(week.weekStart).getFullYear()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Total hours (worked + PTO) */}
                    {exemptOverWorked ? (
                      <div style={{
                        backgroundColor: '#d97706',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}>
                        {week.totalWorked.toFixed(1)} hrs worked this week
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: isPerfect ? '#059669' : isUnderHours ? '#64748b' : '#dc2626',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}>
                        {isNonExempt
                          ? `${totalCombined.toFixed(1)} / ${OT_THRESHOLD}h`
                          : `${totalCombined.toFixed(1)}h Total`}
                        {isPerfect && " \u2713"}
                        {isUnderHours && ` (-${(OT_THRESHOLD - totalCombined).toFixed(1)})`}
                        {isOverHours && ` (+${(totalCombined - OT_THRESHOLD).toFixed(1)})`}
                      </div>
                    )}

                    {week.totalPto > 0 && (
                      <div style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}>
                        PTO {week.totalPto.toFixed(1)}h
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleFillStandardWeek(weekIdx)}
                      style={{
                        backgroundColor: '#C29B40',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Fill 8h M-F
                    </button>
                  </div>
                </div>

                {/* Week grid */}
                <div className="timesheet-week-table" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#002349' }}>
                        <th style={{
                          width: '120px',
                          padding: '16px 24px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'white',
                        }}>
                          Type
                        </th>
                        {week.days.map((day) => (
                          <th
                            key={day.date}
                            style={{
                              minWidth: '100px',
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#001a38' : '#002349',
                            }}
                          >
                            <div style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'white',
                              marginBottom: '4px',
                            }}>
                              {day.dayName}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: 'rgba(255,255,255,0.7)',
                            }}>
                              {day.date.slice(5)}
                            </div>
                          </th>
                        ))}
                        <th style={{
                          width: '100px',
                          padding: '16px 24px',
                          textAlign: 'right',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'white',
                        }}>
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {/* Worked hours row */}
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{
                          padding: '20px 24px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#002349',
                          backgroundColor: '#f8fafc',
                        }}>
                          Worked
                        </td>
                        {week.days.map((day, dayIdx) => {
                          const hasOT = overtimeByDay[dayIdx] > 0;
                          return (
                          <td
                            key={day.date}
                            style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#fafafa' : hasOT ? '#fffbeb' : 'white',
                            }}
                          >
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={day.workedHours || ""}
                              onChange={(e) =>
                                handleEntryChange(weekIdx, dayIdx, "workedHours", e.target.value)
                              }
                              placeholder="0"
                              style={{
                                width: '100%',
                                maxWidth: '70px',
                                padding: '10px 8px',
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: hasOT ? '#92400e' : '#1e293b',
                                border: `2px solid ${hasOT ? '#f59e0b' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                outline: 'none',
                                backgroundColor: hasOT ? '#fffbeb' : undefined,
                              }}
                            />
                          </td>
                          );
                        })}
                        <td style={{
                          padding: '20px 24px',
                          textAlign: 'right',
                          fontSize: '18px',
                          fontFamily: "'Playfair Display', serif",
                          fontWeight: 700,
                          color: '#002349',
                          backgroundColor: '#f8fafc',
                        }}>
                          {week.totalWorked.toFixed(1)}
                        </td>
                      </tr>

                      {/* PTO hours row */}
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{
                          padding: '20px 24px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#002349',
                          backgroundColor: '#f8fafc',
                        }}>
                          PTO
                        </td>
                        {week.days.map((day) => (
                          <td
                            key={day.date}
                            style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#fafafa' : day.approvedPto ? '#eff6ff' : '#f8fafc',
                            }}
                          >
                            <input
                              type="number"
                              value={day.ptoHours || ""}
                              readOnly
                              tabIndex={-1}
                              placeholder="0"
                              title={day.approvedPto ? "Set by approved PTO request" : "PTO hours come from approved requests"}
                              style={{
                                width: '100%',
                                maxWidth: '70px',
                                padding: '10px 8px',
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: day.approvedPto ? '#2563eb' : '#94a3b8',
                                border: `2px solid ${day.approvedPto ? '#93c5fd' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                outline: 'none',
                                backgroundColor: day.approvedPto ? '#eff6ff' : '#f8fafc',
                                cursor: 'default',
                              }}
                            />
                          </td>
                        ))}
                        <td style={{
                          padding: '20px 24px',
                          textAlign: 'right',
                          fontSize: '18px',
                          fontFamily: "'Playfair Display', serif",
                          fontWeight: 700,
                          color: '#2563eb',
                          backgroundColor: '#f8fafc',
                        }}>
                          {week.totalPto.toFixed(1)}
                        </td>
                      </tr>

                      {/* Overtime row - shown when any overtime exists */}
                      {totalOvertime > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{
                            padding: '20px 24px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#002349',
                            backgroundColor: '#f8fafc',
                          }}>
                            Overtime
                          </td>
                          {week.days.map((day, dayIdx) => (
                            <td
                              key={day.date}
                              style={{
                                padding: '16px 12px',
                                textAlign: 'center',
                                backgroundColor: day.isWeekend ? '#fafafa' : '#f8fafc',
                              }}
                            >
                              <span style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: overtimeByDay[dayIdx] > 0 ? '#d97706' : 'transparent',
                              }}>
                                {overtimeByDay[dayIdx] > 0 ? overtimeByDay[dayIdx].toFixed(1) : ''}
                              </span>
                            </td>
                          ))}
                          <td style={{
                            padding: '20px 24px',
                            textAlign: 'right',
                            fontSize: '18px',
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 700,
                            color: totalOvertime > 0 ? '#d97706' : '#002349',
                            backgroundColor: '#f8fafc',
                          }}>
                            {totalOvertime > 0 ? totalOvertime.toFixed(1) : ''}
                          </td>
                        </tr>
                      )}

                      {/* Notes row */}
                      <tr>
                        <td style={{
                          padding: '20px 24px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#002349',
                          backgroundColor: '#f8fafc',
                          verticalAlign: 'top',
                        }}>
                          Notes
                        </td>
                        {week.days.map((day) => (
                          <td
                            key={day.date}
                            style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#fafafa' : day.approvedPto ? '#eff6ff' : '#f8fafc',
                              verticalAlign: 'top',
                            }}
                          >
                            <textarea
                              rows={2}
                              value={day.notes || ""}
                              readOnly
                              tabIndex={-1}
                              placeholder={day.approvedPto ? "" : "\u2014"}
                              style={{
                                width: '100%',
                                minWidth: '80px',
                                padding: '8px',
                                fontSize: '12px',
                                color: day.approvedPto ? '#2563eb' : '#94a3b8',
                                border: `2px solid ${day.approvedPto ? '#93c5fd' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                outline: 'none',
                                resize: 'none',
                                backgroundColor: day.approvedPto ? '#eff6ff' : '#f8fafc',
                                cursor: 'default',
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ backgroundColor: '#f8fafc' }}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View - only visible on mobile */}
                <div className="timesheet-mobile-cards">
                  {week.days.map((day, dayIdx) => (
                    <div
                      key={day.date}
                      className={`timesheet-day-card ${day.isWeekend ? 'timesheet-day-card--weekend' : ''}`}
                    >
                      <div className="timesheet-day-card__header">
                        <span className="timesheet-day-card__date">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="timesheet-day-card__day">{day.dayName}</span>
                      </div>
                      <div className="timesheet-day-card__body">
                        <div className="timesheet-day-card__field">
                          <span className="timesheet-day-card__label">Worked Hours</span>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={day.workedHours || ""}
                            onChange={(e) => handleEntryChange(weekIdx, dayIdx, "workedHours", e.target.value)}
                            placeholder="0"
                            className="timesheet-day-card__input"
                          />
                        </div>
                        <div className="timesheet-day-card__field">
                          <span className="timesheet-day-card__label">
                            PTO Hours
                            {day.approvedPto && <span style={{ color: '#2563eb', fontSize: '10px', marginLeft: '6px' }}>APPROVED</span>}
                          </span>
                          <input
                            type="number"
                            value={day.ptoHours || ""}
                            readOnly
                            tabIndex={-1}
                            placeholder="0"
                            className="timesheet-day-card__input"
                            style={{ backgroundColor: day.approvedPto ? '#eff6ff' : '#f8fafc', color: day.approvedPto ? '#2563eb' : '#94a3b8', borderColor: day.approvedPto ? '#93c5fd' : '#e2e8f0', cursor: 'default' }}
                          />
                        </div>
                        {overtimeByDay[dayIdx] > 0 && (
                          <div className="timesheet-day-card__field">
                            <span className="timesheet-day-card__label" style={{ color: '#d97706' }}>Overtime</span>
                            <span style={{
                              display: 'block',
                              padding: '10px 8px',
                              textAlign: 'center',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#d97706',
                              backgroundColor: '#fffbeb',
                              border: '2px solid #fcd34d',
                              borderRadius: '6px',
                            }}>
                              {overtimeByDay[dayIdx].toFixed(1)}
                            </span>
                          </div>
                        )}
                        <textarea
                          rows={2}
                          value={day.notes || ""}
                          readOnly
                          tabIndex={-1}
                          placeholder={day.approvedPto ? "" : "\u2014"}
                          className="timesheet-day-card__notes"
                          style={{ backgroundColor: day.approvedPto ? '#eff6ff' : '#f8fafc', color: day.approvedPto ? '#2563eb' : '#94a3b8', borderColor: day.approvedPto ? '#93c5fd' : '#e2e8f0', cursor: 'default' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Totals */}
                <div className="timesheet-mobile-totals">
                  <div className="timesheet-mobile-totals__item">
                    <div className="timesheet-mobile-totals__value">{grandTotalWorked.toFixed(1)}</div>
                    <div className="timesheet-mobile-totals__label">Hours Worked</div>
                  </div>
                  <div className="timesheet-mobile-totals__item">
                    <div className="timesheet-mobile-totals__value">{grandTotalPto.toFixed(1)}</div>
                    <div className="timesheet-mobile-totals__label">PTO Hours</div>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="timesheet-mobile-actions">
                  <button
                    type="button"
                    onClick={() => handleFillStandardWeek(weekIdx)}
                    className="btn btn-secondary"
                  >
                    Fill 8h M-F
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="btn btn-navy"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div style={{
        marginTop: '24px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #C29B40',
        borderRadius: '0 12px 12px 0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>lightbulb</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349', marginBottom: '4px' }}>Quick Tips</div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            Use <strong style={{ color: '#002349' }}>0.5 increments</strong> (30 min) {"\u2022"}
            Click <strong style={{ color: '#C29B40' }}>Fill 8h M-F</strong> for standard weeks {"\u2022"}
            Navigate with <strong style={{ color: '#002349' }}>arrow buttons</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
