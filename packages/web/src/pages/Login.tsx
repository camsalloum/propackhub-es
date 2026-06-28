// Feature: es-ui-revamp (Phase 1.5 visual refresh) — premium Login screen.
//
// First-impression page. Visual choices:
// - Branded canvas: brand-tinted full-bleed background with a subtle
//   slow-drifting radial gradient mesh that uses --motion-feedback paced
//   movement; suppressed automatically under reduced motion.
// - Token-backed glass card (`.card` + accent-rim) sits centered, with a
//   refined logo mark and `.page-title` typography.
// - `useEntrance` lifts the card on mount (R13.3; no-op under reduced motion).
// - Auth submission + post-auth navigation behavior unchanged (R13.7); failure
//   stays on /login and retains inputs (R13.8).

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEntrance } from '../hooks/useEntrance';
import { apiClient } from '../lib/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);

  // Entrance animation for the login form (R13.3); no-op under reduced motion (R13.4).
  const { ref: formRef } = useEntrance<HTMLDivElement>({ distance: 12 });

  const [formData, setFormData] = useState({
    email: 'admin@propackhub.com',
    password: 'Pph654883!',
  });

  useEffect(() => {
    apiClient
      .getPebiSsoUrl()
      .then((r) => {
        if (r.enabled && r.url) setSsoUrl(r.url);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch {
      // useAuth surfaces error; we stay on /login (R13.8).
    }
  };

  return (
    <div className="auth-shell">
      {/* Decorative animated mesh — uses transform/opacity-friendly drift via
          background-position. Pointer-events:none so it never blocks input. */}
      <div className="auth-mesh" aria-hidden="true" />
      <div className="auth-mesh auth-mesh-2" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--accent-9)) 100%)',
              boxShadow: 'var(--elevation-3), inset 0 1px 0 rgb(255 255 255 / 0.25)',
            }}>
            <span className="font-display font-bold text-xl text-text-on-accent">ES</span>
          </div>
          <p className="eyebrow mb-2 text-accent-text">ProPackHub</p>
          <h1 className="font-display font-bold text-3xl lg:text-4xl tracking-tight text-text-primary">
            Estimation Studio
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Flexible-packaging cost estimation, refined.
          </p>
        </div>

        {/* Auth card */}
        <div ref={formRef} className="card relative" style={{ boxShadow: 'var(--elevation-4)' }}>
          <h2 className="section-title mb-1">Sign in</h2>
          <p className="text-sm text-text-secondary mb-6">Welcome back. Pick up where you left off.</p>

          {error && (
            <div className="mb-6 p-4 rounded-lg flex items-start space-x-3"
              style={{
                background: 'rgb(var(--color-danger-soft))',
                border: '1px solid rgb(var(--color-danger) / 0.3)',
              }}>
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="admin@propackhub.com"
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••••"
                className="input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          {ssoUrl && (
            <div className="mt-4">
              <a
                href={ssoUrl}
                className="btn-secondary w-full"
              >
                Sign in with ProPackHub
              </a>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-accent-text font-medium hover:underline"
              >
                Create one
              </button>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-8 text-center text-sm text-text-secondary">
          <p className="mb-2 eyebrow text-text-secondary/80">Demo access</p>
          <p className="font-mono text-xs">
            <code className="bg-accent-soft text-accent-text" style={{ padding: '2px 8px', borderRadius: '4px' }}>
              admin@propackhub.com
            </code>
            {' / '}
            <code className="bg-accent-soft text-accent-text" style={{ padding: '2px 8px', borderRadius: '4px' }}>
              Pph654883!
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
