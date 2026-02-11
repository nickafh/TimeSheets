import { NavLink, useLocation } from "react-router-dom";

const MobileBottomNav = () => {
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", icon: "dashboard", label: "Dash" },
    { to: "/calendar", icon: "calendar_month", label: "Calendar" },
    { to: "/timeoff/requests", icon: "pending_actions", label: "Requests" },
    { to: "/timesheets/weekly", icon: "schedule", label: "Time" },
  ];

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
