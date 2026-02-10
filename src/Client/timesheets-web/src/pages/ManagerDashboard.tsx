import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { fetchMyTeamUsers, fetchManagerPendingPtoRequests, formatPtoRequestDateDisplay, type UserDto, type PtoRequestWithUserDto } from "../api";
import { Link } from "react-router-dom";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<UserDto[]>([]);
  const [pendingPtoRequests, setPendingPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch manager-scoped team and pending requests
        const activeTeam = await fetchMyTeamUsers();
        setTeamMembers(activeTeam);

        const pending = await fetchManagerPendingPtoRequests();
        setPendingPtoRequests(pending);
      } catch (error) {
        console.error("Failed to fetch manager dashboard data:", error);
        setError("Failed to load manager dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page-container page-container--centered">
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', opacity: 0.5 }}>hourglass_empty</span>
          <div style={{ fontSize: '16px', color: '#666666', marginTop: '12px' }}>Loading manager dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Manager Dashboard
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          Welcome, {user?.name?.split(' ')[0]}. Manage your team and approve requests.
        </p>
        {error && (
          <div style={{ marginTop: '12px', borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontSize: '14px', color: '#b91c1c' }}>
            {error}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="stats-grid-3">
        {/* Active Team Members */}
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
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#002349' }}>groups</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Active Team Members
          </div>
          <div style={{ fontSize: '42px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349' }}>
            {teamMembers.length}
          </div>
        </div>

        {/* Pending PTO Requests */}
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
            backgroundColor: pendingPtoRequests.length > 0 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: pendingPtoRequests.length > 0 ? '#d97706' : '#059669' }}>
              {pendingPtoRequests.length > 0 ? 'pending_actions' : 'task_alt'}
            </span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Pending PTO Requests
          </div>
          <div style={{ fontSize: '42px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: pendingPtoRequests.length > 0 ? '#d97706' : '#059669' }}>
            {pendingPtoRequests.length}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '16px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/manager/team-time-entries"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#002349',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>list_alt</span>
              View Team Time Entries
            </Link>
            <Link
              to="/manager/approve-pto"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#C29B40',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>task_alt</span>
              Approve Team PTO
            </Link>
          </div>
        </div>
      </div>

      {/* Pending PTO Requests Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: pendingPtoRequests.length > 0 ? 'rgba(217, 119, 6, 0.05)' : '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Pending PTO Requests
          </h2>
          <span style={{
            backgroundColor: pendingPtoRequests.length > 0 ? '#d97706' : '#059669',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {pendingPtoRequests.length} Pending
          </span>
        </div>

        {pendingPtoRequests.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#059669', opacity: 0.5 }}>task_alt</span>
            <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px' }}>
              No pending PTO requests at this time.
            </div>
          </div>
        ) : (
          <>
            <div className="mgr-pto-table">
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#002349' }}>
                      <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                        Employee
                      </th>
                      <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                        Department
                      </th>
                      <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                        Date of Leave
                      </th>
                      <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                        Hours
                      </th>
                      <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                        Reason
                      </th>
                      <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPtoRequests.map((request, index) => (
                      <tr key={request.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                          {request.userName}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                          {request.department || "N/A"}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#002349' }}>
                          {formatPtoRequestDateDisplay(request)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#002349' }}>
                          {request.hours}h
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                          {request.reason || "—"}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button style={{
                              backgroundColor: '#059669',
                              color: 'white',
                              padding: '6px 12px',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                              Approve
                            </button>
                            <button style={{
                              backgroundColor: 'white',
                              color: '#dc2626',
                              padding: '6px 12px',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                              Deny
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="mgr-pto-cards">
              {pendingPtoRequests.map((request) => (
                <div key={request.id} className="mgr-pto-card">
                  <div className="mgr-pto-card__header">
                    <div>
                      <div className="mgr-pto-card__name">{request.userName}</div>
                      <div className="mgr-pto-card__dept">{request.department || "N/A"}</div>
                    </div>
                    <span className="mgr-pto-card__hours">{request.hours}h</span>
                  </div>
                  <div className="mgr-pto-card__body">
                    <div className="mgr-pto-card__row">
                      <span className="mgr-pto-card__label">Date</span>
                      <span className="mgr-pto-card__value">{formatPtoRequestDateDisplay(request)}</span>
                    </div>
                    {request.reason && (
                      <div className="mgr-pto-card__row">
                        <span className="mgr-pto-card__label">Reason</span>
                        <span className="mgr-pto-card__value">{request.reason}</span>
                      </div>
                    )}
                  </div>
                  <div className="mgr-pto-card__actions">
                    <button style={{
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                      Approve
                    </button>
                    <button style={{
                      backgroundColor: 'white',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Team Members Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Team Members
          </h2>
          <span style={{
            backgroundColor: '#002349',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {teamMembers.length} Active
          </span>
        </div>

        <div className="mgr-team-table">
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#002349' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Name
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Email
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Department
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Category
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Hire Date
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.slice(0, 10).map((member, index) => (
                  <tr key={member.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                      {member.firstName} {member.lastName}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                      {member.email}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                      {member.department || "N/A"}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                      {member.category || "N/A"}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                      {member.hireDate ? new Date(member.hireDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <Link
                        to={`/manager/team-member/${member.id}`}
                        style={{
                          backgroundColor: 'white',
                          color: '#002349',
                          padding: '6px 12px',
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="mgr-team-cards">
          {teamMembers.slice(0, 10).map((member) => (
            <Link
              key={member.id}
              to={`/manager/team-member/${member.id}`}
              className="mgr-team-card"
              style={{ textDecoration: 'none' }}
            >
              <div className="mgr-team-card__header">
                <div className="mgr-team-card__name">{member.firstName} {member.lastName}</div>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#C29B40' }}>chevron_right</span>
              </div>
              <div className="mgr-team-card__body">
                <div className="mgr-team-card__row">
                  <span className="mgr-team-card__label">Department</span>
                  <span className="mgr-team-card__value">{member.department || "N/A"}</span>
                </div>
                <div className="mgr-team-card__row">
                  <span className="mgr-team-card__label">Category</span>
                  <span className="mgr-team-card__value">{member.category || "N/A"}</span>
                </div>
                <div className="mgr-team-card__row">
                  <span className="mgr-team-card__label">Hire Date</span>
                  <span className="mgr-team-card__value">{member.hireDate ? new Date(member.hireDate).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {teamMembers.length > 10 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Showing 10 of {teamMembers.length} team members
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
