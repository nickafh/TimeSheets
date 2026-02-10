import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { fetchUsers, fetchPendingPtoRequests, fetchPtoHistory, fetchHolidays, approvePtoRequest, denyPtoRequest, formatPtoRequestDateDisplay, type UserDto, type PtoRequestWithUserDto, type HolidayDto } from "../api";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserDto[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<UserDto[]>([]);
  const [allPtoRequests, setAllPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [pendingPtoRequests, setPendingPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all users (including inactive)
        const users = await fetchUsers(true);
        setAllUsers(users);
        setActiveUsers(users.filter(u => u.isActive === 1));
        setInactiveUsers(users.filter(u => u.isActive === 0));

        // Fetch all PTO requests (history includes all statuses)
        const allPto = await fetchPtoHistory();
        setAllPtoRequests(allPto);

        // Fetch pending PTO requests specifically
        const pendingPto = await fetchPendingPtoRequests();
        setPendingPtoRequests(pendingPto);

        // Fetch holidays
        const holidayData = await fetchHolidays();
        setHolidays(holidayData);
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApprove = async (requestId: number) => {
    if (!user) return;
    try {
      await approvePtoRequest(requestId, user.id);
      // Refresh pending requests
      const pendingPto = await fetchPendingPtoRequests();
      setPendingPtoRequests(pendingPto);
      const allPto = await fetchPtoHistory();
      setAllPtoRequests(allPto);
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert("Failed to approve request. Please try again.");
    }
  };

  const handleDeny = async (requestId: number) => {
    if (!user) return;
    const reason = prompt("Enter reason for denial (optional):");
    try {
      await denyPtoRequest(requestId, user.id, reason || undefined);
      // Refresh pending requests
      const pendingPto = await fetchPendingPtoRequests();
      setPendingPtoRequests(pendingPto);
      const allPto = await fetchPtoHistory();
      setAllPtoRequests(allPto);
    } catch (error) {
      console.error("Failed to deny request:", error);
      alert("Failed to deny request. Please try again.");
    }
  };

  const getStatusStyle = (status: number) => {
    switch (status) {
      case 0:
        return { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
      case 1:
        return { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
      case 2:
        return { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      default:
        return { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return "Pending";
      case 1: return "Approved";
      case 2: return "Denied";
      default: return "Unknown";
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#002349', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        <span style={{ marginLeft: '12px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          Welcome, {user?.name} — System-wide administration and oversight.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
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
            Total Users
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#002349' }}>{allUsers.length}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {activeUsers.length} active, {inactiveUsers.length} inactive
          </div>
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
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#d97706' }}>hourglass_empty</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Pending PTO
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706' }}>{pendingPtoRequests.length}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {allPtoRequests.length} total requests
          </div>
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669' }}>person_check</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Active Users
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{activeUsers.length}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Currently employed
          </div>
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#C29B40' }}>celebration</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Company Holidays
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#C29B40' }}>{holidays.length}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            This year
          </div>
        </div>
      </div>

      {/* Admin Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '16px' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <Link
            to="/admin/manage-users"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 35, 73, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#002349' }}>manage_accounts</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#002349' }}>
              Manage Users
            </span>
          </Link>

          <Link
            to="/admin/manage-holidays"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(194, 155, 64, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#C29B40' }}>calendar_month</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#002349' }}>
              Manage Holidays
            </span>
          </Link>

          <Link
            to="/admin/reports"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669' }}>assessment</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#002349' }}>
              System Reports
            </span>
          </Link>

          <Link
            to="/admin/time-entries"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#3b82f6' }}>schedule</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#002349' }}>
              All Time Entries
            </span>
          </Link>

          <Link
            to="/admin/settings"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px 16px',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(100, 116, 139, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#64748b' }}>settings</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#002349' }}>
              System Settings
            </span>
          </Link>
        </div>
      </div>

      {/* Pending PTO Requests */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Pending PTO Requests
          </h2>
          <span style={{
            backgroundColor: '#C29B40',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {pendingPtoRequests.length} Pending
          </span>
        </div>

        {pendingPtoRequests.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#a7f3d0' }}>check_circle</span>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
              No pending PTO requests at this time.
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#002349' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Employee
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Department
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Date of Leave
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Hours
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Reason
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Requested
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingPtoRequests.slice(0, 10).map((request, index) => (
                  <tr key={request.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                      {request.userName}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                      {request.department || "N/A"}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', color: '#002349', fontWeight: 500 }}>
                      {formatPtoRequestDateDisplay(request)}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                      {request.hours}h
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {request.reason || "—"}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{
                        ...getStatusStyle(request.status),
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(request.id)}
                          style={{
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
                        <button
                          onClick={() => handleDeny(request.id)}
                          style={{
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
            {pendingPtoRequests.length > 10 && (
              <div style={{ backgroundColor: '#f8fafc', padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                <Link
                  to="/manager/approve-pto"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#002349', textDecoration: 'none' }}
                >
                  View all {pendingPtoRequests.length} pending requests
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginLeft: '4px' }}>arrow_forward</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Users */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Recent Users
          </h2>
          <span style={{
            backgroundColor: '#002349',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {allUsers.slice(0, 10).length} of {allUsers.length}
          </span>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
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
                  Manager
                </th>
                <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                  Status
                </th>
                <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {allUsers.slice(0, 10).map((user, index) => (
                <tr key={user.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                    {user.firstName} {user.lastName}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {user.department || "N/A"}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {user.managerIds?.length
                      ? user.managerIds
                          .map((id) => {
                            const m = allUsers.find((u) => u.id === id);
                            return m ? `${m.firstName} ${m.lastName}` : String(id);
                          })
                          .join(", ")
                      : user.managerName || "N/A"}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    {user.isActive === 1 ? (
                      <span style={{
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Active
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#f8fafc',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <Link
                      to={`/admin/user/${user.id}`}
                      style={{
                        backgroundColor: '#002349',
                        color: 'white',
                        padding: '6px 12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allUsers.length > 10 && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
              <Link
                to="/admin/manage-users"
                style={{ fontSize: '13px', fontWeight: 600, color: '#002349', textDecoration: 'none' }}
              >
                View all {allUsers.length} users
                <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginLeft: '4px' }}>arrow_forward</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #C29B40',
        borderRadius: '0 12px 12px 0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>admin_panel_settings</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349', marginBottom: '4px' }}>
            Admin Overview
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            As an administrator, you have full access to manage <strong style={{ color: '#002349' }}>users</strong>, <strong style={{ color: '#002349' }}>holidays</strong>, and <strong style={{ color: '#002349' }}>system settings</strong>. Use the quick actions above to navigate to specific management areas.
          </div>
        </div>
      </div>
    </div>
  );
}
