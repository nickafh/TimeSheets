import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchUserById,
  fetchUserPtoRequests,
  fetchDailyTimeEntries,
  fetchManagers,
  formatPtoRequestDateDisplay,
  type UserDto,
  type ManagerOptionDto,
  type PtoRequestWithUserDto,
  type DailyTimeEntryDto,
} from "../api";

export default function TeamMemberDetails() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [user, setUser] = useState<UserDto | null>(null);
  const [managers, setManagers] = useState<ManagerOptionDto[]>([]);
  const [ptoRequests, setPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [timeEntries, setTimeEntries] = useState<DailyTimeEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    fetchManagers().then(setManagers).catch(() => setManagers([]));
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user details
      const userData = await fetchUserById(userId);
      setUser(userData);

      // Fetch PTO requests for this user
      try {
        const ptoData = await fetchUserPtoRequests(userId);
        setPtoRequests(ptoData);
      } catch {
        // PTO requests might fail, continue anyway
        setPtoRequests([]);
      }

      // Fetch recent time entries (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      try {
        const entriesData = await fetchDailyTimeEntries(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        setTimeEntries(entriesData);
      } catch {
        setTimeEntries([]);
      }

    } catch (err: any) {
      setError(err?.message || "Failed to load team member data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    };

    switch (status) {
      case 0:
        return <span style={{ ...baseStyle, backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>Pending</span>;
      case 1:
        return <span style={{ ...baseStyle, backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>Approved</span>;
      case 2:
        return <span style={{ ...baseStyle, backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Denied</span>;
      default:
        return null;
    }
  };

  // Calculate PTO stats
  const yearPtoRequests = ptoRequests.filter(r => {
    const year = new Date(r.dateOfLeave).getFullYear();
    return year === currentYear;
  });
  const approvedPto = yearPtoRequests.filter(r => r.status === 1);
  const pendingPto = yearPtoRequests.filter(r => r.status === 0);
  const totalApprovedHours = approvedPto.reduce((sum, r) => sum + r.hours, 0);
  const totalPendingHours = pendingPto.reduce((sum, r) => sum + r.hours, 0);

  // Calculate time entry stats (last 30 days)
  const totalWorkedHours = timeEntries.reduce((sum, e) => sum + e.workedHours, 0);
  const totalPtoHours = timeEntries.reduce((sum, e) => sum + e.ptoHours, 0);

  if (loading) {
    return (
      <div className="page-container page-container--centered">
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading team member details...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#dc2626' }}>error</span>
          <h2 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349', marginTop: '16px' }}>
            {error || "Team member not found"}
          </h2>
          <Link
            to="/manager/team-time-entries"
            style={{
              display: 'inline-block',
              marginTop: '24px',
              padding: '12px 24px',
              backgroundColor: '#002349',
              color: 'white',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to Team
          </Link>
        </div>
      </div>
    );
  }

  const thStyle = {
    padding: '14px 20px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#C29B40',
  };

  return (
    <div className="page-container">
      {/* Back Link */}
      <Link
        to="/manager/team-time-entries"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#64748b',
          fontSize: '14px',
          textDecoration: 'none',
          marginBottom: '24px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        Back to Team Time Entries
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Avatar */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#002349',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 700,
            color: 'white',
            fontFamily: "'Playfair Display', serif",
          }}>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '4px' }}>
              {user.firstName} {user.lastName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#666666', fontSize: '15px' }}>{user.department || 'No Department'}</span>
              <span style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                backgroundColor: user.isActive === 1 ? '#ecfdf5' : '#fef2f2',
                color: user.isActive === 1 ? '#059669' : '#dc2626',
                border: `1px solid ${user.isActive === 1 ? '#a7f3d0' : '#fecaca'}`,
              }}>
                {user.isActive === 1 ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {/* Approved PTO */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#059669' }}>check_circle</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Approved PTO
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#059669' }}>{totalApprovedHours}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>hours in {currentYear}</div>
        </div>

        {/* Pending PTO */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#d97706' }}>hourglass_empty</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Pending PTO
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#d97706' }}>{totalPendingHours}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>hours awaiting</div>
        </div>

        {/* Hours Worked */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(0, 35, 73, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#002349' }}>schedule</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Hours Worked
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#002349' }}>{totalWorkedHours.toFixed(1)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>last 30 days</div>
        </div>

        {/* PTO Used */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(194, 155, 64, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#C29B40' }}>beach_access</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            PTO Logged
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#C29B40' }}>{totalPtoHours.toFixed(1)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>last 30 days</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Employee Information */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#002349',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              Employee Information
            </h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                  Email
                </div>
                <div style={{ fontSize: '14px', color: '#002349', fontWeight: 500 }}>{user.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                  Department
                </div>
                <div style={{ fontSize: '14px', color: '#002349', fontWeight: 500 }}>{user.department || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                  Category
                </div>
                <div style={{ fontSize: '14px', color: '#002349', fontWeight: 500 }}>{user.category || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                  Manager(s)
                </div>
                <div style={{ fontSize: '14px', color: '#002349', fontWeight: 500 }}>
                  {user.managerIds?.length
                    ? user.managerIds
                        .map((id) => {
                          const m = managers.find((x) => x.id === id);
                          return m ? `${m.firstName} ${m.lastName}` : String(id);
                        })
                        .join(", ")
                    : user.managerName || "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                  Hire Date
                </div>
                <div style={{ fontSize: '14px', color: '#002349', fontWeight: 500 }}>
                  {user.hireDate ? new Date(user.hireDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                  Role
                </div>
                <div style={{ fontSize: '14px', color: '#002349', fontWeight: 500 }}>{user.role}</div>
              </div>
            </div>

            {/* Employee Type Badges */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '12px' }}>
                Employee Type
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {user.isWfh === 1 && (
                  <span style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: '#dbeafe', color: '#1e40af' }}>
                    Work From Home
                  </span>
                )}
                {user.isPartTime === 1 && (
                  <span style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: '#fef3c7', color: '#92400e' }}>
                    Part-Time
                  </span>
                )}
                {user.isIntern === 1 && (
                  <span style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                    Intern
                  </span>
                )}
                {user.isWfh === 0 && user.isPartTime === 0 && user.isIntern === 0 && (
                  <span style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#64748b' }}>
                    Full-Time On-Site
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Time Entries */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#C29B40',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              Recent Time Entries
            </h2>
          </div>
          {timeEntries.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
              <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No time entries in the last 30 days
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ ...thStyle, color: '#002349' }}>Date</th>
                    <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Worked</th>
                    <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>PTO</th>
                    <th style={{ ...thStyle, color: '#002349' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.slice(0, 10).map((entry, index) => (
                    <tr key={entry.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: '#002349' }}>
                        {new Date(entry.workDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: '#002349', textAlign: 'center', fontWeight: 600 }}>
                        {entry.workedHours > 0 ? `${entry.workedHours}h` : '—'}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: '#C29B40', textAlign: 'center', fontWeight: 600 }}>
                        {entry.ptoHours > 0 ? `${entry.ptoHours}h` : '—'}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>
                        {entry.dayType || 'Regular'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PTO Request History */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#002349',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
            PTO Request History ({currentYear})
          </h2>
          <span style={{ fontSize: '12px', color: '#C29B40', fontWeight: 600 }}>
            {yearPtoRequests.length} requests
          </span>
        </div>
        {yearPtoRequests.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
            <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
              No PTO requests for {currentYear}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ ...thStyle, color: '#002349' }}>Date of Leave</th>
                <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Hours</th>
                <th style={{ ...thStyle, color: '#002349' }}>Reason</th>
                <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Status</th>
                <th style={{ ...thStyle, color: '#002349' }}>Requested</th>
              </tr>
            </thead>
            <tbody>
              {yearPtoRequests.map((request, index) => (
                <tr key={request.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                    {formatPtoRequestDateDisplay(request)}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#002349', textAlign: 'center', fontWeight: 600 }}>
                    {request.hours}h
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {request.reason || '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    {getStatusBadge(request.status)}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#64748b' }}>
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
            Team Member Overview
          </div>
          <div style={{ fontSize: '13px', color: '#666666', lineHeight: 1.6 }}>
            This page shows a summary of the team member's time entries and PTO requests.
            Use this information to review their attendance and approve or manage their time off requests.
          </div>
        </div>
      </div>
    </div>
  );
}
