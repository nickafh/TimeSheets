import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchUsers,
  fetchManagers,
  createUser,
  updateUser,
  updateUserManagers,
  deactivateUser,
  activateUser,
  type UserDto,
  type ManagerOptionDto,
} from "../api";

export default function ManageUsers() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [managers, setManagers] = useState<ManagerOptionDto[]>([]);
  const [formData, setFormData] = useState<Partial<UserDto> & { managerIds?: number[] }>({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    category: "",
    managerName: "",
    managerIds: [],
    hireDate: "",
    isActive: 1,
    isWfh: 0,
    isPartTime: 0,
    isIntern: 0,
    role: "Employee",
  });

  useEffect(() => {
    loadUsers();
  }, [showInactive]);

  useEffect(() => {
    fetchManagers().then(setManagers).catch(() => setManagers([]));
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers(showInactive);
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
      alert("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.firstName?.toLowerCase().includes(term) ||
        user.lastName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.department?.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      category: "",
      managerName: "",
      managerIds: [],
      hireDate: "",
      isActive: 1,
      isWfh: 0,
      isPartTime: 0,
      isIntern: 0,
      role: "Employee",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("First Name, Last Name, and Email are required");
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.id, {
          ...editingUser,
          ...formData,
          hireDate: formData.hireDate || null,
        } as UserDto);
        await updateUserManagers(editingUser.id, formData.managerIds ?? []);
      } else {
        // Create new user
        const created = await createUser({
          legacyEmployeeId: null,
          firstName: formData.firstName || "",
          lastName: formData.lastName || "",
          email: formData.email || "",
          department: formData.department || null,
          category: formData.category || null,
          managerName: formData.managerName || null,
          hireDate: formData.hireDate || null,
          terminationDate: null,
          isActive: 1,
          isWfh: formData.isWfh || 0,
          isPartTime: formData.isPartTime || 0,
          isIntern: formData.isIntern || 0,
          role: formData.role || "Employee",
        });
        await updateUserManagers(created.id, formData.managerIds ?? []);
      }

      setShowModal(false);
      await loadUsers();
      alert(
        editingUser
          ? "User updated successfully!"
          : "User created successfully!"
      );
    } catch (error) {
      console.error("Failed to save user:", error);
      alert("Failed to save user. Please check for duplicate emails.");
    }
  };

  const handleDeactivate = async (user: UserDto) => {
    if (
      !confirm(
        `Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`
      )
    ) {
      return;
    }

    try {
      await deactivateUser(user.id);
      await loadUsers();
      alert("User deactivated successfully!");
    } catch (error) {
      console.error("Failed to deactivate user:", error);
      alert("Failed to deactivate user. Please try again.");
    }
  };

  const handleActivate = async (user: UserDto) => {
    if (
      !confirm(
        `Are you sure you want to reactivate ${user.firstName} ${user.lastName}?`
      )
    ) {
      return;
    }

    try {
      await activateUser(user.id);
      await loadUsers();
      alert("User activated successfully!");
    } catch (error) {
      console.error("Failed to activate user:", error);
      alert("Failed to activate user. Please try again.");
    }
  };

  const getRoleBadgeStyle = (role: string | null | undefined) => {
    switch (role) {
      case "Admin":
        return { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case "Manager":
        return { backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' };
      default:
        return { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '16px',
    color: '#002349',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    fontFamily: "'Montserrat', sans-serif",
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#002349',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#002349', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        <span style={{ marginLeft: '12px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading users...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
            Manage Users
          </h1>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            Create, edit, and manage user accounts.
          </p>
        </div>
        <button
          onClick={openAddModal}
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
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
          Add New User
        </button>
      </div>

      {/* Controls */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span className="material-symbols-outlined" style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '20px',
            color: '#64748b',
          }}>search</span>
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              fontSize: '16px',
              color: '#002349',
              border: '2px solid #e2e8f0',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: 'white',
            }}
          />
        </div>

        {/* Show Inactive Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '6px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#002349' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#002349' }}>
            Show Inactive
          </span>
        </label>
      </div>

      {/* User Count */}
      <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table - Desktop */}
      <div className="admin-table-desktop" style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#002349' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Name
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Email
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Department
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Role
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Type
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Status
              </th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>person_off</span>
                  <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                    No users found. Try adjusting your search criteria.
                  </p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                      {user.firstName} {user.lastName}
                    </div>
                    {(user.managerIds?.length || user.managerName) ? (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Manager(s): {user.managerIds?.length
                          ? user.managerIds
                              .map((id) => {
                                const m = users.find((u) => u.id === id);
                                return m ? `${m.firstName} ${m.lastName}` : String(id);
                              })
                              .join(", ")
                          : user.managerName ?? "—"}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#64748b' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                    {user.department || "—"}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{
                      ...getRoleBadgeStyle(user.role),
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {user.role || "Employee"}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
                      {user.isWfh === 1 && (
                        <span style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}>
                          WFH
                        </span>
                      )}
                      {user.isPartTime === 1 && (
                        <span style={{
                          backgroundColor: 'rgba(168, 85, 247, 0.1)',
                          color: '#a855f7',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}>
                          Part-Time
                        </span>
                      )}
                      {user.isIntern === 1 && (
                        <span style={{
                          backgroundColor: 'rgba(249, 115, 22, 0.1)',
                          color: '#f97316',
                          border: '1px solid rgba(249, 115, 22, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}>
                          Intern
                        </span>
                      )}
                      {user.isWfh !== 1 && user.isPartTime !== 1 && user.isIntern !== 1 && (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Full-Time</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {user.isActive === 1 ? (
                      <span style={{
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '4px 10px',
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
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
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
                      {user.isActive === 1 ? (
                        <button
                          onClick={() => handleDeactivate(user)}
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
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_off</span>
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(user)}
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
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_check</span>
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Users Cards - Mobile */}
      <div className="admin-cards-mobile">
        {filteredUsers.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: '48px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>person_off</span>
            <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
              No users found. Try adjusting your search criteria.
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="admin-card">
              {/* Card Header */}
              <div className="admin-card__header">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginBottom: '4px' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  {user.isActive === 1 ? (
                    <span style={{
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '4px 10px',
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
                      padding: '4px 10px',
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
              </div>

              {/* Card Body */}
              <div className="admin-card__row">
                <span style={{ color: '#64748b', minWidth: '80px' }}>Email:</span>
                <span style={{ color: '#002349', fontWeight: 500 }}>{user.email}</span>
              </div>
              <div className="admin-card__row">
                <span style={{ color: '#64748b', minWidth: '80px' }}>Department:</span>
                <span style={{ color: '#002349', fontWeight: 500 }}>{user.department || "—"}</span>
              </div>
              <div className="admin-card__row">
                <span style={{ color: '#64748b', minWidth: '80px' }}>Role:</span>
                <span style={{
                  ...getRoleBadgeStyle(user.role),
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {user.role || "Employee"}
                </span>
              </div>
              <div className="admin-card__row">
                <span style={{ color: '#64748b', minWidth: '80px' }}>Type:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {user.isWfh === 1 && (
                    <span style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}>
                      WFH
                    </span>
                  )}
                  {user.isPartTime === 1 && (
                    <span style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}>
                      Part-Time
                    </span>
                  )}
                  {user.isIntern === 1 && (
                    <span style={{
                      backgroundColor: 'rgba(249, 115, 22, 0.1)',
                      color: '#f97316',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}>
                      Intern
                    </span>
                  )}
                  {user.isWfh !== 1 && user.isPartTime !== 1 && user.isIntern !== 1 && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Full-Time</span>
                  )}
                </div>
              </div>
              {(user.managerIds?.length || user.managerName) ? (
                <div className="admin-card__row">
                  <span style={{ color: '#64748b', minWidth: '80px' }}>Manager(s):</span>
                  <span style={{ color: '#002349', fontSize: '12px' }}>
                    {user.managerIds?.length
                      ? user.managerIds
                          .map((id) => {
                            const m = users.find((u) => u.id === id);
                            return m ? `${m.firstName} ${m.lastName}` : String(id);
                          })
                          .join(", ")
                      : user.managerName ?? "—"}
                  </span>
                </div>
              ) : null}

              {/* Card Actions */}
              <div className="admin-card__actions" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <Link
                  to={`/admin/user/${user.id}`}
                  style={{
                    backgroundColor: '#002349',
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    flex: '1 1 auto',
                    minHeight: '44px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                  Manage
                </Link>
                {user.isActive === 1 ? (
                  <button
                    onClick={() => handleDeactivate(user)}
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
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      flex: '1 1 auto',
                      minHeight: '44px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_off</span>
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(user)}
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
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      flex: '1 1 auto',
                      minHeight: '44px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_check</span>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))
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
            User Management
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            <strong style={{ color: '#002349' }}>Deactivated users</strong> cannot log in but their data is preserved. Check "Show Inactive" to view and reactivate former employees.
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <div className="modal-content" style={{
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#002349',
            }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                {editingUser ? "Update user information" : "Create a new user account"}
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Name Row */}
              <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>
                    First Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName || ""}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Last Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName || ""}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>
                  Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Department and Category */}
              <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Department</label>
                  <input
                    type="text"
                    value={formData.department || ""}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Managers (multi-select), Hire Date, Role */}
              <div className="form-grid-3" style={{ marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Managers</label>
                  <div style={{ ...inputStyle, minHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {managers.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>No Manager/Admin users yet</span>
                    ) : (
                      managers.map((m) => (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={(formData.managerIds ?? []).includes(m.id)}
                            onChange={(e) => {
                              const ids = formData.managerIds ?? [];
                              setFormData({
                                ...formData,
                                managerIds: e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id),
                              });
                            }}
                            style={{ width: '16px', height: '16px', accentColor: '#002349' }}
                          />
                          <span>{m.firstName} {m.lastName} {m.role !== "Employee" ? `(${m.role})` : ""}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Hire Date</label>
                  <input
                    type="date"
                    value={formData.hireDate || ""}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select
                    value={formData.role || "Employee"}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Employee Type Checkboxes */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <label style={{ ...labelStyle, marginBottom: '12px' }}>
                  Employee Type
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isWfh === 1}
                      onChange={(e) => setFormData({ ...formData, isWfh: e.target.checked ? 1 : 0 })}
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#002349' }}>
                      Work From Home (WFH)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPartTime === 1}
                      onChange={(e) => setFormData({ ...formData, isPartTime: e.target.checked ? 1 : 0 })}
                      style={{ width: '18px', height: '18px', accentColor: '#a855f7' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#002349' }}>
                      Part-Time
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isIntern === 1}
                      onChange={(e) => setFormData({ ...formData, isIntern: e.target.checked ? 1 : 0 })}
                      style={{ width: '18px', height: '18px', accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#002349' }}>
                      Intern
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  type="submit"
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
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {editingUser ? "save" : "person_add"}
                  </span>
                  {editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
