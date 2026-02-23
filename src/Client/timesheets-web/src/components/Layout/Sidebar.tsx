import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

const Sidebar = () => {
  const { user } = useAuth();

  // Base navigation items for all users (using Material Symbols icon names)
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
    { to: "/admin/time-entries", label: "All Time Entries", icon: "schedule", roles: ["Admin"] },
    { to: "/admin/reports", label: "System Reports", icon: "analytics", roles: ["Admin"] },
  ];

  // Combine all nav items and filter based on user role
  const allNavItems = [...baseNavItems, ...managerNavItems, ...adminNavItems];
  const navItems = user
    ? allNavItems.filter(item => item.roles.includes(user.role))
    : baseNavItems;

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__title">AFH TimeSheets</div>
        <div className="sidebar__subtitle">HR Time & PTO</div>
      </div>

      {user && (
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "sidebar__link" + (isActive ? " sidebar__link--active" : "")
              }
            >
              <span className="material-symbols-outlined sidebar__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Support Box */}
      <div className="p-6 border-t border-slate-100">
        <div className="bg-gold/5 p-4 rounded-sm border border-gold/20">
          <p className="text-[10px] text-gold font-bold uppercase tracking-widest mb-1">Support</p>
          <p className="text-[12px] text-text-grey leading-relaxed">
            Need help with your PTO balance? Contact HR Support.
          </p>
        </div>
      </div>
    </aside>
  );
};

export { Sidebar };
