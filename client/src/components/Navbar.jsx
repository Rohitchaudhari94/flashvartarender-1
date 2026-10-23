import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import ThemeSwitcher from './ThemeSwitcher.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  // Close mobile drawer on route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('mobile-menu-active');
    } else {
      document.body.classList.remove('mobile-menu-active');
    }
    return () => {
      document.body.classList.remove('mobile-menu-active');
    };
  }, [menuOpen]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'primary_admin');

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <NavLink to="/news" className="nav-brand" aria-label="FlashVarta home" onClick={() => setMenuOpen(false)}>
          <Logo />
        </NavLink>

        {/* Desktop Navigation Links */}
        <nav className="nav-links desktop-nav" aria-label="Primary Navigation">
          <NavLink to="/news" end className={({ isActive }) => (isActive ? 'active' : '')}>
            News
          </NavLink>
          <NavLink to="/share-news" className={({ isActive }) => `nav-cta-share ${isActive ? 'active' : ''}`}>
            <span className="nav-share-icon" aria-hidden="true">📢</span>
            <span className="nav-share-text">Post News / Ad</span>
            <span className="nav-price-tag">₹49</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Admin
            </NavLink>
          )}

          <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active' : '')}>
            Contact
          </NavLink>
        </nav>

        {/* Desktop Right Section: Theme Selector + User */}
        <div className="nav-desktop-user">
          <ThemeSwitcher />

          {user ? (
            <div className="nav-user">
              <span className="avatar" aria-hidden="true">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="nav-user-meta">
                <span className="nav-name">{user.name}</span>
                {user.role === 'primary_admin' && (
                  <span className="badge badge-primary-admin" title="Primary Administrator">
                    Primary Admin
                  </span>
                )}
                {user.role === 'admin' && (
                  <span className="badge badge-admin" title="Administrator">
                    Admin
                  </span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : (
            <div className="nav-user">
              <NavLink to="/" className="btn btn-primary btn-sm">
                Sign In
              </NavLink>
            </div>
          )}
        </div>

        {/* Mobile Actions: Quick Theme Switcher + Hamburger */}
        <div className="nav-mobile-actions">
          <ThemeSwitcher />
          <button
            type="button"
            className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        </div>
      </div>

      {/* Render Mobile Drawer Navigation outside sticky .navbar using createPortal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {menuOpen && (
              <div
                className="nav-mobile-backdrop"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}

            <nav
              id="mobile-nav-drawer"
              className={`nav-mobile-drawer ${menuOpen ? 'open' : ''}`}
              aria-label="Mobile Navigation"
            >
              <div className="mobile-drawer-header">
                <Logo size={32} />
                <button
                  type="button"
                  className="mobile-drawer-close"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close navigation"
                >
                  ✕
                </button>
              </div>

              <div className="mobile-drawer-links">
                <NavLink
                  to="/news"
                  end
                  className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-icon" aria-hidden="true">📰</span> News Feed
                </NavLink>
                <NavLink
                  to="/share-news"
                  className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-icon" aria-hidden="true">📢</span> Post News &amp; Ads <span className="nav-price-tag-mobile">₹49</span>
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="nav-icon" aria-hidden="true">⚙️</span> Admin Desk
                  </NavLink>
                )}

                <NavLink
                  to="/contact"
                  className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-icon" aria-hidden="true">💬</span> Contact Us
                </NavLink>
              </div>

              {/* Mobile Drawer Theme Section */}
              <ThemeSwitcher variant="drawer" />

              <div className="mobile-drawer-footer">
                {user ? (
                  <div className="mobile-user-card">
                    <div className="mobile-user-info">
                      <span className="avatar avatar-md" aria-hidden="true">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="mobile-user-text">
                        <strong className="mobile-user-name">{user.name}</strong>
                        <span className="muted mobile-user-email">{user.email}</span>
                        {user.role === 'primary_admin' && (
                          <span className="badge badge-primary-admin">Primary Admin</span>
                        )}
                        {user.role === 'admin' && (
                          <span className="badge badge-admin">Admin</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-block btn-sm"
                      onClick={handleLogout}
                    >
                      Log Out
                    </button>
                  </div>
                ) : (
                  <div className="mobile-auth-cta">
                    <p className="muted mobile-cta-text">Sign in to read and publish stories</p>
                    <NavLink
                      to="/"
                      className="btn btn-primary btn-block"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign In / Register
                    </NavLink>
                  </div>
                )}
              </div>
            </nav>
          </>,
          document.body
        )}
    </header>
  );
}
