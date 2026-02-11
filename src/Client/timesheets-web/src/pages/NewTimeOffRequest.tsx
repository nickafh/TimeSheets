import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { createPtoRequest, fetchHolidays } from "../api";
import type { HolidayDto } from "../api";

const PTO_TYPE_TO_ID: Record<string, number> = {
  "Paid Time Off": 1,
  "Jury Duty": 2,
  "Volunteer Time": 3,
  "Bereavement": 4,
  "Leave": 5,
};

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWorkingDays(
  start: Date,
  end: Date,
  holidaySet: Set<string>,
): { count: number; excludedHolidays: { date: string; name: string }[] } {
  const excluded: { date: string; name: string }[] = [];
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const ds = formatDateStr(cur);
    if (dow !== 0 && dow !== 6) {
      if (holidaySet.has(ds)) {
        // We'll populate name later in the caller
        excluded.push({ date: ds, name: "" });
      } else {
        count++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { count, excludedHolidays: excluded };
}

const NewTimeOffRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"one" | "range">("one");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hours, setHours] = useState(8);
  const [type, setType] = useState("Paid Time Off");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);

  useEffect(() => {
    fetchHolidays()
      .then(setHolidays)
      .catch(() => {});
  }, []);

  const holidayMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of holidays) {
      const dateStr = h.holidayDate.slice(0, 10);
      m.set(dateStr, h.name);
    }
    return m;
  }, [holidays]);

  const holidaySet = useMemo(() => new Set(holidayMap.keys()), [holidayMap]);

  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = mode === "range" && endDate ? new Date(endDate + "T00:00:00") : null;
  const isRange = mode === "range" && start && end && end > start;

  const { workingDays, excludedHolidays } = useMemo(() => {
    if (!isRange || !start || !end) return { workingDays: 1, excludedHolidays: [] as { date: string; name: string }[] };
    const result = getWorkingDays(start, end, holidaySet);
    const withNames = result.excludedHolidays.map((h) => ({
      date: h.date,
      name: holidayMap.get(h.date) || "Holiday",
    }));
    return { workingDays: result.count, excludedHolidays: withNames };
  }, [startDate, endDate, isRange, holidaySet, holidayMap]);

  const singleDayIsHoliday = useMemo(() => {
    if (mode !== "one" || !startDate) return null;
    const name = holidayMap.get(startDate);
    return name || null;
  }, [mode, startDate, holidayMap]);

  useEffect(() => {
    if (isRange) {
      setHours(workingDays * 8);
    }
  }, [isRange, workingDays]);

  // When switching to one-day mode, clear end date and reset hours
  useEffect(() => {
    if (mode === "one") {
      setEndDate("");
      setHours((h) => (h <= 0 ? 8 : Math.min(h, 24)));
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setError("You must be logged in to submit a request.");
      return;
    }
    setError(null);

    if (mode === "one" && singleDayIsHoliday) {
      setError(`Cannot request PTO on a company holiday (${singleDayIsHoliday}).`);
      return;
    }
    if (mode === "one" && startDate) {
      const d = new Date(startDate + "T12:00:00");
      if (d.getDay() === 0 || d.getDay() === 6) {
        setError("Cannot request PTO on weekends. Please select a workday.");
        return;
      }
    }
    if (isRange && excludedHolidays.length > 0) {
      setError(
        `Cannot request PTO on company holidays. Your range includes: ${excludedHolidays.map((h) => h.name).join(", ")}. Please select workdays only.`
      );
      return;
    }
    if (isRange && start && end) {
      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        if (cur.getDay() === 0 || cur.getDay() === 6) {
          setError("Cannot request PTO on weekends. Please select workdays only.");
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await createPtoRequest({
        userId: user.id,
        dateOfLeave: startDate + "T00:00:00",
        endDate: isRange ? endDate + "T00:00:00" : null,
        hours: Number(hours),
        reason: comment || null,
        ptoTypeId: PTO_TYPE_TO_ID[type] ?? 1,
      });
      navigate("/timeoff/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/timeoff/requests");
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    color: '#002349',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    fontFamily: "'Montserrat', sans-serif",
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#002349',
  };

  const toggleBtnStyle = (active: boolean) => ({
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderRadius: '6px',
    border: active ? '2px solid #002349' : '2px solid #e2e8f0',
    backgroundColor: active ? '#002349' : 'white',
    color: active ? 'white' : '#64748b',
    cursor: 'pointer' as const,
    transition: 'all 0.15s ease',
    minHeight: '44px',
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              minHeight: '44px',
              minWidth: '44px',
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Request Time Off
          </h1>
        </div>
        <p style={{ color: '#666666', fontSize: '15px', marginLeft: '40px' }}>
          Submit a new time off request for manager approval.
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#002349',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
            Time Off Details
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="pto-form" style={{ padding: '32px' }}>
          {error && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* One Day / Date Range Toggle */}
            <div>
              <label style={labelStyle}>Duration</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMode("one")}
                  style={toggleBtnStyle(mode === "one")}
                >
                  One Day
                </button>
                <button
                  type="button"
                  onClick={() => setMode("range")}
                  style={toggleBtnStyle(mode === "range")}
                >
                  Date Range
                </button>
              </div>
            </div>

            {/* Date Fields */}
            {mode === "one" ? (
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={inputStyle}
                />
                {singleDayIsHoliday && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fbbf24',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                    This date is a company holiday ({singleDayIsHoliday}). You may not need to request time off.
                  </div>
                )}
              </div>
            ) : (
              <div className="date-range-fields">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* Hours Field */}
            <div>
              <label style={labelStyle}>
                Number of Hours
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min={0}
                  max={isRange ? workingDays * 24 : 24}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  style={{ ...inputStyle, maxWidth: '120px', textAlign: 'center' }}
                />
                {mode === "one" && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[4, 8].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHours(h)}
                        style={{
                          backgroundColor: hours === h ? '#002349' : 'white',
                          color: hours === h ? 'white' : '#002349',
                          padding: '10px 16px',
                          fontSize: '14px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          minHeight: '44px',
                        }}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                )}
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {isRange
                    ? `(${workingDays} working day${workingDays !== 1 ? "s" : ""}, 0.5h increments)`
                    : "(0.5 hour increments)"}
                </span>
              </div>
            </div>

            {/* Type Field */}
            <div>
              <label style={labelStyle}>
                Type of Time Off
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="Paid Time Off">Paid Time Off (PTO)</option>
                <option value="Bereavement">Bereavement</option>
                <option value="Jury Duty">Jury Duty</option>
                <option value="Volunteer Time">Volunteer Time</option>
                <option value="Leave">Leave of Absence</option>
              </select>
            </div>

            {/* Comment Field */}
            <div>
              <label style={labelStyle}>
                Reason / Comment
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Optional: Provide a reason for your time off request..."
                style={{
                  ...inputStyle,
                  resize: 'none',
                }}
              />
            </div>
          </div>

          {/* Summary Box */}
          <div style={{
            marginTop: '32px',
            padding: '20px',
            backgroundColor: 'rgba(194, 155, 64, 0.05)',
            border: '1px solid rgba(194, 155, 64, 0.2)',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40', marginBottom: '12px' }}>
              Request Summary
            </div>
            <div className="request-summary-fields">
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date{isRange ? "s" : ""}</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#002349' }}>
                  {startDate
                    ? isRange && endDate
                      ? `${new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Hours</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#002349' }}>{hours}h</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Type</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#002349' }}>{type}</div>
              </div>
            </div>
            {/* Excluded holidays note */}
            {isRange && excludedHolidays.length > 0 && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(194, 155, 64, 0.2)',
                fontSize: '13px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', marginTop: '1px' }}>event_busy</span>
                <span>
                  {excludedHolidays.length} holiday{excludedHolidays.length !== 1 ? "s" : ""} excluded:{" "}
                  {excludedHolidays.map((h) => {
                    const d = new Date(h.date + "T00:00:00");
                    return `${h.name} (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
                  }).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions-mobile" style={{
            marginTop: '32px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                backgroundColor: 'white',
                color: '#64748b',
                padding: '14px 24px',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !startDate}
              style={{
                backgroundColor: '#002349',
                color: 'white',
                padding: '14px 24px',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: 'none',
                cursor: submitting || !startDate ? 'not-allowed' : 'pointer',
                opacity: submitting || !startDate ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '44px',
              }}
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div style={{
        marginTop: '24px',
        maxWidth: '600px',
        margin: '24px auto 0',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #C29B40',
        borderRadius: '0 12px 12px 0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>info</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349', marginBottom: '4px' }}>
            What Happens Next?
          </div>
          <div style={{ fontSize: '13px', color: '#666666', lineHeight: 1.6 }}>
            Your request will be sent to your manager for approval. You'll receive a notification once it's been reviewed.
            <strong style={{ color: '#002349' }}> Approved requests</strong> will automatically appear on the team calendar.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTimeOffRequest;
