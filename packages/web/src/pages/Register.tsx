// Feature: es-ui-revamp (Phase 1.5 visual refresh) — premium Register screen.
//
// Mirrors the Login refresh: branded shell with subtle mesh background,
// elevated card with accent rim, refined logo, fluid-scale page title.
// Account-creation behavior preserved verbatim (R14.7); on failure, inputs are
// retained and the error is surfaced (R14.8).

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';
import { useEntrance } from '../hooks/useEntrance';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const { ref: formRef } = useEntrance<HTMLDivElement>({ distance: 12 });

  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string }>>([
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'INR', name: 'Indian Rupee' },
  ]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    tenantName: '',
    displayCurrency: 'AED',
  });

  useEffect(() => {
    apiClient.getSupportedCurrencies().then(setCurrencies).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(
        formData.email,
        formData.password,
        formData.displayName,
        formData.tenantName,
        formData.displayCurrency,
      );
      navigate('/dashboard');
    } catch {
      // useAuth surfaces error; inputs preserved.
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-mesh" aria-hidden="true" />
      <div className="auth-mesh auth-mesh-2" aria-hidden="true" />

      <div ref={formRef} className="relative w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center gap-2 text-sm font-medium transition-colors duration-micro ease-micro"
          style={{ color: 'rgb(var(--color-accent))' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </button>

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
            Create your workspace
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Spin up Estimation Studio for your team in under a minute.
          </p>
        </div>

        <div className="card" style={{ boxShadow: 'var(--elevation-4)' }}>
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
              <label className="block text-sm font-medium text-text-primary mb-2">Your name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                placeholder="Jane Doe"
                className="input"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Workspace</label>
              <input
                type="text"
                name="tenantName"
                value={formData.tenantName}
                onChange={handleChange}
                required
                placeholder="My Company"
                className="input"
                autoComplete="organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@company.com"
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Display currency</label>
              <select
                name="displayCurrency"
                value={formData.displayCurrency}
                onChange={handleChange}
                className="input"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="input"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creating workspace…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-accent-text font-medium hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
