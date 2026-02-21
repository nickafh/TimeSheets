import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchMyTeamUsers,
  fetchManagerPendingPtoRequests,
  approvePtoRequest,
  denyPtoRequest,
  formatPtoRequestDateDisplay,
  fetchNeedsAttention,
  correctPunchTime,
  type UserDto,
  type PtoRequestWithUserDto,
  type NeedsAttentionItemDto,
} from "../api";
import { Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

const PUNCH_TYPE_LABELS: Record<string, string> = {
  ClockIn: "Clock In",
  LunchOut: "Lunch Out",
  LunchIn: "Lunch In",
  ClockOut: "Clock Out",
};

const EXPECTED_PUNCH_ORDER = ["ClockIn", "LunchOut", "LunchIn", "ClockOut"];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [teamMembers, setTeamMembers] = useState<UserDto[]>([]);
  const [pendingPtoRequests, setPendingPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PtoRequestWithUserDto | null>(null);
  const [denyReason, setDenyReason] = useState("");

  // Needs Attention state
  const [needsAttentionItems, setNeedsAttentionItems] = useState<NeedsAttentionItemDto[]>([]);
  const [loadingAttention, setLoadingAttention] = useState(true);

  // Correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionItem, setCorrectionItem] = useState<NeedsAttentionItemDto | null>(null);
  const [correctionValues, setCorrectionValues] = useState<Record<number, string>>({});
  const [savingCorrection, setSavingCorrection] = useState(false);

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
        showToast("Failed to load dashboard data.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Load needs attention items
  useEffect(() => {
    const loadAttention = async () => {
      try {
        setLoadingAttention(true);
        const items = await fetchNeedsAttention();
        setNeedsAttentionItems(items);
      } catch (err) {
        console.error("Failed to load needs attention:", err);
        showToast("Failed to load attention items.", "error");
      } finally {
        setLoadingAttention(false);
      }
    };
    loadAttention();
  }, []);

  const refreshNeedsAttention = async () => {
    try {
      const items = await fetchNeedsAttention();
      setNeedsAttentionItems(items);
    } catch (err) {
      console.error("Failed to refresh needs attention:", err);
      showToast("Failed to load attention items.", "error");
    }
  };

  const refreshPendingRequests = async () => {
    try {
      const pending = await fetchManagerPendingPtoRequests();
      setPendingPtoRequests(pending);
    } catch (err) {
      console.error("Failed to refresh pending requests:", err);
      showToast("Failed to load pending requests.", "error");
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

  // Correction modal helpers
  const openCorrectionModal = (item: NeedsAttentionItemDto) => {
    setCorrectionItem(item);
    // Pre-fill correction values with existing punch times
    const values: Record<number, string> = {};
    for (const punch of item.punches) {
      // Convert UTC to local datetime-local format
      const local = new Date(punch.punchTime);
      const pad = (n: number) => n.toString().padStart(2, "0");
      values[punch.id] = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    }
    setCorrectionValues(values);
    setShowCorrectionModal(true);
  };

  const handleSaveCorrections = async () => {
    if (!correctionItem) return;
    setSavingCorrection(true);
    try {
      let changeCount = 0;
      for (const punch of correctionItem.punches) {
        const newValue = correctionValues[punch.id];
        if (!newValue) continue;
        // Check if the value actually changed
        const original = new Date(punch.punchTime);
        const corrected = new Date(newValue);
        if (Math.abs(original.getTime() - corrected.getTime()) > 60000) {
          // Changed by more than a minute -- submit correction
          await correctPunchTime(punch.id, corrected.toISOString());
          changeCount++;
        }
      }

      setShowCorrectionModal(false);
      setCorrectionItem(null);
      setCorrectionValues({});
      await refreshNeedsAttention();

      if (changeCount > 0) {
        showToast(`${changeCount} punch${changeCount !== 1 ? "es" : ""} corrected successfully.`, "success");
      } else {
        showToast("No changes detected.", "success");
      }
    } catch (err) {
      console.error("Failed to save corrections:", err);
      showToast("Failed to save corrections. Please try again.", "error");
    } finally {
      setSavingCorrection(false);
    }
  };

  // Determine which punches are missing for a needs-attention item
  const getMissingPunches = (item: NeedsAttentionItemDto): string[] => {
    const existingTypes = new Set(item.punches.map(p => p.punchType));
    // Must have at least ClockIn and ClockOut
    const missing: string[] = [];
    if (!existingTypes.has("ClockOut")) {
      missing.push("Clock Out");
    }
    if (!existingTypes.has("ClockIn")) {
      missing.push("Clock In");
    }
    // If has LunchOut but no LunchIn
    if (existingTypes.has("LunchOut") && !existingTypes.has("LunchIn")) {
      missing.push("Lunch In");
    }
    return missing;
  };

  if (loading) {
    return (
      <LoadingSpinner fullPage message="Loading manager dashboard..." />
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

      {/* Needs Attention Card */}
      <div style={{
        backgroundColor: 'white',
        border: needsAttentionItems.length > 0 ? '1px solid #fbbf24' : '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: needsAttentionItems.length > 0 ? 'rgba(217, 119, 6, 0.05)' : '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '22px',
              color: needsAttentionItems.length > 0 ? '#d97706' : '#059669',
            }}>
              {needsAttentionItems.length > 0 ? 'warning' : 'verified'}
            </span>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
              Needs Attention
            </h2>
          </div>
          <span style={{
            backgroundColor: needsAttentionItems.length > 0 ? '#d97706' : '#059669',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {needsAttentionItems.length} Item{needsAttentionItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingAttention ? (
          <LoadingSpinner size="sm" />
        ) : needsAttentionItems.length === 0 ? (
          <EmptyState icon="check_circle" message="No items need attention" />
        ) : (
          <div style={{ padding: '0' }}>
            {needsAttentionItems.map((item, index) => {
              const missingPunches = getMissingPunches(item);
              const punchDate = new Date(item.punchDate + "T00:00:00");

              return (
                <div
                  key={`${item.userId}-${item.punchDate}`}
                  style={{
                    padding: '20px 24px',
                    borderBottom: index < needsAttentionItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Warning icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(217, 119, 6, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#d97706' }}>schedule</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#002349', marginBottom: '4px' }}>
                      {item.userName}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                      {punchDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    </div>

                    {/* Existing punches */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                      {item.punches
                        .sort((a, b) => EXPECTED_PUNCH_ORDER.indexOf(a.punchType) - EXPECTED_PUNCH_ORDER.indexOf(b.punchType))
                        .map((punch) => (
                          <span key={punch.id} style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                          }}>
                            {PUNCH_TYPE_LABELS[punch.punchType] ?? punch.punchType}:{" "}
                            {new Date(punch.punchTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        ))}
                    </div>

                    {/* Missing punches */}
                    {missingPunches.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                        Missing: {missingPunches.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Fix button */}
                  <button
                    onClick={() => openCorrectionModal(item)}
                    style={{
                      backgroundColor: '#d97706',
                      color: 'white',
                      padding: '8px 16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '44px',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    Fix
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
          <EmptyState icon="check_circle" message="No pending PTO requests" />
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
                          {request.reason || "\u2014"}
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

      {/* Correction Modal */}
      {showCorrectionModal && correctionItem && (
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
            maxWidth: '520px',
            margin: '0 16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#002349' }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                Correct Punches
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                {correctionItem.userName} &mdash;{" "}
                {new Date(correctionItem.punchDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                Edit punch times below. Changes are saved with an audit trail recording the original time and your correction.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {correctionItem.punches
                  .sort((a, b) => EXPECTED_PUNCH_ORDER.indexOf(a.punchType) - EXPECTED_PUNCH_ORDER.indexOf(b.punchType))
                  .map((punch) => (
                    <div key={punch.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: '#002349',
                          marginBottom: '6px',
                        }}>
                          {PUNCH_TYPE_LABELS[punch.punchType] ?? punch.punchType}
                        </div>
                        <input
                          type="datetime-local"
                          value={correctionValues[punch.id] ?? ""}
                          onChange={(e) =>
                            setCorrectionValues((prev) => ({
                              ...prev,
                              [punch.id]: e.target.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                            color: '#002349',
                            border: '2px solid #e2e8f0',
                            borderRadius: '6px',
                            outline: 'none',
                            fontFamily: "'Montserrat', sans-serif",
                          }}
                        />
                      </div>
                    </div>
                  ))}
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
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionItem(null);
                  setCorrectionValues({});
                }}
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
                onClick={handleSaveCorrections}
                disabled={savingCorrection}
                style={{
                  backgroundColor: '#d97706',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: savingCorrection ? 'not-allowed' : 'pointer',
                  opacity: savingCorrection ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                {savingCorrection ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
                    Save Corrections
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
