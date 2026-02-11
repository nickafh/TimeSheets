import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchUserById,
  fetchUserPtoRequests,
  fetchDailyTimeEntries,
  fetchManagers,
  fetchDepartmentAndCategoryLookup,
  updateUser,
  updateUserManagers,
  deactivateUser,
  activateUser,
  setUserPassword,
  type UserDto,
  type ManagerOptionDto,
  formatPtoRequestDateDisplay,
  type PtoRequestWithUserDto,
  type DailyTimeEntryDto,
} from "../api";

export default function AdminUserDetails() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [user, setUser] = useState<UserDto | null>(null);
  const [ptoRequests, setPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [timeEntries, setTimeEntries] = useState<DailyTimeEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [managers, setManagers] = useState<ManagerOptionDto[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    category: "",
    managerName: "",
    managerIds: [] as number[],
    role: "Employee",
    isWfh: 0,
    isPartTime: 0,
    isIntern: 0,
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    fetchManagers().then(setManagers).catch(() => setManagers([]));
    fetchDepartmentAndCategoryLookup().then(({ departments, categories }) => {
      setDepartments(departments);
      setCategories(categories);
    }).catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await fetchUserById(userId);
      setUser(userData);
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        department: userData.department || "",
        category: userData.category || "",
        managerName: userData.managerName || "",
        managerIds: userData.managerIds ?? [],
        role: userData.role,
        isWfh: userData.isWfh,
        isPartTime: userData.isPartTime,
        isIntern: userData.isIntern,
      });

      try {
        const ptoData = await fetchUserPtoRequests(userId);
        setPtoRequests(ptoData);
      } catch {
        setPtoRequests([]);
      }

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
      setError(err?.message || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      await updateUser(user.id, {
        ...user,
        ...formData,
      });
      await updateUserManagers(user.id, formData.managerIds ?? []);

      setUser({ ...user, ...formData, managerIds: formData.managerIds });
      setIsEditing(false);
      setSuccess("User updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      if (user.isActive === 1) {
        await deactivateUser(user.id);
        setUser({ ...user, isActive: 0 });
        setSuccess("User deactivated");
      } else {
        await activateUser(user.id);
        setUser({ ...user, isActive: 1 });
        setSuccess("User activated");
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update user status");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (!user) return;
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    try {
      setPasswordSaving(true);
      setPasswordMsg(null);
      await setUserPassword(user.id, newPassword);
      setPasswordMsg({ type: "success", text: "Password updated successfully" });
      setNewPassword("");
      setTimeout(() => {
        setShowSetPassword(false);
        setPasswordMsg(null);
      }, 2000);
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "Failed to set password" });
    } finally {
      setPasswordSaving(false);
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

  // Calculate stats
  const yearPtoRequests = ptoRequests.filter(r => new Date(r.dateOfLeave).getFullYear() === currentYear);
  const approvedPto = yearPtoRequests.filter(r => r.status === 1);
  const totalApprovedHours = approvedPto.reduce((sum, r) => sum + r.hours, 0);
  const totalWorkedHours = timeEntries.reduce((sum, e) => sum + e.workedHours, 0);

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#002349',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    fontFamily: "'Montserrat', sans-serif",
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#002349',
  };

  const thStyle = {
    padding: '14px 20px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#C29B40',
  };

  if (loading) {
    return (
      <div className="page-container page-container--centered">
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading user details...</div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#dc2626' }}>error</span>
          <h2 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349', marginTop: '16px' }}>
            {error || "User not found"}
          </h2>
          <Link
            to="/admin/manage-users"
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
            Back to Manage Users
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-container">
      {/* Back Link */}
      <Link
        to="/admin/manage-users"
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
        Back to Manage Users
      </Link>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderLeft: '4px solid #059669',
          borderRadius: '0 8px 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '20px' }}>check_circle</span>
          <span style={{ fontWeight: 600, color: '#065f46' }}>{success}</span>
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderLeft: '4px solid #dc2626',
          borderRadius: '0 8px 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '20px' }}>error</span>
          <span style={{ fontWeight: 600, color: '#991b1b' }}>{error}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
              <span style={{ color: '#666666', fontSize: '15px' }}>{user.email}</span>
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
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#002349',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                Edit User
              </button>
              <button
                onClick={() => { setShowSetPassword(!showSetPassword); setPasswordMsg(null); setNewPassword(""); }}
                style={{
                  backgroundColor: '#C29B40',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_reset</span>
                Set Password
              </button>
              <button
                onClick={handleToggleActive}
                disabled={saving}
                style={{
                  backgroundColor: user.isActive === 1 ? '#dc2626' : '#059669',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  minHeight: '44px',
                }}
              >
                {user.isActive === 1 ? 'Deactivate' : 'Activate'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    department: user.department || "",
                    category: user.category || "",
                    managerName: user.managerName || "",
                    managerIds: user.managerIds ?? [],
                    role: user.role,
                    isWfh: user.isWfh,
                    isPartTime: user.isPartTime,
                    isIntern: user.isIntern,
                  });
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
                  minHeight: '44px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Set Password Form */}
      {showSetPassword && (
        <div style={{
          marginBottom: '24px',
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#C29B40' }}>lock_reset</span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#002349' }}>Set Password for {user.firstName} {user.lastName}</h3>
          </div>
          {passwordMsg && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: passwordMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${passwordMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: passwordMsg.type === 'success' ? '#065f46' : '#991b1b',
            }}>
              {passwordMsg.text}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              style={{
                ...inputStyle,
                maxWidth: '320px',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSetPassword(); }}
            />
            <button
              onClick={handleSetPassword}
              disabled={passwordSaving}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                padding: '12px 24px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: 'none',
                cursor: passwordSaving ? 'not-allowed' : 'pointer',
                opacity: passwordSaving ? 0.7 : 1,
                whiteSpace: 'nowrap',
                minHeight: '44px',
              }}
            >
              {passwordSaving ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={() => { setShowSetPassword(false); setNewPassword(""); setPasswordMsg(null); }}
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
                whiteSpace: 'nowrap',
                minHeight: '44px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid-4" style={{ gap: '24px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            PTO Approved ({currentYear})
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#059669' }}>{totalApprovedHours}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>hours</div>
        </div>
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Hours Worked (30 days)
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#002349' }}>{totalWorkedHours.toFixed(1)}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>hours</div>
        </div>
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            PTO Requests ({currentYear})
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#C29B40' }}>{yearPtoRequests.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>total</div>
        </div>
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Role
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#002349' }}>{user.role}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{user.department || 'No Dept'}</div>
        </div>
      </div>

      {/* Edit Form / User Details */}
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
          backgroundColor: '#002349',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
            {isEditing ? 'Edit User Information' : 'User Information'}
          </h2>
        </div>
        <div style={{ padding: '32px' }}>
          <div className="form-grid-3" style={{ gap: '24px' }}>
            <div>
              <label style={labelStyle}>First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>{user.firstName}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>{user.lastName}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>{user.email}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              {isEditing ? (
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">— Select —</option>
                  {[...new Set([...departments, formData.department].filter(Boolean))].sort().map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>{user.department || '—'}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              {isEditing ? (
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">— Select —</option>
                  {[...new Set([...categories, formData.category].filter(Boolean))].sort().map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>{user.category || '—'}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Managers</label>
              {isEditing ? (
                <div style={{ ...inputStyle, minHeight: '80px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {managers.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No Manager/Admin users yet</span>
                  ) : (
                    managers.map((m) => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={formData.managerIds.includes(m.id)}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              managerIds: e.target.checked
                                ? [...formData.managerIds, m.id]
                                : formData.managerIds.filter((id) => id !== m.id),
                            });
                          }}
                          style={{ width: '16px', height: '16px', accentColor: '#002349' }}
                        />
                        <span>{m.firstName} {m.lastName} {m.role !== "Employee" ? `(${m.role})` : ""}</span>
                      </label>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>
                  {user.managerIds?.length
                    ? user.managerIds
                        .map((id) => {
                          const m = managers.find((x) => x.id === id);
                          return m ? `${m.firstName} ${m.lastName}` : String(id);
                        })
                        .join(", ")
                    : user.managerName || "—"}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              {isEditing ? (
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              ) : (
                <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>{user.role}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Hire Date</label>
              <div style={{ fontSize: '15px', color: '#002349', fontWeight: 500, padding: '12px 0' }}>
                {user.hireDate ? new Date(user.hireDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ padding: '12px 0' }}>
                <span style={{
                  padding: '6px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  backgroundColor: user.isActive === 1 ? '#ecfdf5' : '#fef2f2',
                  color: user.isActive === 1 ? '#059669' : '#dc2626',
                }}>
                  {user.isActive === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Employee Type Checkboxes */}
          {isEditing && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <label style={labelStyle}>Employee Type</label>
              <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isWfh === 1}
                    onChange={(e) => setFormData({ ...formData, isWfh: e.target.checked ? 1 : 0 })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#002349' }}>Work From Home</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isPartTime === 1}
                    onChange={(e) => setFormData({ ...formData, isPartTime: e.target.checked ? 1 : 0 })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#002349' }}>Part-Time</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isIntern === 1}
                    onChange={(e) => setFormData({ ...formData, isIntern: e.target.checked ? 1 : 0 })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#002349' }}>Intern</span>
                </label>
              </div>
            </div>
          )}

          {!isEditing && (user.isWfh === 1 || user.isPartTime === 1 || user.isIntern === 1) && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <label style={labelStyle}>Employee Type</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PTO History */}
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
            PTO Request History ({currentYear})
          </h2>
          <span style={{ fontSize: '12px', color: 'white', fontWeight: 600 }}>
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
          <>
            {/* Desktop Table */}
            <div className="admin-table-desktop">
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
            </div>

            {/* Mobile Cards */}
            <div className="admin-cards-mobile">
              {yearPtoRequests.map((request) => (
                <div key={request.id} className="admin-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#002349' }}>{formatPtoRequestDateDisplay(request)}</div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Hours:</span>
                      <span style={{ color: '#002349', fontWeight: 600 }}>{request.hours}h</span>
                    </div>
                    {request.reason && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Reason:</span>
                        <span style={{ color: '#002349', flex: 1, textAlign: 'right', marginLeft: '12px' }}>{request.reason}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Requested:</span>
                      <span style={{ color: '#002349' }}>{new Date(request.requestedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
