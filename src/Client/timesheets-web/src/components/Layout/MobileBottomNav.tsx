import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../../auth/useAuth";

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = useMemo(() => {
    // Base items for all users
    const items = [
      { to: "/dashboard", icon: "dashboard", label: "Home" },
      { to: "/timesheets/weekly", icon: "schedule", label: "Time" },
      { to: "/timeoff/requests", icon: "pending_actions", label: "PTO" },
    ];

    // Role-specific fourth item
    if (user?.role === "Manager") {
      items.push({ to: "/manager/approve-pto", icon: "task_alt", label: "Approve" });
    } else if (user?.role === "Admin") {
      items.push({ to: "/admin/dashboard", icon: "admin_panel_settings", label: "Admin" });
    } else {
      items.push({ to: "/calendar", icon: "calendar_month", label: "Calendar" });
    }

    return items;
  }, [user?.role]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={`mobile-bottom-nav__item ${isActive(item.to) ? "mobile-bottom-nav__item--active" : ""}`}
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span className="mobile-bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export { MobileBottomNav };
