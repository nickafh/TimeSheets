import { useEffect, useState } from "react";
import {
  fetchWeeklySummary,
  fetchTeamTimeEntries,
  fetchMyTeamUsers,
  getSystemSettings,
  type WeeklySummaryDto,
  type TeamTimeEntryDto,
  type UserDto,
} from "../api";
import { getWeekStart } from "../utils/dateUtils";
import { useToast } from "../components/Toast";
import { LoadingSpinner } from "../components/LoadingSpinner";

type ViewType = "summary" | "detailed";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function TeamTimeEntries() {
  const { showToast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("summary");
  const [weekStartDay, setWeekStartDay] = useState<number>(1); // default Monday
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date(), 1));
  const [summary, setSummary] = useState<WeeklySummaryDto[]>([]);
  const [detailedEntries, setDetailedEntries] = useState<TeamTimeEntryDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  // Fetch system settings for work week start day
  useEffect(() => {
    getSystemSettings()
      .then((settings) => {
        setWeekStartDay(settings.workWeekStartDay);
        setWeekStart(getWeekStart(new Date(), settings.workWeekStartDay));
      })
      .catch(() => {}); // fallback to default Monday
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadData();
  }, [weekStart, viewType]);

  const loadUsers = async () => {
    try {
      const data = await fetchMyTeamUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
      showToast("Failed to load team members.", "error");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (viewType === "summary") {
        const data = await fetchWeeklySummary(formatDate(weekStart));
        setSummary(data);
      } else {
        const data = await fetchTeamTimeEntries(formatDate(weekStart), formatDate(weekEnd));
        setDetailedEntries(data);
      }
    } catch (error) {
      console.error("Failed to load time entries:", error);
      showToast("Failed to load time entries.", "error");
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + (direction === "prev" ? -7 : 7));
    setWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date(), weekStartDay));
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const filteredEntries = selectedUser === "all"
    ? detailedEntries
    : detailedEntries.filter(e => e.userId === selectedUser);

  // Group detailed entries by user
  const entriesByUser = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.userId]) {
      acc[entry.userId] = {
        userName: entry.userName,
        department: entry.department,
        entries: [],
      };
    }
    acc[entry.userId].entries.push(entry);
    return acc;
  }, {} as Record<number, { userName: string; department: string | null; entries: TeamTimeEntryDto[] }>);

  // Calculate totals for summary
  const totalWorkedHours = summary.reduce((sum, s) => sum + s.totalWorkedHours, 0);
  const totalPtoHours = summary.reduce((sum, s) => sum + s.totalPtoHours, 0);

  const navButtonStyle = {
    backgroundColor: 'white',
    color: '#002349',
    padding: '10px 20px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    minHeight: '44px',
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Team Time Entries
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          View and manage your team's time entries.
        </p>
      </div>

      {/* Controls */}
      <div className="controls-bar" style={{ marginBottom: '24px' }}>
        {/* Week Navigation */}
        <div className="controls-bar__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigateWeek("prev")} style={navButtonStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>chevron_left</span>
              Prev
            </button>
            <button onClick={goToCurrentWeek} style={navButtonStyle}>
              Today
            </button>
            <button onClick={() => navigateWeek("next")} style={navButtonStyle}>
              Next
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginLeft: '4px' }}>chevron_right</span>
            </button>
          </div>
          <span style={{
            marginLeft: '16px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#002349',
          }}>
            {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {/* View Toggle & Filter */}
        <div className="controls-bar__right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {viewType === "detailed" && (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value === "all" ? "all" : Number(e.target.value))}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#002349',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: '44px',
                }}
              >
                <option value="all">All Employees</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '2px solid #002349' }}>
              <button
                onClick={() => setViewType("summary")}
                style={{
                  padding: '10px 20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewType === "summary" ? '#002349' : 'white',
                  color: viewType === "summary" ? 'white' : '#002349',
                  minHeight: '44px',
                }}
              >
                Summary
              </button>
              <button
                onClick={() => setViewType("detailed")}
                style={{
                  padding: '10px 20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  border: 'none',
                  borderLeft: '2px solid #002349',
                  cursor: 'pointer',
                  backgroundColor: viewType === "detailed" ? '#002349' : 'white',
                  color: viewType === "detailed" ? 'white' : '#002349',
                  minHeight: '44px',
                }}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <LoadingSpinner fullPage message="Loading team entries..." />
      ) : viewType === "summary" ? (
        <>
          {/* Summary Stats */}
          <div className="stats-grid-4">
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 35, 73, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#002349' }}>group</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                Employees
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#002349' }}>{summary.length}</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669' }}>work</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                Total Worked
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{totalWorkedHours.toFixed(1)}h</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(194, 155, 64, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#C29B40' }}>beach_access</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                Total PTO
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#C29B40' }}>{totalPtoHours.toFixed(1)}h</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#3b82f6' }}>schedule</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                Combined
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{(totalWorkedHours + totalPtoHours).toFixed(1)}h</div>
            </div>
          </div>

          {/* Summary Table */}
          {summary.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No time entries for this week.
              </p>
            </div>
          ) : (
            <>
              <div className="team-summary-table" style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#002349' }}>
                      <th style={{
                        padding: '14px 24px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#C29B40',
                      }}>
                        Employee
                      </th>
                      <th style={{
                        padding: '14px 24px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#C29B40',
                      }}>
                        Department
                      </th>
                      <th style={{
                        padding: '14px 24px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#C29B40',
                      }}>
                        Days Worked
                      </th>
                      <th style={{
                        padding: '14px 24px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#C29B40',
                      }}>
                        Worked Hours
                      </th>
                      <th style={{
                        padding: '14px 24px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#C29B40',
                      }}>
                        PTO Hours
                      </th>
                      <th style={{
                        padding: '14px 24px',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#C29B40',
                      }}>
                        Total Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, index) => (
                      <tr key={row.userId} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                          {row.userName}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                          {row.department || "N/A"}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                          {row.daysWorked}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#059669' }}>
                          {row.totalWorkedHours.toFixed(1)}h
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#C29B40' }}>
                          {row.totalPtoHours.toFixed(1)}h
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                          {row.totalHours.toFixed(1)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="team-summary-cards">
                {summary.map((row) => (
                  <div key={row.userId} className="team-summary-card">
                    <div className="team-summary-card__header">
                      <div>
                        <div className="team-summary-card__name">{row.userName}</div>
                        <div className="team-summary-card__dept">{row.department || "N/A"}</div>
                      </div>
                      <div className="team-summary-card__total">{row.totalHours.toFixed(1)}h</div>
                    </div>
                    <div className="team-summary-card__body">
                      <div className="team-summary-card__row">
                        <span className="team-summary-card__label">Days Worked</span>
                        <span className="team-summary-card__value">{row.daysWorked}</span>
                      </div>
                      <div className="team-summary-card__row">
                        <span className="team-summary-card__label">Worked Hours</span>
                        <span className="team-summary-card__value" style={{ color: '#059669' }}>{row.totalWorkedHours.toFixed(1)}h</span>
                      </div>
                      <div className="team-summary-card__row">
                        <span className="team-summary-card__label">PTO Hours</span>
                        <span className="team-summary-card__value" style={{ color: '#C29B40' }}>{row.totalPtoHours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Detailed View */}
          {Object.keys(entriesByUser).length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No time entries for this week.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(entriesByUser).map(([userId, userData]) => {
                const userTotalWorked = userData.entries.reduce((sum, e) => sum + e.workedHours, 0);
                const userTotalPto = userData.entries.reduce((sum, e) => sum + e.ptoHours, 0);

                return (
                  <div key={userId} style={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}>
                    {/* User Header */}
                    <div className="team-detailed-header" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#002349',
                      padding: '16px 24px',
                    }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'white', marginBottom: '4px' }}>
                          {userData.userName}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#C29B40', fontWeight: 600 }}>
                          {userData.department || "No Department"}
                        </p>
                      </div>
                      <div className="team-detailed-header__stats" style={{ display: 'flex', gap: '32px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40', marginBottom: '4px' }}>
                            Worked
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                            {userTotalWorked.toFixed(1)}h
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40', marginBottom: '4px' }}>
                            PTO
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                            {userTotalPto.toFixed(1)}h
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40', marginBottom: '4px' }}>
                            Total
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                            {(userTotalWorked + userTotalPto).toFixed(1)}h
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Grid */}
                    <div className="team-detailed-table">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                        {weekDays.map((day, idx) => {
                          const dayStr = formatDate(day);
                          const entry = userData.entries.find(e => e.workDate.split("T")[0] === dayStr);
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                          return (
                            <div
                              key={dayStr}
                              style={{
                                padding: '12px',
                                borderRight: idx < 6 ? '1px solid #e2e8f0' : 'none',
                                backgroundColor: isWeekend ? '#f8fafc' : 'white',
                              }}
                            >
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '2px' }}>
                                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                                  {day.getDate()}
                                </div>
                              </div>
                              {entry ? (
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                                  {entry.workedHours > 0 && (
                                    <div style={{
                                      backgroundColor: '#ecfdf5',
                                      color: '#059669',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                    }}>
                                      {entry.workedHours}h worked
                                    </div>
                                  )}
                                  {entry.ptoHours > 0 && (
                                    <div style={{
                                      backgroundColor: 'rgba(194, 155, 64, 0.1)',
                                      color: '#C29B40',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                    }}>
                                      {entry.ptoHours}h PTO
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#cbd5e1' }}>
                                  —
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="team-detailed-cards">
                      {weekDays.map((day) => {
                        const dayStr = formatDate(day);
                        const entry = userData.entries.find(e => e.workDate.split("T")[0] === dayStr);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        if (!entry && isWeekend) return null;
                        return (
                          <div key={dayStr} className="team-detailed-day">
                            <span className="team-detailed-day__date">
                              {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                            <div className="team-detailed-day__hours">
                              {entry ? (
                                <>
                                  {entry.workedHours > 0 && (
                                    <span className="team-detailed-day__worked">{entry.workedHours}h worked</span>
                                  )}
                                  {entry.ptoHours > 0 && (
                                    <span className="team-detailed-day__pto">{entry.ptoHours}h PTO</span>
                                  )}
                                  {entry.workedHours === 0 && entry.ptoHours === 0 && (
                                    <span className="team-detailed-day__none">No hours</span>
                                  )}
                                </>
                              ) : (
                                <span className="team-detailed-day__none">No entry</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>info</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349', marginBottom: '4px' }}>
            Team Overview
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            Use the <strong style={{ color: '#002349' }}>Summary</strong> view for a quick overview of team hours, or switch to <strong style={{ color: '#002349' }}>Detailed</strong> view to see individual daily entries for each team member.
          </div>
        </div>
      </div>
    </div>
  );
}
