import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import ThemeSwitcher from '../components/ThemeSwitcher.jsx';

const TICKER = ['World', 'Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health', 'Politics', 'Maharashtra'];

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }
  if (user) return <Navigate to="/news" replace />;

  const isLogin = mode === 'login';
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
        <aside className="auth-hero">
          <Logo size={46} />
          <div className="hero-copy">
            <p className="eyebrow">Khabar, pal bhar mein</p>
            <h1 className="hero-title">
              News at the
              <br />
              speed of a <em>flash.</em>
            </h1>
            <p className="hero-sub">
              Live headlines from across India, Maharashtra, and the world, plus original reporting published by the FlashVarta desk.
            </p>
          </div>
          <div className="ticker" aria-hidden="true">
            <div className="ticker-track">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i}>
                  {t} <i>&#9889;</i>
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-top-row">
              <div className="auth-mobile-logo">
                <Logo />
              </div>
              <div className="auth-theme-box">
                <ThemeSwitcher />
              </div>
            </div>

            <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Join FlashVarta'}</h2>
            <p className="auth-sub">
              {isLogin ? 'Log in with your email or admin identifier.' : 'Create a free reader account to start reading.'}
            </p>

            <form onSubmit={submit} noValidate>
              {!isLogin && (
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    className="input"
                    value={form.name}
                    onChange={set('name')}
                    autoComplete="name"
                    placeholder="Your name"
                    required
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="auth-identifier">
                  {isLogin ? 'Email or Login Identifier' : 'Email address'}
                </label>
                <input
                  id="auth-identifier"
                  type={isLogin ? 'text' : 'email'}
                  className="input"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete={isLogin ? 'username' : 'email'}
                  placeholder={isLogin ? 'you@example.com ' : 'you@example.com'}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    value={form.password}
                    onChange={set('password')}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder={isLogin ? 'Enter password' : 'At least 6 characters'}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="field">
                  <label htmlFor="confirm">Confirm password</label>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    value={form.confirm}
                    onChange={set('confirm')}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    required
                  />
                </div>
              )}

              {error && (
                <div className="alert alert-error" role="alert">
                  {error}
                </div>
              )}

              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
              </button>
            </form>

            <p className="auth-switch">
              {isLogin ? 'New to FlashVarta?' : 'Already have an account?'}{' '}
              <button type="button" className="link-btn" onClick={() => switchMode(isLogin ? 'register' : 'login')}>
                {isLogin ? 'Create an account' : 'Log in'}
              </button>
            </p>
          </div>
        </section>
      </div>
  );
}
