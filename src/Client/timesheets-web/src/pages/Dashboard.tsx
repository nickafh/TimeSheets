import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { Link } from "react-router-dom";
import {
  fetchActiveNotifications,
  fetchHolidays,
  fetchEarlyClosures,
  fetchUserPtoSummary,
  fetchDailyTimeEntries,
  fetchClockStatus,
  type NotificationDto,
  type HolidayDto,
  type EarlyClosureDto,
  type UserPtoSummary,
  type DailyTimeEntryDto,
  type ClockStatusDto,
} from "../api";

const STATE_COLORS: Record<string, string> = {
  not_started: "#94a3b8",
  clocked_in: "#059669",
  lunch_out: "#d97706",
  lunch_in: "#059669",
  clocked_out: "#002349",
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [closures, setClosures] = useState<EarlyClosureDto[]>([]);
  const [ptoSummary, setPtoSummary] = useState<UserPtoSummary | null>(null);
  const [weekEntries, setWeekEntries] = useState<DailyTimeEntryDto[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [loadingPto, setLoadingPto] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);

  // Clock status state (hourly employees only)
  const isHourly = user?.payType === "Hourly";
  const [clockStatus, setClockStatus] = useState<ClockStatusDto | null>(null);
  const [loadingClock, setLoadingClock] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("");

  const currentYear = new Date().getFullYear();

  // Calculate current week (Monday-Friday)
  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { start: fmt(monday), end: fmt(friday), monday, friday };
  };

  const weekRange = getWeekRange();

  useEffect(() => {
    loadNotifications();
    loadHolidaysAndClosures();
    loadPtoSummary();
    loadWeekEntries();
  }, [user?.id]);

  // Load clock status for hourly employees
  useEffect(() => {
    if (!isHourly) {
      setLoadingClock(false);
      return;
    }
    const loadClock = async () => {
      try {
        setLoadingClock(true);
        const status = await fetchClockStatus();
        setClockStatus(status);
      } catch (err) {
        console.error("Failed to load clock status:", err);
      } finally {
        setLoadingClock(false);
      }
    };
    loadClock();
  }, [isHourly]);

  // Live elapsed time ticker
  useEffect(() => {
    if (!clockStatus) return;

    const { currentState, clockInTime, lunchMinutes } = clockStatus;

    // Only tick for active states
    if (currentState !== "clocked_in" && currentState !== "lunch_in" && currentState !== "lunch_out") {
      setElapsedTime("");
      return;
    }

    if (!clockInTime) {
      setElapsedTime("");
      return;
    }

    // For lunch_out state, show frozen elapsed time (pre-lunch value)
    if (currentState === "lunch_out") {
      const clockInMs = new Date(clockInTime).getTime();
      const lunchOutPunch = clockStatus.todayPunches.find(p => p.punchType === "LunchOut");
      if (lunchOutPunch) {
        const lunchOutMs = new Date(lunchOutPunch.punchTime).getTime();
        const workedMs = lunchOutMs - clockInMs;
        setElapsedTime(formatElapsed(Math.max(0, workedMs)));
      }
      return;
    }

    // For clocked_in and lunch_in, tick every second
    const lunchDeductionMs = (lunchMinutes ?? 0) * 60 * 1000;
    const clockInMs = new Date(clockInTime).getTime();

    const update = () => {
      const now = Date.now();
      const elapsed = now - clockInMs - lunchDeductionMs;
      setElapsedTime(formatElapsed(Math.max(0, elapsed)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [clockStatus]);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const data = await fetchActiveNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadHolidaysAndClosures = async () => {
    try {
      setLoadingHolidays(true);
      const [holidayData, closureData] = await Promise.all([
        fetchHolidays(),
        fetchEarlyClosures(),
      ]);
      setHolidays(holidayData);
      setClosures(closureData);
    } catch (error) {
      console.error("Failed to load holidays/closures:", error);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const loadPtoSummary = async () => {
    if (!user?.id) return;
    try {
      setLoadingPto(true);
      const summary = await fetchUserPtoSummary(user.id, currentYear);
      setPtoSummary(summary);
    } catch (error) {
      console.error("Failed to load PTO summary:", error);
    } finally {
      setLoadingPto(false);
    }
  };

  const loadWeekEntries = async () => {
    if (!user?.id) return;
    try {
      setLoadingWeek(true);
      const entries = await fetchDailyTimeEntries(user.id, weekRange.start, weekRange.end);
      setWeekEntries(entries);
    } catch (error) {
      console.error("Failed to load week entries:", error);
    } finally {
      setLoadingWeek(false);
    }
  };

  const totalWorked = weekEntries.reduce((sum, e) => sum + e.workedHours, 0);
  const totalPto = weekEntries.reduce((sum, e) => sum + e.ptoHours, 0);
  const totalLogged = totalWorked + totalPto;
  const weeklyTarget = 40;
  const remaining = Math.max(0, weeklyTarget - totalLogged);
  const progressPct = Math.min(100, (totalLogged / weeklyTarget) * 100);

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Filter for current year only and check if upcoming
  const isPast = (dateStr: string) => new Date(dateStr) < new Date(new Date().toDateString());

  const filteredHolidays = holidays
    .filter((h) => new Date(h.holidayDate).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime());

  const filteredClosures = closures
    .filter((c) => new Date(c.closureDate).getFullYear() === currentYear)
    .sort((a, b) => new Date(a.closureDate).getTime() - new Date(b.closureDate).getTime());

  const upcomingHolidays = filteredHolidays.filter(h => !isPast(h.holidayDate));
  const upcomingClosures = filteredClosures.filter(c => !isPast(c.closureDate));

  // Clock status card helper — compact design to fit 2x2 grid
  const renderClockStatusCard = () => {
    if (!isHourly) return null;

    const state = clockStatus?.currentState ?? "not_started";
    const stateColor = STATE_COLORS[state] ?? "#94a3b8";
    const isActive = state === "clocked_in" || state === "lunch_in";
    const isOnLunch = state === "lunch_out";
    const isDone = state === "clocked_out";
    const punches = clockStatus?.todayPunches ?? [];

    // Short status labels for compact display
    const shortLabels: Record<string, string> = {
      not_started: "Not Clocked In",
      clocked_in: "Clocked In",
      lunch_out: "On Lunch",
      lunch_in: "Back from Lunch",
      clocked_out: "Day Complete",
    };

    // Short punch labels for timeline
    const punchIcons: Record<string, string> = {
      ClockIn: "In",
      LunchOut: "L-Out",
      LunchIn: "L-In",
      ClockOut: "Out",
    };

    const formatShortTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '32px' }}>
          {/* Header row — title + live status badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>Clock Status</h3>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '6px 12px',
              borderRadius: '2px',
              color: 'white',
              backgroundColor: stateColor,
              ...(isActive ? { boxShadow: `0 0 10px ${stateColor}40` } : {}),
            }}>
              {shortLabels[state] ?? state}
            </span>
          </div>

          {loadingClock ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#999999', fontStyle: 'italic' }}>Loading...</div>
          ) : (
            <>
              {/* Hero number — elapsed time or total hours */}
              <div style={{ marginBottom: '20px' }}>
                {isDone && clockStatus?.totalHoursToday != null ? (
                  <>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.15em', marginBottom: '8px' }}>
                      Total Hours Today
                    </p>
                    <p style={{ fontSize: '32px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
                      {clockStatus.totalHoursToday.toFixed(2)} <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif", fontWeight: 400, color: '#666666' }}>hrs</span>
                    </p>
                  </>
                ) : (isActive || isOnLunch) && elapsedTime ? (
                  <>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.15em', marginBottom: '8px' }}>
                      {isOnLunch ? "Paused" : "Elapsed"}
                    </p>
                    <p style={{
                      fontSize: '32px',
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 700,
                      color: isOnLunch ? '#d97706' : '#002349',
                      letterSpacing: '1px',
                    }}>
                      {elapsedTime}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No punches today
                  </p>
                )}
              </div>

              {/* Punch timeline — compact horizontal chips */}
              {punches.length > 0 && (
                <div>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.15em', marginBottom: '10px' }}>
                    Today's Punches
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {punches.map((punch) => (
                      <div key={punch.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '3px',
                        border: '1px solid #f1f5f9',
                        fontSize: '11px',
                      }}>
                        <span style={{ fontWeight: 700, color: '#002349' }}>
                          {punchIcons[punch.punchType] ?? punch.punchType}
                        </span>
                        <span style={{ color: '#64748b', fontFamily: "'Courier New', monospace", fontSize: '11px' }}>
                          {formatShortTime(punch.punchTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.1em' }}>
            {punches.length} punch{punches.length !== 1 ? "es" : ""} today
          </span>
          <Link to="/timesheets/weekly" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#C29B40', letterSpacing: '0.1em', textDecoration: 'none' }}>
            Go to Time Entries
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container dashboard-container">
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          Welcome back, {user?.name?.split(" ")[0]}. Here is your overview for {currentMonth}.
        </p>
      </div>

      {/* Notifications Section */}
      {!loadingNotifications && notifications.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                backgroundColor: 'rgba(194, 155, 64, 0.05)',
                border: '1px solid rgba(194, 155, 64, 0.2)',
                padding: '24px',
                marginBottom: '16px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '24px' }}>campaign</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '10px', color: '#C29B40', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>
                    Announcement
                  </p>
                  <h3 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
                    {notification.title}
                  </h3>
                  <p style={{ marginTop: '8px', fontSize: '14px', color: '#666666', lineHeight: 1.6 }}>
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard Cards - 2x2 Grid on desktop, single column on mobile */}
      <div className="dashboard-cards-grid">
        {/* Clock Status (hourly) OR This Week's Hours (salary) — first grid cell */}
        {isHourly ? renderClockStatusCard() : null}
        {/* This Week's Hours (salary employees only — hourly employees have Clock Status instead) */}
        {!isHourly && <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>This Week's Hours</h3>
              <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '28px', opacity: 0.5 }}>schedule</span>
            </div>
            <p style={{ fontSize: '13px', color: '#666666', marginBottom: '24px' }}>
              {weekRange.monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekRange.friday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {loadingWeek ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#999999', fontStyle: 'italic' }}>Loading...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '32px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
                    {totalLogged.toFixed(1)}<span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif", fontWeight: 400, color: '#666666' }}> / {weeklyTarget}h</span>
                  </span>
                  <span style={{ fontSize: '13px', color: progressPct >= 100 ? '#059669' : '#666666', fontWeight: 600 }}>
                    {progressPct >= 100 ? 'Complete' : `${remaining.toFixed(1)}h remaining`}
                  </span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    backgroundColor: progressPct >= 100 ? '#059669' : '#C29B40',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </>
            )}
          </div>
          <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.1em' }}>
              {weekEntries.length} of 5 days logged
            </span>
            <Link to="/timesheets/weekly" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#C29B40', letterSpacing: '0.1em', textDecoration: 'none' }}>
              Enter Time
            </Link>
          </div>
        </div>}

        {/* Time Off Overview */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>Time Off Overview</h3>
              <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '28px', opacity: 0.5 }}>beach_access</span>
            </div>
            <p style={{ fontSize: '14px', color: '#666666', marginBottom: '24px' }}>
              A quick snapshot of your PTO balance and next upcoming approved day off.
            </p>
            {loadingPto ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#999999', fontStyle: 'italic' }}>Loading...</div>
            ) : (
              <div className="pto-overview-stats">
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '4px' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.15em', marginBottom: '8px' }}>
                    Available PTO
                  </p>
                  <p style={{ fontSize: '32px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
                    {ptoSummary?.paidTimeOffRemaining.toFixed(1) ?? '0.0'} <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif", fontWeight: 400, color: '#666666' }}>hrs</span>
                  </p>
                  {ptoSummary && (
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {ptoSummary.isFirstYearAccrual
                        ? `Accrued (${ptoSummary.accruedHours.toFixed(0)}h of ${ptoSummary.annualAllowanceHours.toFixed(0)}h)`
                        : `Tier ${ptoSummary.currentTier} — ${ptoSummary.annualAllowanceHours.toFixed(0)}h/year`}
                    </p>
                  )}
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '4px' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.15em', marginBottom: '8px' }}>
                    Used YTD
                  </p>
                  <p style={{ fontSize: '32px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
                    {ptoSummary?.totalApproved.toFixed(1) ?? '0.0'} <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif", fontWeight: 400, color: '#666666' }}>hrs</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Company Holidays */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>Company Holidays {currentYear}</h3>
              <span style={{ backgroundColor: '#002349', color: 'white', fontSize: '9px', fontWeight: 700, padding: '6px 12px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {upcomingHolidays.length} Upcoming
              </span>
            </div>

            {loadingHolidays ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#999999', fontStyle: 'italic' }}>Loading...</div>
            ) : filteredHolidays.length === 0 ? (
              <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#e2e8f0', fontSize: '48px', marginBottom: '12px' }}>event_busy</span>
                <p style={{ fontSize: '14px', color: '#666666', fontStyle: 'italic' }}>No holidays found for {currentYear}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredHolidays.slice(0, 2).map((holiday) => {
                  const date = new Date(holiday.holidayDate);
                  const past = isPast(holiday.holidayDate);

                  return (
                    <div
                      key={holiday.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: past ? '#fafafa' : 'rgba(194, 155, 64, 0.03)',
                        opacity: past ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px',
                        backgroundColor: 'white',
                      }}>
                        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>celebration</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '15px', color: '#002349' }}>{holiday.name}</p>
                        <p style={{ fontSize: '13px', color: '#666666' }}>
                          {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: past ? '#94a3b8' : '#059669',
                      }}>
                        {past ? "Past" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.1em' }}>
              Total: {filteredHolidays.length} Holiday{filteredHolidays.length !== 1 ? "s" : ""} in {currentYear}
            </span>
            <Link to="/calendar" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#C29B40', letterSpacing: '0.1em', textDecoration: 'none' }}>
              View Calendar
            </Link>
          </div>
        </div>

        {/* Early Closures */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '32px', backgroundColor: upcomingClosures.length === 0 ? 'rgba(254, 249, 195, 0.3)' : 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>Early Closures {currentYear}</h3>
              <span style={{ backgroundColor: upcomingClosures.length > 0 ? '#002349' : '#999999', color: 'white', fontSize: '9px', fontWeight: 700, padding: '6px 12px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {upcomingClosures.length} Upcoming
              </span>
            </div>

            {loadingHolidays ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#999999', fontStyle: 'italic' }}>Loading...</div>
            ) : filteredClosures.length === 0 ? (
              <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#d4d4d4', fontSize: '48px', marginBottom: '12px' }}>event_busy</span>
                <p style={{ fontSize: '14px', color: '#666666', fontStyle: 'italic' }}>No early closures found for {currentYear}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredClosures.slice(0, 2).map((closure) => {
                  const date = new Date(closure.closureDate);
                  const past = isPast(closure.closureDate);

                  return (
                    <div
                      key={closure.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: 'white',
                        opacity: past ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px',
                        backgroundColor: 'white',
                      }}>
                        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>schedule</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '15px', color: '#002349' }}>{closure.name}</p>
                        <p style={{ fontSize: '13px', color: '#666666' }}>
                          {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                          <span style={{ color: '#C29B40', fontWeight: 600, marginLeft: '8px' }}>Close at {closure.closeTime}</span>
                        </p>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: past ? '#94a3b8' : '#C29B40',
                      }}>
                        {past ? "Past" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.1em' }}>
              Total: {filteredClosures.length} Early Closure{filteredClosures.length !== 1 ? "s" : ""} in {currentYear}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
