import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { fetchUsers, fetchPendingPtoRequests, fetchPtoHistory, fetchHolidays, approvePtoRequest, denyPtoRequest, formatPtoRequestDateDisplay, fetchNeedsAttention, correctPunchTime, type UserDto, type PtoRequestWithUserDto, type HolidayDto, type NeedsAttentionItemDto } from "../api";
import { Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { LoadingSpinner } from "../components/LoadingSpinner";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserDto[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<UserDto[]>([]);
  const [allPtoRequests, setAllPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [pendingPtoRequests, setPendingPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PtoRequestWithUserDto | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  // Needs Attention state
  const [needsAttentionItems, setNeedsAttentionItems] = useState<NeedsAttentionItemDto[]>([]);
  const [loadingAttention, setLoadingAttention] = useState(true);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionItem, setCorrectionItem] = useState<NeedsAttentionItemDto | null>(null);
  const [correctionValues, setCorrectionValues] = useState<Record<number, string>>({});
  const [savingCorrection, setSavingCorrection] = useState(false);

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

        // Fetch needs attention items
        try {
          setLoadingAttention(true);
          const attentionItems = await fetchNeedsAttention();
          setNeedsAttentionItems(attentionItems);
        } catch {
          console.error("Failed to load needs attention items");
        } finally {
          setLoadingAttention(false);
        }
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
        showToast("Failed to load dashboard data.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApprove = async (request: PtoRequestWithUserDto) => {
    if (!user) return;
    if (!(await confirm(`approve PTO request for ${request.userName} for ${formatPtoRequestDateDisplay(request)}`, "Approve"))) {
      return;
    }
    try {
      setProcessing(request.id);
      await approvePtoRequest(request.id, user.id);
      const pendingPto = await fetchPendingPtoRequests();
      setPendingPtoRequests(pendingPto);
      const allPto = await fetchPtoHistory();
      setAllPtoRequests(allPto);
      showToast("PTO request approved!", "success");
    } catch (error) {
      console.error("Failed to approve request:", error);
      showToast("Failed to approve request.", "error");
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
    if (!user || !selectedRequest) return;
    try {
      setProcessing(selectedRequest.id);
      await denyPtoRequest(selectedRequest.id, user.id, denyReason || undefined);
      setShowDenyModal(false);
      setSelectedRequest(null);
      const pendingPto = await fetchPendingPtoRequests();
      setPendingPtoRequests(pendingPto);
      const allPto = await fetchPtoHistory();
      setAllPtoRequests(allPto);
      showToast("PTO request denied.", "success");
    } catch (error) {
      console.error("Failed to deny request:", error);
      showToast("Failed to deny request.", "error");
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

  const PUNCH_TYPE_LABELS: Record<string, string> = { ClockIn: "Clock In", LunchOut: "Lunch Out", LunchIn: "Lunch In", ClockOut: "Clock Out" };
  const EXPECTED_PUNCH_ORDER = ["ClockIn", "LunchOut", "LunchIn", "ClockOut"];

  const getMissingPunches = (item: NeedsAttentionItemDto): string[] => {
    const existingTypes = new Set(item.punches.map(p => p.punchType));
    const missing: string[] = [];
    if (!existingTypes.has("ClockOut")) missing.push("Clock Out");
    if (!existingTypes.has("ClockIn")) missing.push("Clock In");
    if (existingTypes.has("LunchOut") && !existingTypes.has("LunchIn")) missing.push("Lunch In");
    return missing;
  };

  const openCorrectionModal = (item: NeedsAttentionItemDto) => {
    setCorrectionItem(item);
    const values: Record<number, string> = {};
    for (const punch of item.punches) {
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
        const original = new Date(punch.punchTime);
        const corrected = new Date(newValue);
        if (Math.abs(original.getTime() - corrected.getTime()) > 60000) {
          await correctPunchTime(punch.id, corrected.toISOString());
          changeCount++;
        }
      }
      setShowCorrectionModal(false);
      setCorrectionItem(null);
      setCorrectionValues({});
      const refreshed = await fetchNeedsAttention();
      setNeedsAttentionItems(refreshed);
      showToast(changeCount > 0 ? `${changeCount} punch${changeCount !== 1 ? "es" : ""} corrected.` : "No changes detected.", "success");
    } catch (err) {
      console.error("Failed to save corrections:", err);
      showToast("Failed to save corrections.", "error");
    } finally {
      setSavingCorrection(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading dashboard..." />;
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
      <div className="stats-grid-4" style={{ marginBottom: '32px', gap: '16px' }}>
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

      {/* Needs Attention */}
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
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: needsAttentionItems.length > 0 ? '#d97706' : '#059669' }}>
              {needsAttentionItems.length > 0 ? 'warning' : 'verified'}
            </span>
            <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
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
          <LoadingSpinner />
        ) : needsAttentionItems.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#a7f3d0' }}>check_circle</span>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>No items need attention</p>
          </div>
        ) : (
          <div>
            {needsAttentionItems.map((item, index) => {
              const missingPunches = getMissingPunches(item);
              const punchDate = new Date(item.punchDate + "T00:00:00");
              return (
                <div key={`${item.userId}-${item.punchDate}`} style={{
                  padding: '20px 24px',
                  borderBottom: index < needsAttentionItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#d97706' }}>schedule</span>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#002349', marginBottom: '4px' }}>{item.userName}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                      {punchDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                      {item.punches
                        .sort((a, b) => EXPECTED_PUNCH_ORDER.indexOf(a.punchType) - EXPECTED_PUNCH_ORDER.indexOf(b.punchType))
                        .map((punch) => (
                          <span key={punch.id} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '3px', backgroundColor: '#f1f5f9', color: '#334155' }}>
                            {PUNCH_TYPE_LABELS[punch.punchType] ?? punch.punchType}: {new Date(punch.punchTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </span>
                        ))}
                    </div>
                    {missingPunches.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Missing: {missingPunches.join(", ")}</div>
                    )}
                  </div>
                  <button onClick={() => openCorrectionModal(item)} style={{
                    backgroundColor: '#d97706', color: 'white', padding: '8px 16px', fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', minHeight: '44px', flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    Fix
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '16px' }}>
          Quick Actions
        </h2>
        <div className="quick-actions-grid">
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
          <>
            {/* Desktop Table */}
            <div className="admin-table-desktop" style={{
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
                            onClick={() => handleApprove(request)}
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

            {/* Mobile Cards */}
            <div className="admin-cards-mobile">
              {pendingPtoRequests.slice(0, 10).map((request) => (
                <div key={request.id} className="admin-card">
                  <div className="admin-card__header">
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                        {request.userName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {request.department || "N/A"}
                      </div>
                    </div>
                    <span style={{
                      ...getStatusStyle(request.status),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <div className="admin-card__row">
                    <span style={{ fontWeight: 600 }}>Date:</span>
                    <span>{formatPtoRequestDateDisplay(request)}</span>
                  </div>
                  <div className="admin-card__row">
                    <span style={{ fontWeight: 600 }}>Hours:</span>
                    <span>{request.hours}h</span>
                  </div>
                  {request.reason && (
                    <div className="admin-card__row">
                      <span style={{ fontWeight: 600 }}>Reason:</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.reason}</span>
                    </div>
                  )}
                  <div className="admin-card__actions">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processing === request.id}
                      style={{
                        flex: 1,
                        backgroundColor: '#059669',
                        color: 'white',
                        padding: '10px 16px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: processing === request.id ? 'not-allowed' : 'pointer',
                        opacity: processing === request.id ? 0.6 : 1,
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
                        flex: 1,
                        backgroundColor: 'white',
                        color: '#dc2626',
                        padding: '10px 16px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        cursor: processing === request.id ? 'not-allowed' : 'pointer',
                        opacity: processing === request.id ? 0.6 : 1,
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
              {pendingPtoRequests.length > 10 && (
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', textAlign: 'center', borderRadius: '8px' }}>
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
          </>
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

        {/* Desktop Table */}
        <div className="admin-table-desktop" style={{
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
                        minHeight: '44px',
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

        {/* Mobile Cards */}
        <div className="admin-cards-mobile">
          {allUsers.slice(0, 10).map((user) => (
            <div key={user.id} className="admin-card">
              <div className="admin-card__header">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {user.email}
                  </div>
                </div>
                {user.isActive === 1 ? (
                  <span style={{
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
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
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Inactive
                  </span>
                )}
              </div>
              <div className="admin-card__row">
                <span style={{ fontWeight: 600 }}>Department:</span>
                <span>{user.department || "N/A"}</span>
              </div>
              <div className="admin-card__row">
                <span style={{ fontWeight: 600 }}>Role:</span>
                <span>{user.role || "N/A"}</span>
              </div>
              <div className="admin-card__actions">
                <Link
                  to={`/admin/user/${user.id}`}
                  style={{
                    flex: 1,
                    backgroundColor: '#002349',
                    color: 'white',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '44px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  Manage User
                </Link>
              </div>
            </div>
          ))}
          {allUsers.length > 10 && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', textAlign: 'center', borderRadius: '8px' }}>
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

      {/* Deny PTO Modal */}
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

            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', gap: '24px' }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div style={{ width: '100%', maxWidth: '520px', margin: '0 16px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#002349' }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>Correct Punches</h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                {correctionItem.userName} &mdash; {new Date(correctionItem.punchDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                Edit punch times below. Changes are saved with an audit trail.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {correctionItem.punches
                  .sort((a, b) => EXPECTED_PUNCH_ORDER.indexOf(a.punchType) - EXPECTED_PUNCH_ORDER.indexOf(b.punchType))
                  .map((punch) => (
                    <div key={punch.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349', marginBottom: '6px' }}>
                          {PUNCH_TYPE_LABELS[punch.punchType] ?? punch.punchType}
                        </div>
                        <input
                          type="datetime-local"
                          value={correctionValues[punch.id] ?? ""}
                          onChange={(e) => setCorrectionValues((prev) => ({ ...prev, [punch.id]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 12px', fontSize: '14px', color: '#002349', border: '2px solid #e2e8f0', borderRadius: '6px', outline: 'none', fontFamily: "'Montserrat', sans-serif" }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCorrectionModal(false); setCorrectionItem(null); setCorrectionValues({}); }}
                style={{ backgroundColor: 'white', color: '#64748b', padding: '12px 24px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrections}
                disabled={savingCorrection}
                style={{ backgroundColor: '#d97706', color: 'white', padding: '12px 24px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '6px', border: 'none', cursor: savingCorrection ? 'not-allowed' : 'pointer', opacity: savingCorrection ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}
              >
                {savingCorrection ? "Saving..." : "Save Corrections"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
