import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { Link } from "react-router-dom";
import {
  fetchActiveNotifications,
  fetchHolidays,
  fetchEarlyClosures,
  fetchUserPtoSummary,
  type NotificationDto,
  type HolidayDto,
  type EarlyClosureDto,
  type UserPtoSummary,
} from "../api";

const Dashboard = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [closures, setClosures] = useState<EarlyClosureDto[]>([]);
  const [ptoSummary, setPtoSummary] = useState<UserPtoSummary | null>(null);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [loadingPto, setLoadingPto] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadNotifications();
    loadHolidaysAndClosures();
    loadPtoSummary();
  }, [user?.id]);

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
        {/* This Week's Hours */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>This Week's Hours</h3>
              <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '28px', opacity: 0.5 }}>schedule</span>
            </div>
            <div style={{ borderLeft: '3px solid #002349', paddingLeft: '20px', paddingTop: '12px', paddingBottom: '12px' }}>
              <p style={{ fontSize: '14px', color: '#666666', lineHeight: 1.7, fontStyle: 'italic' }}>
                Total hours worked and remaining hours will appear here once the backend integration is complete.
              </p>
            </div>
          </div>
          <div style={{ padding: '16px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#999999', fontWeight: 700 }}>Status</span>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#C29B40', fontWeight: 700 }}>Pending Connection</span>
          </div>
        </div>

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
