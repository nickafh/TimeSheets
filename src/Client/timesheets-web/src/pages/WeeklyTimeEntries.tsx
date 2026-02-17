// src/pages/WeeklyTimeEntries.tsx

import { useEffect, useMemo, useState } from "react";
import type { DailyTimeEntryDto, PtoRequestWithUserDto } from "../api";
import {
  fetchDailyTimeEntries,
  saveDailyTimeEntriesBulk,
  fetchUserPtoRequests,
} from "../api";
import { useAuth } from "../auth/useAuth";

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

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday;
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const monthStart = monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const monthEnd = sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${monthStart} - ${monthEnd}`;
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export default function WeeklyTimeEntries() {
  const today = useMemo(() => new Date(), []);
  const { user: authUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Start with current week's Monday
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(today));
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

  // Select the authenticated user directly to avoid cross-user fallback behavior
  useEffect(() => {
    if (authUser?.id) {
      setSelectedUserId(authUser.id);
      setError("");
    }
  }, [authUser]);

  // Load approved PTO requests for this user
  useEffect(() => {
    if (!selectedUserId) return;
    fetchUserPtoRequests(selectedUserId)
      .then((reqs) => setApprovedPtoRequests(reqs.filter((r) => r.status === 1)))
      .catch(() => {});
  }, [selectedUserId]);

  // Build a set of dates with approved PTO and a map of date -> { hours, reason, ptoTypeName }
  const approvedPtoByDate = useMemo(() => {
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
        // Single day – use exact hours from request
        const note = `Approved ${typeName}${req.reason ? ` – ${req.reason}` : ""}`;
        const existing = map.get(startStr);
        map.set(startStr, {
          hours: (existing?.hours || 0) + req.hours,
          note: existing ? `${existing.note}; ${note}` : note,
        });
      } else {
        // Date range – count working days and distribute hours evenly
        let workDays = 0;
        for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
          const dow = cur.getDay();
          if (dow !== 0 && dow !== 6) workDays++;
        }
        const hoursPerDay = workDays > 0 ? req.hours / workDays : req.hours;
        const note = `Approved ${typeName}${req.reason ? ` – ${req.reason}` : ""}`;
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
  }, [approvedPtoRequests]);

  // Load time entries
  useEffect(() => {
    if (!selectedUserId) return;

    (async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        // Calculate date range for all weeks
        const startDate = toDateOnlyString(currentMonday);
        const endDate = toDateOnlyString(addDays(currentMonday, weeksToShow * 7 - 1));

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
          const weekMonday = addDays(currentMonday, w * 7);
          const days: WeekEntry[] = [];

          for (let d = 0; d < 7; d++) {
            const date = addDays(weekMonday, d);
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
            weekStart: toDateOnlyString(weekMonday),
            weekEnd: toDateOnlyString(addDays(weekMonday, 6)),
            weekLabel: formatWeekLabel(weekMonday),
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
  }, [selectedUserId, currentMonday, weeksToShow, approvedPtoByDate]);

  // Navigation
  const handlePrevWeek = () => {
    setCurrentMonday((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentMonday((prev) => addDays(prev, 7));
  };

  const handleThisWeek = () => {
    setCurrentMonday(getMonday(today));
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

      if (field === "notes") {
        day.notes = value;
      } else {
        const n = value === "" ? 0 : Number(value);
        day[field] = Number.isFinite(n) ? n : 0;

        // Auto-update dayType
        const wh = day.workedHours;
        const ph = day.ptoHours;
        if (ph > 0 && wh > 0) day.dayType = "Mixed";
        else if (ph > 0) day.dayType = "PTO";
        else day.dayType = "Work";
      }

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
        days[i] = { ...days[i], workedHours: 8, ptoHours: 0, dayType: "Work" };
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
                  {weeks[0]?.weekLabel || "—"}
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
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Hours</div>
                <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349', marginTop: '4px' }}>{grandTotalWorked.toFixed(1)}</div>
              </div>
              <div style={{ height: '40px', width: '1px', backgroundColor: 'rgba(194, 155, 64, 0.3)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>PTO</div>
                <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349', marginTop: '4px' }}>{grandTotalPto.toFixed(1)}</div>
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
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', opacity: 0.5 }}>hourglass_empty</span>
          <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px' }}>Loading time entries...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {weeks.map((week, weekIdx) => {
            const isUnderHours = week.totalWorked < 40;
            const isOverHours = week.totalWorked > 40;
            const isPerfect = week.totalWorked === 40;

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
                      {week.weekLabel} • {new Date(week.weekStart).getFullYear()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Week totals */}
                    <div style={{
                      backgroundColor: isPerfect ? '#059669' : isUnderHours ? '#64748b' : '#dc2626',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}>
                      {week.totalWorked.toFixed(1)}h
                      {isPerfect && " ✓"}
                      {isUnderHours && ` (-${(40 - week.totalWorked).toFixed(1)})`}
                      {isOverHours && ` (+${(week.totalWorked - 40).toFixed(1)})`}
                    </div>

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
                        {week.days.map((day, dayIdx) => (
                          <td
                            key={day.date}
                            style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#fafafa' : 'white',
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
                                color: '#1e293b',
                                border: '2px solid #e2e8f0',
                                borderRadius: '6px',
                                outline: 'none',
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
                        {week.days.map((day, dayIdx) => (
                          <td
                            key={day.date}
                            style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#fafafa' : day.approvedPto ? '#eff6ff' : 'white',
                            }}
                          >
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={day.ptoHours || ""}
                              onChange={(e) =>
                                handleEntryChange(weekIdx, dayIdx, "ptoHours", e.target.value)
                              }
                              readOnly={day.approvedPto}
                              placeholder="0"
                              title={day.approvedPto ? "Set by approved PTO request" : undefined}
                              style={{
                                width: '100%',
                                maxWidth: '70px',
                                padding: '10px 8px',
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: day.approvedPto ? '#2563eb' : '#1e293b',
                                border: `2px solid ${day.approvedPto ? '#93c5fd' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                outline: 'none',
                                backgroundColor: day.approvedPto ? '#eff6ff' : 'white',
                                cursor: day.approvedPto ? 'not-allowed' : undefined,
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
                        {week.days.map((day, dayIdx) => (
                          <td
                            key={day.date}
                            style={{
                              padding: '16px 12px',
                              textAlign: 'center',
                              backgroundColor: day.isWeekend ? '#fafafa' : day.approvedPto ? '#eff6ff' : 'white',
                              verticalAlign: 'top',
                            }}
                          >
                            <textarea
                              rows={2}
                              value={day.notes || ""}
                              onChange={(e) =>
                                handleEntryChange(weekIdx, dayIdx, "notes", e.target.value)
                              }
                              readOnly={day.approvedPto}
                              placeholder={day.approvedPto ? "" : "Notes..."}
                              style={{
                                width: '100%',
                                minWidth: '80px',
                                padding: '8px',
                                fontSize: '12px',
                                color: day.approvedPto ? '#2563eb' : '#1e293b',
                                border: `2px solid ${day.approvedPto ? '#93c5fd' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                outline: 'none',
                                resize: 'none',
                                backgroundColor: day.approvedPto ? '#eff6ff' : '#f8fafc',
                                cursor: day.approvedPto ? 'not-allowed' : undefined,
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
                            min={0}
                            step={0.5}
                            value={day.ptoHours || ""}
                            onChange={(e) => handleEntryChange(weekIdx, dayIdx, "ptoHours", e.target.value)}
                            readOnly={day.approvedPto}
                            placeholder="0"
                            className="timesheet-day-card__input"
                            style={day.approvedPto ? { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#93c5fd' } : undefined}
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={day.notes || ""}
                          onChange={(e) => handleEntryChange(weekIdx, dayIdx, "notes", e.target.value)}
                          readOnly={day.approvedPto}
                          placeholder={day.approvedPto ? "" : "Notes..."}
                          className="timesheet-day-card__notes"
                          style={day.approvedPto ? { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#93c5fd' } : undefined}
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
            Use <strong style={{ color: '#002349' }}>0.5 increments</strong> (30 min) •
            Click <strong style={{ color: '#C29B40' }}>Fill 8h M-F</strong> for standard weeks •
            Navigate with <strong style={{ color: '#002349' }}>arrow buttons</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
