import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeSwitcher({ variant = 'popover' }) {
  const { theme, setTheme, mode, toggleMode, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeThemeObj = themes.find((t) => t.id === theme) || themes[0];

  // In-drawer variant (for mobile navigation drawer)
  if (variant === 'drawer') {
    return (
      <div className="theme-drawer-panel">
        <div className="theme-drawer-header">
          <span className="theme-drawer-label">Theme Colors</span>
          <button
            type="button"
            className="theme-mode-toggle-btn"
            onClick={toggleMode}
            aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {mode === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className="theme-swatch-row" role="radiogroup" aria-label="Color themes">
          {themes.map((t) => {
            const isSelected = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`theme-swatch-btn ${isSelected ? 'active' : ''}`}
                style={{ '--swatch-color': t.color }}
                onClick={() => setTheme(t.id)}
                title={`${t.name} (${t.desc})`}
              >
                <span className="theme-swatch-dot" />
                <span className="theme-swatch-name">{t.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Popover variant (for Desktop & Header)
  return (
    <div className="theme-switcher-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`theme-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Customize theme colors and appearance"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span
          className="theme-trigger-swatch"
          style={{ backgroundColor: activeThemeObj.color }}
          aria-hidden="true"
        />
        <svg
          className="theme-trigger-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
        <span className="theme-trigger-text">Theme</span>
      </button>

      {isOpen && (
        <div className="theme-popover" role="dialog" aria-label="Theme Customization">
          <div className="theme-popover-header">
            <span className="theme-popover-title">5 Editorial Palettes</span>
            <button
              type="button"
              className="theme-popover-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close theme options"
            >
              ✕
            </button>
          </div>

          <div className="theme-popover-body">
            <div className="theme-palette-grid" role="radiogroup" aria-label="Select color theme">
              {themes.map((t) => {
                const isSelected = t.id === theme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`theme-card-option ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setTheme(t.id);
                    }}
                  >
                    <span
                      className="theme-color-preview"
                      style={{ backgroundColor: t.color }}
                      aria-hidden="true"
                    >
                      {isSelected && <span className="theme-check-icon">✓</span>}
                    </span>
                    <div className="theme-option-text">
                      <strong className="theme-option-name">{t.name}</strong>
                      <span className="theme-option-desc">{t.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="theme-popover-divider" />

            <div className="theme-mode-switch-row">
              <span className="theme-mode-label">
                Appearance Mode: <strong>{mode === 'dark' ? 'Dark' : 'Light'}</strong>
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm theme-mode-btn"
                onClick={toggleMode}
              >
                {mode === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
