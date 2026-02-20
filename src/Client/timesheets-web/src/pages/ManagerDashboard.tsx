import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth/useAuth";
import { fetchMyTeamUsers, fetchManagerPendingPtoRequests, approvePtoRequest, denyPtoRequest, formatPtoRequestDateDisplay, type UserDto, type PtoRequestWithUserDto } from "../api";
import { Link } from "react-router-dom";

type Toast = { message: string; type: "success" | "error" };

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<UserDto[]>([]);
  const [pendingPtoRequests, setPendingPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PtoRequestWithUserDto | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

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

  const refreshPendingRequests = async () => {
    try {
      const pending = await fetchManagerPendingPtoRequests();
      setPendingPtoRequests(pending);
    } catch (err) {
      console.error("Failed to refresh pending requests:", err);
    }
  };

  const openApproveModal = (request: PtoRequestWithUserDto) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setProcessing(selectedRequest.id);
      await approvePtoRequest(selectedRequest.id, user?.id ?? 1);
      setShowApproveModal(false);
      setSelectedRequest(null);
      await refreshPendingRequests();
      showToast("PTO request approved successfully!", "success");
    } catch (err) {
      console.error("Failed to approve request:", err);
      showToast("Failed to approve request. Please try again.", "error");
    } finally {
      setProcessing(null);
    }
  };

  const openDenyModal = (request: PtoRequestWithUserDto) => {
    setSelectedRequest(request);
    setDenyReason("");
    setShowDenyModal(true);
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    try {
      setProcessing(selectedRequest.id);
      await denyPtoRequest(selectedRequest.id, user?.id ?? 1, denyReason);
      setShowDenyModal(false);
      setSelectedRequest(null);
      await refreshPendingRequests();
      showToast("PTO request denied.", "success");
    } catch (err) {
      console.error("Failed to deny request:", err);
      showToast("Failed to deny request. Please try again.", "error");
    } finally {
      setProcessing(null);
    }
  };

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
                minHeight: '44px',
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
                minHeight: '44px',
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
                            <button
                              onClick={() => openApproveModal(request)}
                              disabled={processing === request.id}
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
                              cursor: processing === request.id ? 'not-allowed' : 'pointer',
                              opacity: processing === request.id ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              minHeight: '44px',
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                              {processing === request.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => openDenyModal(request)}
                              disabled={processing === request.id}
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
                              cursor: processing === request.id ? 'not-allowed' : 'pointer',
                              opacity: processing === request.id ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              minHeight: '44px',
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
                    <button
                      onClick={() => openApproveModal(request)}
                      disabled={processing === request.id}
                      style={{
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      cursor: processing === request.id ? 'not-allowed' : 'pointer',
                      opacity: processing === request.id ? 0.6 : 1,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      minHeight: '44px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                      {processing === request.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => openDenyModal(request)}
                      disabled={processing === request.id}
                      style={{
                      backgroundColor: 'white',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      cursor: processing === request.id ? 'not-allowed' : 'pointer',
                      opacity: processing === request.id ? 0.6 : 1,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      minHeight: '44px',
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: '44px',
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

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            margin: '0 16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#002349' }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                Approve PTO Request
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                Confirm approval for this time-off request
              </p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Employee</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{selectedRequest.userName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Date</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{formatPtoRequestDateDisplay(selectedRequest)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Hours</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{selectedRequest.hours}h</div>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Reason</div>
                    <div style={{ fontSize: '14px', color: '#002349' }}>{selectedRequest.reason}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="form-actions-mobile" style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }}
                style={{
                  backgroundColor: 'white',
                  color: '#64748b',
                  padding: '12px 24px',
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
                onClick={handleApprove}
                disabled={processing !== null}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: processing !== null ? 'not-allowed' : 'pointer',
                  opacity: processing !== null ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                {processing !== null ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                    Approve Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            margin: '0 16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#002349' }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                Deny PTO Request
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                Please provide a reason for the denial
              </p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Employee</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{selectedRequest.userName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Date</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{formatPtoRequestDateDisplay(selectedRequest)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>Hours</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{selectedRequest.hours}h</div>
                  </div>
                </div>
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#002349',
                }}>
                  Reason for Denial
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: '#64748b', marginLeft: '8px' }}>(optional)</span>
                </label>
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for denial..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    color: '#002349',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                />
              </div>
            </div>
            <div className="form-actions-mobile" style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => { setShowDenyModal(false); setSelectedRequest(null); }}
                style={{
                  backgroundColor: 'white',
                  color: '#64748b',
                  padding: '12px 24px',
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
                onClick={handleDeny}
                disabled={processing !== null}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: processing !== null ? 'not-allowed' : 'pointer',
                  opacity: processing !== null ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                {processing !== null ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                    Deny Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: toast.type === 'success' ? '#002349' : '#dc2626',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          fontSize: '14px',
          fontWeight: 600,
          animation: 'slideInRight 0.3s ease-out',
          maxWidth: '400px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: toast.type === 'success' ? '#C29B40' : '#fecaca' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: '0',
              marginLeft: '8px',
              display: 'flex',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}
    </div>
  );
}
