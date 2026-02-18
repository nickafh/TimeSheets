import { useState, useRef, useEffect, useCallback } from "react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (dateStr: string) => void;
  holidays?: Map<string, string>; // date -> holiday name
  min?: string; // "YYYY-MM-DD"
  placeholder?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

const DatePicker = ({ value, onChange, holidays, min, placeholder = "mm/dd/yyyy" }: DatePickerProps) => {
  const today = new Date();
  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  // Parse initial view month from value or today
  const initDate = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync view month when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTooltip(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleSelect = (dayStr: string) => {
    onChange(dayStr);
    setOpen(false);
    setTooltip(null);
  };

  const handleHolidayHover = (e: React.MouseEvent, name: string) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setTooltip({
        text: name,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 4,
      });
    }
  };

  const handleHolidayLeave = () => {
    tooltipTimeout.current = setTimeout(() => setTooltip(null), 100);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
  }

  // Next month leading days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // Only show 5 rows if the 6th row is entirely next month
  const totalRows = cells.length > 35 && cells[35].isCurrentMonth ? 6 : Math.ceil((firstDay + daysInMonth) / 7);
  const visibleCells = cells.slice(0, totalRows * 7);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Text input */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: "16px",
          color: value ? "#002349" : "#94a3b8",
          border: open ? "2px solid #C29B40" : "2px solid #e2e8f0",
          borderRadius: "6px",
          outline: "none",
          backgroundColor: "white",
          fontFamily: "'Montserrat', sans-serif",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "border-color 0.15s ease",
          minHeight: "48px",
        }}
      >
        <span>{value ? formatForDisplay(value) : placeholder}</span>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "20px", color: "#64748b" }}
        >
          calendar_today
        </span>
      </div>

      {/* Calendar dropdown */}
      {open && (
        <div
          className="datepicker-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 40px -8px rgba(0, 35, 73, 0.18)",
            overflow: "hidden",
          }}
        >
          {/* Header: prev/next + month/year */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              onClick={prevMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                color: "#002349",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "16px",
                fontWeight: 700,
                color: "#002349",
              }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                color: "#002349",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "8px 12px 4px" }}>
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: d === "Sun" || d === "Sat" ? "#cbd5e1" : "#94a3b8",
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "4px 12px 12px", gap: "2px" }}>
            {visibleCells.map((cell, i) => {
              const dayStr = toYMD(cell.year, cell.month, cell.day);
              const weekend = isWeekend(cell.year, cell.month, cell.day);
              const holidayName = holidays?.get(dayStr);
              const isHoliday = !!holidayName;
              const isBlocked = weekend || isHoliday;
              const isSelected = value && isSameDay(dayStr, value);
              const isToday = isSameDay(dayStr, todayStr);
              const isBelowMin = min ? dayStr < min : false;
              const isDisabled = isBlocked || isBelowMin;

              let bg = "transparent";
              let color = cell.isCurrentMonth ? "#002349" : "#cbd5e1";
              let cursor: React.CSSProperties["cursor"] = "pointer";
              let fontWeight = 400;
              let border = "2px solid transparent";
              let position: React.CSSProperties["position"] = "relative";

              if (!cell.isCurrentMonth) {
                cursor = "default";
              } else if (isSelected) {
                bg = "#002349";
                color = "white";
                fontWeight = 700;
              } else if (weekend) {
                bg = "#f8fafc";
                color = "#cbd5e1";
                cursor = "not-allowed";
              } else if (isHoliday) {
                bg = "rgba(194, 155, 64, 0.1)";
                color = "#a8832e";
                cursor = "not-allowed";
                fontWeight = 600;
              } else if (isBelowMin) {
                color = "#cbd5e1";
                cursor = "not-allowed";
              }

              if (isToday && !isSelected) {
                border = "2px solid #C29B40";
              }

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!cell.isCurrentMonth || isDisabled) return;
                    handleSelect(dayStr);
                  }}
                  onMouseEnter={isHoliday && cell.isCurrentMonth ? (e) => handleHolidayHover(e, holidayName!) : undefined}
                  onMouseLeave={isHoliday && cell.isCurrentMonth ? handleHolidayLeave : undefined}
                  className={
                    !isDisabled && cell.isCurrentMonth && !isSelected ? "datepicker-day-hover" : undefined
                  }
                  style={{
                    textAlign: "center",
                    padding: "8px 2px",
                    fontSize: "14px",
                    fontWeight,
                    color,
                    background: bg,
                    borderRadius: "6px",
                    cursor,
                    border,
                    position,
                    transition: "background 0.1s ease",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {cell.day}
                  {/* Holiday dot indicator */}
                  {isHoliday && cell.isCurrentMonth && (
                    <div
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "#C29B40",
                        margin: "2px auto 0",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              padding: "8px 16px 12px",
              borderTop: "1px solid #f1f5f9",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e2e8f0", display: "inline-block" }} />
              Weekend
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#C29B40", display: "inline-block" }} />
              Holiday
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "2px", border: "2px solid #C29B40", display: "inline-block" }} />
              Today
            </span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "#002349",
            color: "white",
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 60,
            pointerEvents: "none",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {tooltip.text}
          <div
            style={{
              position: "absolute",
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #002349",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;
