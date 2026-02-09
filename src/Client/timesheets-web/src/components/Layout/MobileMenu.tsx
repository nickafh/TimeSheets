import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const { user, logout } = useAuth();

  // Base navigation items for all users
  const baseNavItems = [
    { to: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["Employee", "Manager", "Admin"] },
    { to: "/timesheets/weekly", label: "Time Entries", icon: "calendar_today", roles: ["Employee", "Manager", "Admin"] },
    { to: "/timeoff/summary", label: "Time Off Summary", icon: "assessment", roles: ["Employee", "Manager", "Admin"] },
    { to: "/timeoff/requests", label: "Time Off Requests", icon: "history_edu", roles: ["Employee", "Manager", "Admin"] },
    { to: "/calendar", label: "Time Off Calendar", icon: "event_note", roles: ["Employee", "Manager", "Admin"] },
  ];

  // Manager-specific navigation items
  const managerNavItems = [
    { to: "/manager/dashboard", label: "Manager Dashboard", icon: "groups", roles: ["Manager", "Admin"] },
    { to: "/manager/team-time-entries", label: "Team Time Entries", icon: "list_alt", roles: ["Manager", "Admin"] },
    { to: "/manager/approve-pto", label: "Approve Team PTO", icon: "task_alt", roles: ["Manager", "Admin"] },
  ];

  // Admin-specific navigation items
  const adminNavItems = [
    { to: "/admin/dashboard", label: "Admin Dashboard", icon: "admin_panel_settings", roles: ["Admin"] },
    { to: "/admin/manage-users", label: "Manage Users", icon: "person", roles: ["Admin"] },
    { to: "/admin/notifications", label: "Notifications", icon: "campaign", roles: ["Admin"] },
    { to: "/admin/manage-holidays", label: "Manage Holidays", icon: "celebration", roles: ["Admin"] },
    { to: "/admin/reports", label: "System Reports", icon: "analytics", roles: ["Admin"] },
  ];

  // Combine and filter nav items
  const allNavItems = [...baseNavItems, ...managerNavItems, ...adminNavItems];
  const navItems = user
    ? allNavItems.filter(item => item.roles.includes(user.role))
    : baseNavItems;

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleNavClick = () => {
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`mobile-menu-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Slide-out menu */}
      <div className={`mobile-menu ${isOpen ? "open" : ""}`}>
        {/* Header with user info */}
        <div className="mobile-menu__header">
          <button className="mobile-menu__close" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
          </button>
          {user && (
            <>
              <p className="mobile-menu__user-name">{user.name}</p>
              <p className="mobile-menu__user-role">{user.role}</p>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="mobile-menu__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `mobile-menu__link ${isActive ? "mobile-menu__link--active" : ""}`
              }
              onClick={handleNavClick}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout button */}
        <button className="mobile-menu__logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </>
  );
};

export { MobileMenu };
