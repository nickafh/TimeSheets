import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchPendingPtoRequests,
  fetchPtoHistory,
  approvePtoRequest,
  denyPtoRequest,
  formatPtoRequestDateDisplay,
  type PtoRequestWithUserDto,
} from "../api";

type TabType = "pending" | "approved" | "denied" | "all";

export default function ApprovePto() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PtoRequestWithUserDto | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let data: PtoRequestWithUserDto[];

      if (activeTab === "pending") {
        data = await fetchPendingPtoRequests();
      } else if (activeTab === "approved") {
        data = await fetchPtoHistory(1);
      } else if (activeTab === "denied") {
        data = await fetchPtoHistory(2);
      } else {
        data = await fetchPtoHistory();
      }

      setRequests(data);
    } catch (error) {
      console.error("Failed to load PTO requests:", error);
      alert("Failed to load PTO requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PtoRequestWithUserDto) => {
    if (!confirm(`Approve PTO request for ${request.userName} for ${formatPtoRequestDateDisplay(request)}?`)) {
      return;
    }

    try {
      setProcessing(request.id);
      await approvePtoRequest(request.id, user?.id ?? 1);
      await loadRequests();
      alert("PTO request approved successfully!");
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert("Failed to approve request. Please try again.");
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
      await loadRequests();
      alert("PTO request denied.");
    } catch (error) {
      console.error("Failed to deny request:", error);
      alert("Failed to deny request. Please try again.");
    } finally {
      setProcessing(null);
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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "pending", label: "Pending", icon: "hourglass_empty" },
    { id: "approved", label: "Approved", icon: "check_circle" },
    { id: "denied", label: "Denied", icon: "cancel" },
    { id: "all", label: "All Requests", icon: "list" },
  ];

  const pendingCount = activeTab === "pending" ? requests.length : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', padding: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Approve PTO Requests
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          Review and manage PTO requests from your team.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-bar" style={{
        marginBottom: '24px',
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #002349' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#002349' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
            {tab.id === "pending" && pendingCount > 0 && (
              <span style={{
                backgroundColor: '#C29B40',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                marginLeft: '4px',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#002349', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <span style={{ marginLeft: '12px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading...</span>
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>
            {activeTab === "pending" ? "hourglass_empty" : activeTab === "approved" ? "check_circle" : activeTab === "denied" ? "cancel" : "list"}
          </span>
          <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
            {activeTab === "pending"
              ? "No pending PTO requests."
              : activeTab === "approved"
              ? "No approved requests."
              : activeTab === "denied"
              ? "No denied requests."
              : "No PTO requests found."}
          </p>
        </div>
      ) : (
        <>
          {/* Request Count */}
          <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
            Showing {requests.length} request{requests.length !== 1 ? "s" : ""}
          </div>

          {/* Requests Table */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflowX: 'auto',
          }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
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
                    Date of Leave
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
                    Hours
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
                    Reason
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
                    Requested
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
                    Status
                  </th>
                  {activeTab === "pending" && (
                    <th style={{
                      padding: '14px 24px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#C29B40',
                    }}>
                      Actions
                    </th>
                  )}
                  {activeTab === "denied" && (
                    <th style={{
                      padding: '14px 24px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#C29B40',
                    }}>
                      Deny Reason
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {requests.map((request, index) => (
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
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    {activeTab === "pending" && (
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={processing === request.id}
                            style={{
                              backgroundColor: '#059669',
                              color: 'white',
                              padding: '8px 16px',
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
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                            {processing === request.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => openDenyModal(request)}
                            disabled={processing === request.id}
                            style={{
                              backgroundColor: 'white',
                              color: '#dc2626',
                              padding: '8px 16px',
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
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                            Deny
                          </button>
                        </div>
                      </td>
                    )}
                    {activeTab === "denied" && (
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: '#dc2626', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {request.denyReason || "No reason provided"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            Manager Actions
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            <strong style={{ color: '#059669' }}>Approve</strong> requests to grant time off, or <strong style={{ color: '#dc2626' }}>Deny</strong> with a reason. Employees will be notified of your decision automatically.
          </div>
        </div>
      </div>

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
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#002349',
            }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                Deny PTO Request
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                Please provide a reason for the denial
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Request Details */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                      Employee
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                      {selectedRequest.userName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                      Date
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                      {formatPtoRequestDateDisplay(selectedRequest)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                      Hours
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                      {selectedRequest.hours}h
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
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
                    fontSize: '14px',
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

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setSelectedRequest(null);
                }}
                style={{
                  backgroundColor: 'white',
                  color: '#64748b',
                  padding: '12px 24px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
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
                  fontSize: '11px',
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
    </div>
  );
}
