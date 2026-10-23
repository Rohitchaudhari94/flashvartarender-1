import { useState } from 'react';
import { api } from '../api.js';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!form.subject.trim() || form.subject.trim().length < 3) {
      setError('Please enter a subject (at least 3 characters).');
      return;
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      setError('Please write a message (at least 10 characters).');
      return;
    }

    setBusy(true);
    try {
      await api.post('/contact', form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="contact-page-container">
      <header className="contact-hero">
        <div className="contact-badge-wrapper">
          <span className="contact-badge">
            <span className="contact-badge-dot" aria-hidden="true" />
            Editorial Room &middot; Direct Dispatch
          </span>
        </div>
        <h1 className="page-title contact-title">Send a Direct Message</h1>
        <p className="contact-subtitle">
          Have breaking news, investigative tips, press inquiries, or feedback? Reach out directly to the FlashVarta editorial room.
        </p>
      </header>

      <div className="contact-form-wrapper">
        <div className="contact-card">
          {sent ? (
            <div className="contact-success-card" role="status">
              <div className="contact-success-icon-wrap" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="contact-success-title">Message Sent Successfully!</h2>
              <p className="contact-success-desc">
                Thank you for reaching out to FlashVarta. Your message has been logged directly with our editorial desk. Our team will review and respond to your email shortly.
              </p>
              <button
                type="button"
                className="btn btn-outline contact-reset-btn"
                onClick={() => setSent(false)}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="contact-form">
              {/* Invisible spam honeypot field - bots fill it, humans do not */}
              <input
                type="text"
                name="hp_website"
                style={{ display: 'none', position: 'absolute', left: '-9999px', width: 0, height: 0 }}
                tabIndex={-1}
                autoComplete="off"
                value={form.hp_website || ''}
                onChange={(e) => setForm({ ...form, hp_website: e.target.value })}
                aria-hidden="true"
              />

              <div className="contact-card-header">
                <div className="contact-card-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="contact-card-header-text">
                  <h2 className="contact-card-title">Message Details</h2>
                  <p className="contact-card-sub">Fill out the fields below. All fields are required.</p>
                </div>
              </div>

              {error && (
                <div className="contact-error-alert" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="contact-grid-2">
                <div className="contact-field">
                  <label htmlFor="c-name" className="contact-label">
                    Full Name <span className="contact-req">*</span>
                  </label>
                  <input
                    id="c-name"
                    className="contact-input"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Aditi Sharma"
                    maxLength={100}
                    disabled={busy}
                    autoComplete="name"
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="c-email" className="contact-label">
                    Email Address <span className="contact-req">*</span>
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className="contact-input"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    disabled={busy}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="c-sub" className="contact-label">
                  Subject <span className="contact-req">*</span>
                </label>
                <input
                  id="c-sub"
                  className="contact-input"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Feedback, news inquiry, or story suggestion"
                  disabled={busy}
                />
              </div>

              <div className="contact-field">
                <div className="contact-label-row">
                  <label htmlFor="c-msg" className="contact-label">
                    Message <span className="contact-req">*</span>
                  </label>
                  <span className="contact-char-hint">Min. 10 characters</span>
                </div>
                <textarea
                  id="c-msg"
                  className="contact-input contact-textarea"
                  rows={6}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write your message here in detail (at least 10 characters)..."
                  disabled={busy}
                />
              </div>

              <button type="submit" className="contact-submit-btn" disabled={busy}>
                {busy ? (
                  <>
                    <span className="contact-btn-spinner" aria-hidden="true" />
                    <span>Sending message…</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </>
                )}
              </button>

              <div className="contact-security-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Direct encrypted dispatch &middot; Strictly confidential &middot; No spam</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
