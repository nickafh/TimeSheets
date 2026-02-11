// src/pages/CalendarView.tsx

import { useEffect, useState } from "react";
import { fetchHolidays, fetchAllPtoRequests, fetchCalendarToken, API_BASE_URL } from "../api";

interface Holiday {
  id: number;
  date: string;
  name: string;
}

interface PtoRequest {
  id: number;
  userId: number;
  userName: string;
  department: string | null;
  dateOfLeave: string;
  endDate: string | null; // YYYY-MM-DD; when set, request spans multiple days
  hours: number;
  status: number; // 0 = Pending, 1 = Approved, 2 = Denied
  reason: string | null;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  holidays: Holiday[];
  ptoRequests: PtoRequest[];
}

// Department color scheme - vibrant colors matching the design
const DEPARTMENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  // IT & Technical (Blue)
  "IT": { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#1e40af" },
  "Developer Services": { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#1e40af" },

  // Marketing (Pink/Red)
  "Marketing": { border: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", text: "#b91c1c" },
  "Mktg": { border: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", text: "#b91c1c" },
  "Marketing Designer": { border: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", text: "#b91c1c" },
  "Marketing Designers": { border: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", text: "#b91c1c" },

  // Accounting (Green)
  "Accounting": { border: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", text: "#166534" },
  "Acctg": { border: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", text: "#166534" },

  // Admin/HR (Dark Gray)
  "Admin": { border: "#64748b", bg: "rgba(100, 116, 139, 0.1)", text: "#334155" },
  "Human Resources": { border: "#64748b", bg: "rgba(100, 116, 139, 0.1)", text: "#334155" },

  // Support Services (Teal/Cyan)
  "Support Services": { border: "#14b8a6", bg: "rgba(20, 184, 166, 0.1)", text: "#0f766e" },
  "SS": { border: "#14b8a6", bg: "rgba(20, 184, 166, 0.1)", text: "#0f766e" },
  "supportservices": { border: "#14b8a6", bg: "rgba(20, 184, 166, 0.1)", text: "#0f766e" },
  "Front Desk": { border: "#14b8a6", bg: "rgba(20, 184, 166, 0.1)", text: "#0f766e" },

  // Locations/Offices (Orange)
  "Buckhead": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "BH": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "Intown": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "IN": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "Intown office coordinator": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "Cobb": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "Skyrise": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },
  "mountain realty": { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", text: "#c2410c" },

  // Project/Property Management (Purple)
  "Project Management": { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", text: "#6d28d9" },
  "PM": { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", text: "#6d28d9" },
  "Property Management": { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", text: "#6d28d9" },
  "Property Managementt": { border: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", text: "#6d28d9" },
};

function getDepartmentColors(department: string | null) {
  return DEPARTMENT_COLORS[department || ""] || { border: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)", text: "#475569" };
}

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAYS_OF_WEEK_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days: Date[] = [];

  // Add previous month's trailing days
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  // Add next month's leading days to complete the grid
  const remainingDays = 42 - days.length; // 6 weeks x 7 days
  for (let day = 1; day <= remainingDays; day++) {
    days.push(new Date(year, month + 1, day));
  }

  return days;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function CalendarView() {
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [ptoRequests, setPtoRequests] = useState<PtoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [calendarTokenError, setCalendarTokenError] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Fetch holidays and PTO requests from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all holidays
        const holidaysData = await fetchHolidays();
        const mappedHolidays: Holiday[] = holidaysData.map(h => ({
          id: h.id,
          date: h.holidayDate.split('T')[0],
          name: h.name
        }));

        // Fetch all PTO requests with user info
        const ptoData = await fetchAllPtoRequests();
        const mappedPto: PtoRequest[] = ptoData.map(p => ({
          id: p.id,
          userId: p.userId,
          userName: p.userName,
          department: p.department,
          dateOfLeave: p.dateOfLeave.split('T')[0],
          endDate: p.endDate ? p.endDate.split('T')[0] : null,
          hours: p.hours,
          status: p.status,
          reason: p.reason
        }));

        setHolidays(mappedHolidays);
        setPtoRequests(mappedPto);
      } catch (error: any) {
        console.error("Failed to fetch calendar data:", error);
        setError(error?.message || "Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Helper to get base URL - ensures it's always absolute
  const getBaseUrl = (): string => {
    // Check if API_BASE_URL is set and valid
    if (API_BASE_URL && (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://'))) {
      return API_BASE_URL;
    }
    // Fallback to current origin if API_BASE_URL is not set or invalid
    return window.location.origin;
  };

  // Fetch calendar token when subscribe modal opens
  useEffect(() => {
    if (showSubscribeModal && !calendarToken && !isLoadingToken) {
      setIsLoadingToken(true);
      setCalendarTokenError(null);
      fetchCalendarToken()
        .then((token) => {
          setCalendarToken(token);
          setIsLoadingToken(false);
        })
        .catch((err) => {
          console.error('Failed to fetch calendar token:', err);
          setCalendarTokenError(err?.message || 'Failed to load calendar link. Please try again.');
          setIsLoadingToken(false);
        });
    }
  }, [showSubscribeModal, calendarToken, isLoadingToken]);

  // Calendar feed URL - ensure it's always absolute
  const calendarFeedUrl = calendarToken 
    ? `${getBaseUrl()}/api/calendar/feed/${calendarToken}/team.ics` 
    : null;

  // Validate URL is absolute before using
  if (calendarFeedUrl && !calendarFeedUrl.startsWith('http://') && !calendarFeedUrl.startsWith('https://')) {
    console.error('Invalid calendar URL (not absolute):', calendarFeedUrl);
  }

  // Copy URL and open Outlook calendar page for subscription
  const handleSubscribe = async (url: string, type: string) => {
    // Validate URL is absolute
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setCalendarTokenError(`Invalid calendar URL. Expected absolute URL but got: ${url}`);
      console.error('Invalid calendar URL (not absolute):', url);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      console.log('Copied calendar URL:', url); // Debug log
      setCopied(type);
      setTimeout(() => setCopied(null), 4000);
      // Open Outlook calendar "add calendar" page
      window.open('https://outlook.office.com/calendar/addcalendar', '_blank');
    } catch (err) {
      console.error('Failed to copy:', err);
      setCalendarTokenError('Failed to copy URL to clipboard. Please try again.');
    }
  };

  const copyToClipboard = async (url: string, type: string) => {
    // Validate URL is absolute
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setCalendarTokenError(`Invalid calendar URL. Expected absolute URL but got: ${url}`);
      console.error('Invalid calendar URL (not absolute):', url);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      console.log('Copied calendar URL:', url); // Debug log
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCalendarTokenError('Failed to copy URL to clipboard. Please try again.');
    }
  };

  // Retry fetching calendar token
  const retryFetchToken = () => {
    setCalendarToken(null);
    setCalendarTokenError(null);
    setIsLoadingToken(false);
    // Trigger useEffect by toggling modal state
    setShowSubscribeModal(false);
    setTimeout(() => setShowSubscribeModal(true), 100);
  };

  const days = getDaysInMonth(currentYear, currentMonth);

  const calendarDays: CalendarDay[] = days.map(date => {
    const dateStr = formatDate(date);
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isToday = formatDate(date) === formatDate(today);

    const dayHolidays = holidays.filter(h => h.date === dateStr);
    const dayPto = ptoRequests.filter(pto => {
      const start = pto.dateOfLeave;
      const end = pto.endDate || pto.dateOfLeave;
      return dateStr >= start && dateStr <= end;
    });

    return {
      date,
      dateStr,
      isCurrentMonth,
      isToday,
      holidays: dayHolidays,
      ptoRequests: dayPto
    };
  });

  // Legend items matching the image
  const legendItems = [
    { label: "Company Holiday", color: "#94a3b8", outline: true },
    { label: "IT", color: "#3b82f6" },
    { label: "Marketing", color: "#ef4444" },
    { label: "Accounting", color: "#22c55e" },
    { label: "Admin/HR", color: "#64748b" },
    { label: "Support", color: "#14b8a6" },
    { label: "Offices", color: "#f97316" },
  ];

  // Get selected day data for mobile detail panel
  const selectedDayData = calendarDays.find(day => day.dateStr === selectedDate);
  const selectedDateObj = selectedDayData ? selectedDayData.date : new Date(selectedDate);
  const peopleAway = selectedDayData?.ptoRequests.filter(pto => pto.hours > 0) || [];

  // Helper to get user initials
  const getUserInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="page-container calendar-page">
      {/* Header */}
      <div className="calendar-page__header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Time Off Calendar
        </h1>
        <p className="calendar-page__subtitle" style={{ color: '#666666', fontSize: '15px' }}>
          View company holidays and team time off schedules.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderLeft: '4px solid #ef4444',
          borderRadius: '0 8px 8px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px' }}>error</span>
            <span style={{ fontWeight: 600, color: '#991b1b' }}>Error loading calendar data:</span>
            <span style={{ color: '#b91c1c' }}>{error}</span>
          </div>
        </div>
      )}

      {/* Calendar Card */}
      <div className="calendar-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Calendar Header with Navigation */}
        <div className="calendar-card__nav" style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handlePrevMonth}
              className="calendar-nav-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C29B40',
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h2 className="calendar-card__title" style={{
              fontSize: '24px',
              fontFamily: "'Playfair Display', serif",
              color: '#002349',
              fontWeight: 400,
              minWidth: '200px',
              textAlign: 'center',
            }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>

            <button
              onClick={handleNextMonth}
              className="calendar-nav-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C29B40',
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="calendar-card__actions" style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleToday}
              style={{
                backgroundColor: 'white',
                color: '#002349',
                padding: '10px 20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              onClick={() => setShowSubscribeModal(true)}
              style={{
                backgroundColor: '#002349',
                color: 'white',
                padding: '10px 20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Subscribe
            </button>
          </div>
        </div>

        {/* Legend - Hidden on mobile */}
        <div className="calendar-legend" style={{
          padding: '16px 32px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          {legendItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: item.outline ? 'transparent' : item.color,
                border: item.outline ? `2px solid ${item.color}` : 'none',
              }} />
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {item.label}
              </span>
              {idx === 0 && (
                <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', marginLeft: '12px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Loading Display */}
        {loading && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', opacity: 0.5 }}>hourglass_empty</span>
            <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px' }}>Loading calendar data...</div>
          </div>
        )}

        {!loading && (
          <table className="calendar-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            {/* Day Headers - Desktop */}
            <thead className="calendar-table__head--desktop">
              <tr>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <th
                    key={day}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      borderRight: idx < 6 ? '1px solid #e2e8f0' : 'none',
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: `${100/7}%`,
                    }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Day Headers - Mobile */}
            <thead className="calendar-table__head--mobile">
              <tr>
                {DAYS_OF_WEEK_SHORT.map((day, idx) => (
                  <th
                    key={`mobile-${idx}`}
                    style={{
                      padding: '12px 4px',
                      textAlign: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#94a3b8',
                      width: `${100/7}%`,
                    }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Calendar Days Grid */}
            <tbody>
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIdx) => (
                <tr key={weekIdx}>
                  {calendarDays.slice(weekIdx * 7, (weekIdx + 1) * 7).map((day, dayIdx) => {
                    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                    const isSelected = day.dateStr === selectedDate;
                    const hasEvents = day.holidays.length > 0 || day.ptoRequests.filter(p => p.hours > 0).length > 0;

                    return (
                      <td
                        key={day.dateStr}
                        onClick={() => setSelectedDate(day.dateStr)}
                        className={`calendar-cell ${isSelected ? 'calendar-cell--selected' : ''}`}
                        style={{
                          minHeight: '120px',
                          height: '120px',
                          padding: '12px',
                          verticalAlign: 'top',
                          borderRight: dayIdx < 6 ? '1px solid #e2e8f0' : 'none',
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#002349' : (day.isCurrentMonth ? (isWeekend ? '#fafafa' : 'white') : '#f8fafc'),
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Day number */}
                        <div className="calendar-cell__day" style={{
                          fontSize: '14px',
                          fontWeight: day.isToday || isSelected ? 700 : 400,
                          color: isSelected ? 'white' : (day.isCurrentMonth ? (day.isToday ? '#002349' : '#334155') : '#94a3b8'),
                          marginBottom: '8px',
                        }}>
                          {day.date.getDate()}
                        </div>

                        {/* Events - Desktop (full bars) */}
                        <div className="calendar-cell__events--desktop" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* Holidays */}
                          {day.holidays.map(holiday => (
                            <div
                              key={holiday.id}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: isSelected ? 'white' : '#002349',
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0, 35, 73, 0.08)',
                                borderLeft: `3px solid ${isSelected ? 'white' : '#002349'}`,
                                borderRadius: '0 4px 4px 0',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={holiday.name}
                            >
                              {holiday.name}
                            </div>
                          ))}

                          {/* PTO Requests */}
                          {day.ptoRequests.filter(pto => pto.hours > 0).map(pto => {
                            const colors = getDepartmentColors(pto.department);

                            return (
                              <div
                                key={pto.id}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  color: isSelected ? 'white' : colors.text,
                                  backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : colors.bg,
                                  borderLeft: `3px solid ${isSelected ? 'rgba(255,255,255,0.6)' : colors.border}`,
                                  borderRadius: '0 4px 4px 0',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={`${pto.userName} (${pto.department || 'Unknown'}) - ${pto.hours} hours`}
                              >
                                {pto.userName} ({pto.hours})
                              </div>
                            );
                          })}
                        </div>

                        {/* Events - Mobile (dots only) */}
                        {hasEvents && (
                          <div className="calendar-cell__events--mobile" style={{ display: 'none', justifyContent: 'center', gap: '3px', marginTop: '4px' }}>
                            {day.holidays.length > 0 && (
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? 'white' : '#C29B40' }} />
                            )}
                            {day.ptoRequests.filter(p => p.hours > 0).slice(0, 3).map((_, i) => (
                              <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : '#C29B40' }} />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Selected Date Detail Panel */}
      <div className="calendar-detail-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, color: '#002349' }}>
            {selectedDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h3>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {peopleAway.length} {peopleAway.length === 1 ? 'person' : 'people'} away
          </span>
        </div>

        {selectedDayData?.holidays.map(holiday => (
          <div key={holiday.id} style={{
            backgroundColor: '#f8fafc',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#002349', fontSize: '20px' }}>celebration</span>
            <div>
              <p style={{ fontWeight: 600, color: '#002349' }}>{holiday.name}</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Company Holiday</p>
            </div>
          </div>
        ))}

        {peopleAway.length === 0 && selectedDayData?.holidays.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
            No time off scheduled for this date
          </div>
        )}

        {peopleAway.map(pto => {
          const colors = getDepartmentColors(pto.department);
          return (
            <div key={pto.id} style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#64748b',
                }}>
                  {getUserInitials(pto.userName)}
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1f2937' }}>{pto.userName}</p>
                  <p style={{ fontSize: '12px', color: '#C29B40', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    PTO ({pto.hours >= 8 ? 'All Day' : `${pto.hours}h`})
                  </p>
                </div>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                color: colors.text,
              }}>
                {pto.department?.substring(0, 2).toUpperCase() || '??'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSubscribeModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '560px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349', margin: 0 }}>
                Subscribe to Calendar
              </h2>
              <button
                onClick={() => setShowSubscribeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#64748b',
                }}
              >
                <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Loading state */}
            {isLoadingToken && !calendarToken && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '14px' }}>
                Loading calendar link...
              </div>
            )}

            {/* Error state */}
            {calendarTokenError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px', flexShrink: 0 }}>
                    error
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: '#991b1b', marginBottom: '8px', fontSize: '14px' }}>
                      Failed to Load Calendar Link
                    </p>
                    <p style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '12px' }}>
                      {calendarTokenError}
                    </p>
                    <button
                      onClick={retryFetchToken}
                      style={{
                        backgroundColor: '#002349',
                        color: 'white',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Subscribe Section */}
            {calendarFeedUrl && !calendarTokenError && (
              <>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  Subscribe to see all company holidays and approved team time off in Outlook or any calendar app.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <button
                    onClick={() => handleSubscribe(calendarFeedUrl, 'subscribe')}
                    style={{
                      flex: 1,
                      backgroundColor: copied === 'subscribe' ? '#22c55e' : '#002349',
                      color: 'white',
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {copied === 'subscribe' ? (
                      <>
                        <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        URL Copied — Paste in Outlook
                      </>
                    ) : (
                      <>
                        <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Add to Outlook
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(calendarFeedUrl, 'copy')}
                    style={{
                      backgroundColor: copied === 'copy' ? '#22c55e' : '#f1f5f9',
                      color: copied === 'copy' ? 'white' : '#002349',
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copied === 'copy' ? (
                      <>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy URL
                      </>
                    )}
                  </button>
                </div>

                {/* URL Display for Debugging */}
                {import.meta.env.DEV && (
                  <div style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#475569',
                    wordBreak: 'break-all',
                  }}>
                    <strong style={{ color: '#002349' }}>Calendar URL:</strong> {calendarFeedUrl}
                  </div>
                )}

                {/* Instructions */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#002349', marginBottom: '12px' }}>
                    How to Subscribe
                  </h4>
                  <ol style={{ fontSize: '13px', color: '#64748b', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li>Click "Add to Outlook" — this copies the URL and opens Outlook</li>
                    <li>In Outlook, click "Subscribe from web" on the left panel</li>
                    <li>Paste the URL (Ctrl+V) and click Import</li>
                    <li>The calendar will automatically update with new events</li>
                  </ol>
                </div>
              </>
            )}

            {/* Show message if no URL and no error (shouldn't happen, but good fallback) */}
            {!calendarFeedUrl && !isLoadingToken && !calendarTokenError && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '14px' }}>
                Unable to generate calendar link. Please try again.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
