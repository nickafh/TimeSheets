import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { MobileMenu } from "./MobileMenu";

export const Topbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user initials for mobile avatar
  const getUserInitials = () => {
    if (!user?.name) return "??";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="topbar">
        {/* Logo */}
        <div className="header-logo-lockup">
          <img
            src="/afh-logo-white.png"
            alt="Atlanta Fine Homes Sotheby's International Realty"
            style={{ height: '40px', width: 'auto' }}
          />
        </div>

        {user && (
          <div className="flex items-center gap-10">
            {/* Desktop user info */}
            <div className="text-right">
              <p className="topbar__user-name">{user.name}</p>
              <p className="topbar__user-role">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="hover:bg-slate-100 transition-colors"
              style={{
                backgroundColor: 'white',
                color: '#002349',
                padding: '10px 20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              Logout
            </button>

            {/* Mobile user avatar and menu button */}
            <div className="mobile-user-avatar">
              {getUserInitials()}
            </div>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        )}
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};
