import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { OverflowMenu } from "../components/OverflowMenu";
import {
  fetchAllNotifications,
  createNotification,
  updateNotification,
  deactivateNotification,
  activateNotification,
  deleteNotification,
  type NotificationDto,
} from "../api";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

export default function ManageNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotification, setEditingNotification] =
    useState<NotificationDto | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    expiresAt: "",
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchAllNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      showToast("Failed to load notifications. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingNotification(null);
    setFormData({
      title: "",
      message: "",
      expiresAt: "",
    });
    setShowModal(true);
  };

  const openEditModal = (notification: NotificationDto) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      expiresAt: notification.expiresAt
        ? new Date(notification.expiresAt).toISOString().slice(0, 16)
        : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.message) {
      showToast("Title and Message are required", "error");
      return;
    }

    try {
      if (editingNotification) {
        await updateNotification(editingNotification.id, {
          ...editingNotification,
          title: formData.title,
          message: formData.message,
          expiresAt: formData.expiresAt || null,
        });
      } else {
        await createNotification({
          title: formData.title,
          message: formData.message,
          expiresAt: formData.expiresAt || null,
          isActive: 1,
          createdByUserId: user?.id ?? 1,
        });
      }

      setShowModal(false);
      await loadNotifications();
      showToast(
        editingNotification
          ? "Notification updated successfully!"
          : "Notification created successfully!",
        "success"
      );
    } catch (error) {
      console.error("Failed to save notification:", error);
      showToast("Failed to save notification. Please try again.", "error");
    }
  };

  const handleDeactivate = async (notification: NotificationDto) => {
    if (!(await confirm("deactivate this notification", "Deactivate"))) {
      return;
    }

    try {
      await deactivateNotification(notification.id);
      await loadNotifications();
      showToast("Notification deactivated successfully!", "success");
    } catch (error) {
      console.error("Failed to deactivate notification:", error);
      showToast("Failed to deactivate notification. Please try again.", "error");
    }
  };

  const handleActivate = async (notification: NotificationDto) => {
    try {
      await activateNotification(notification.id);
      await loadNotifications();
      showToast("Notification activated successfully!", "success");
    } catch (error) {
      console.error("Failed to activate notification:", error);
      showToast("Failed to activate notification. Please try again.", "error");
    }
  };

  const handleDelete = async (notification: NotificationDto) => {
    if (!(await confirm("delete this notification", "Delete"))) {
      return;
    }

    try {
      await deleteNotification(notification.id);
      await loadNotifications();
      showToast("Notification deleted successfully!", "success");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      showToast("Failed to delete notification. Please try again.", "error");
    }
  };

  const isExpired = (notification: NotificationDto) => {
    if (!notification.expiresAt) return false;
    return new Date(notification.expiresAt) < new Date();
  };

  const getStatusStyle = (notification: NotificationDto) => {
    if (notification.isActive === 1 && !isExpired(notification)) {
      return { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
    } else if (isExpired(notification)) {
      return { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
    } else {
      return { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const getStatusLabel = (notification: NotificationDto) => {
    if (notification.isActive === 1 && !isExpired(notification)) return "Active";
    if (isExpired(notification)) return "Expired";
    return "Inactive";
  };

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

  if (loading) {
    return <LoadingSpinner fullPage message="Loading notifications..." />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-with-action" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
            Manage Notifications
          </h1>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            Create and manage system-wide notifications for all users.
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
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_alert</span>
          Create Notification
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid-3" style={{ marginBottom: '24px', gap: '16px' }}>
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#002349' }}>notifications</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Total
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#002349' }}>{notifications.length}</div>
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669' }}>notifications_active</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Active
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>
            {notifications.filter(n => n.isActive === 1 && !isExpired(n)).length}
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#d97706' }}>schedule</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Expired
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706' }}>
            {notifications.filter(n => isExpired(n)).length}
          </div>
        </div>
      </div>

      {/* Notifications Table - Desktop */}
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
                Title
              </th>
              <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Message
              </th>
              <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Created
              </th>
              <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
                Expires
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
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon="notifications_off" message="No notifications found. Create one to get started." ctaLabel="Create Notification" onCtaClick={openAddModal} />
                </td>
              </tr>
            ) : (
              notifications.map((notification, index) => (
                <tr key={notification.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                      {notification.title}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notification.message}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                    {new Date(notification.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', color: notification.expiresAt ? '#002349' : '#94a3b8', fontWeight: notification.expiresAt ? 500 : 400 }}>
                    {notification.expiresAt
                      ? new Date(notification.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Never"}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{
                      ...getStatusStyle(notification),
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {getStatusLabel(notification)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(notification)}
                        style={{
                          backgroundColor: '#002349',
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
                          minHeight: '44px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                        Edit
                      </button>
                      {notification.isActive === 1 ? (
                        <button
                          onClick={() => handleDeactivate(notification)}
                          style={{
                            backgroundColor: 'white',
                            color: '#d97706',
                            padding: '6px 12px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderRadius: '4px',
                            border: '1px solid #fde68a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            minHeight: '44px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility_off</span>
                          Hide
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(notification)}
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
                            minHeight: '44px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                          Show
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification)}
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
                          minHeight: '44px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Notifications Cards - Mobile */}
      <div className="admin-cards-mobile">
        {notifications.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
          }}>
            <EmptyState icon="notifications_off" message="No notifications found. Create one to get started." ctaLabel="Create Notification" onCtaClick={openAddModal} />
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="admin-card">
              <div className="admin-card__header">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                    {notification.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    {notification.message}
                  </div>
                </div>
                <span style={{
                  ...getStatusStyle(notification),
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {getStatusLabel(notification)}
                </span>
              </div>
              <div className="admin-card__row">
                <span style={{ fontWeight: 600 }}>Created:</span>
                <span>{new Date(notification.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {notification.expiresAt && (
                <div className="admin-card__row">
                  <span style={{ fontWeight: 600 }}>Expires:</span>
                  <span>{new Date(notification.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
              {/* Full card buttons - visible at sm+ */}
              <div className="admin-card__actions header-actions-full">
                <button
                  onClick={() => openEditModal(notification)}
                  style={{
                    flex: '1 1 auto',
                    backgroundColor: '#002349',
                    color: 'white',
                    padding: '10px 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '44px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  Edit
                </button>
                {notification.isActive === 1 ? (
                  <button
                    onClick={() => handleDeactivate(notification)}
                    style={{
                      flex: '1 1 auto',
                      backgroundColor: 'white',
                      color: '#d97706',
                      padding: '10px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: '6px',
                      border: '1px solid #fde68a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      minHeight: '44px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility_off</span>
                    Hide
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(notification)}
                    style={{
                      flex: '1 1 auto',
                      backgroundColor: '#059669',
                      color: 'white',
                      padding: '10px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      minHeight: '44px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                    Show
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notification)}
                  style={{
                    flex: '1 1 auto',
                    backgroundColor: 'white',
                    color: '#dc2626',
                    padding: '10px 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    minHeight: '44px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  Delete
                </button>
              </div>
              {/* Overflow menu - visible at <640px */}
              <div className="header-actions-overflow" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <OverflowMenu items={[
                  { label: 'Edit', icon: 'edit', onClick: () => openEditModal(notification) },
                  { label: notification.isActive === 1 ? 'Hide' : 'Show', icon: notification.isActive === 1 ? 'visibility_off' : 'visibility', onClick: () => notification.isActive === 1 ? handleDeactivate(notification) : handleActivate(notification) },
                  { label: 'Delete', icon: 'delete', onClick: () => handleDelete(notification), variant: 'danger' },
                ]} />
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
            Notification Tips
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            <strong style={{ color: '#059669' }}>Active</strong> notifications are visible to all users.
            <strong style={{ color: '#d97706' }}> Expired</strong> notifications are automatically hidden.
            Use <strong style={{ color: '#002349' }}>Hide</strong> to temporarily disable a notification without deleting it.
          </div>
        </div>
      </div>

      {/* Add/Edit Notification Modal */}
      {showModal && (
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
            maxWidth: '560px',
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
                {editingNotification ? "Edit Notification" : "Create Notification"}
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                {editingNotification ? "Update notification details" : "Create a new system-wide notification"}
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Title */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>
                  Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., System Maintenance Scheduled"
                  style={inputStyle}
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>
                  Message <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter the notification message..."
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {/* Expires At */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>
                  Expires At
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: '#64748b', marginLeft: '8px' }}>(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  style={inputStyle}
                />
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  Leave empty for notifications that don't expire.
                </p>
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
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {editingNotification ? "save" : "add_alert"}
                  </span>
                  {editingNotification ? "Update Notification" : "Create Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
