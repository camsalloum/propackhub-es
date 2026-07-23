// Feature: es-ui-revamp (Phase 1.5 visual refresh) — premium Login screen.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEntrance } from '../hooks/useEntrance';
import { apiClient } from '../lib/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const { ref: formRef } = useEntrance<HTMLDivElement>({ distance: 12 });

  const [formData, setFormData] = useState({
    email: 'admin@propackhub.com',
    password: 'Pph654883!',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('sso_error');
    if (code) {
      const messages: Record<string, string> = {
        handoff_failed: 'Sign-in with ProPackHub failed. Try again.',
        tenant_not_provisioned: 'Your company is not provisioned in Estimation Studio yet.',
        empty_tenant:
          'Your Estimation Studio workspace has no customers yet. Link to Interplast and sync PEBI customers, then try again.',
        user_not_provisioned: 'Your user is not provisioned in Estimation Studio yet.',
        missing_email: 'Sign-in token was missing an email address.',
      };
      setSsoError(messages[code] ?? 'Sign-in with ProPackHub failed.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

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
      // stay on /login
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-mesh" aria-hidden="true" />
      <div className="auth-mesh auth-mesh-2" aria-hidden="true" />

      <div className="relative w-full max-w-md z-10">
        <div ref={formRef} className="card relative" style={{ boxShadow: 'var(--elevation-4)' }}>
          <div className="text-center mb-6">
            <picture>
              <source srcSet="/uploads/logos/ES%20Logo.webp" type="image/webp" />
              <img
                src="/uploads/logos/ES%20Logo.PNG"
                alt="Estimation Studio"
                width={200}
                height={200}
                decoding="async"
                fetchPriority="high"
                className="mx-auto"
                style={{ width: 'auto', height: '112px', objectFit: 'contain' }}
              />
            </picture>
            <h1 className="font-display font-bold text-2xl tracking-tight text-text-primary mt-4">
              Packaging Cost
            </h1>
            <p className="text-sm text-text-secondary mt-1">Estimation Studio · ProPackHub</p>
          </div>

          <h2 className="section-title mb-1">Sign in</h2>
          <p className="text-sm text-text-secondary mb-6">Welcome back.</p>

          {ssoError && (
            <div
              className="mb-6 p-4 rounded-lg flex items-start space-x-3"
              style={{
                background: 'rgb(var(--color-danger-soft))',
                border: '1px solid rgb(var(--color-danger) / 0.3)',
              }}
            >
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{ssoError}</p>
            </div>
          )}

          {error && (
            <div
              className="mb-6 p-4 rounded-lg flex items-start space-x-3"
              style={{
                background: 'rgb(var(--color-danger-soft))',
                border: '1px solid rgb(var(--color-danger) / 0.3)',
              }}
            >
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

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
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
              <a href={ssoUrl} className="btn-secondary w-full">
                Sign in with ProPackHub
              </a>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-accent-text font-medium hover:underline"
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
