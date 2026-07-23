import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, DollarSign, FileText, Globe } from 'lucide-react';
import {
  DEFAULT_QUOTATION_FORMAT,
  parseQuotationFormat,
  type QuotationFormatPrefs,
  type OperatingCostMethod,
} from '@es/engine';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useVisibilityProfile, VISIBILITY_KEYS } from '../hooks/useVisibilityProfile';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { useEntrance } from '../hooks/useEntrance';
import { useDensity } from '../preferences/DensityProvider';
import { QuotationFormatCard } from '../features/settings/QuotationFormatCard';
import { OperatingCostSettingsFields } from '../features/settings/OperatingCostSettingsFields';

const Settings = () => {
  const { user, refreshTenant } = useAuth();
  // Single-play mount entrance for the settings content; no-op under reduced motion (R23.5).
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  // Density preference (Auto / Compact / Comfortable / Spacious); Auto is default.
  const { density, densities, setDensity } = useDensity();
  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'currency' | 'proposal'>('general');
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [visibilityPresets, setVisibilityPresets] = useState<Record<string, { name: string; profile: Record<string, boolean> }>>({});

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'team', name: 'Team & Visibility', icon: Users },
    { id: 'currency', name: 'Currency', icon: DollarSign },
    { id: 'proposal', name: 'Proposal Branding', icon: FileText },
  ];

  // Controlled settings state
  const [tenantName, setTenantName] = useState('');
  const [defaultMarkup, setDefaultMarkup] = useState<number>(15);
  const [operatingCostMethod, setOperatingCostMethod] = useState<OperatingCostMethod>('markup_over_rm');
  const [defaultProfitMarginPercent, setDefaultProfitMarginPercent] = useState(5);
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [useAutoFx, setUseAutoFx] = useState(true);
  /** Neutral until settings load — never flash a regional FX default (HARDCODING_AUDIT FX1). */
  const [exchangeRateUsdToDisplay, setExchangeRateUsdToDisplay] = useState<number>(1);
  const [fxLastUpdated, setFxLastUpdated] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#0F1F3D');
  /** Quotation PDF notice above letterhead footer (optional override). */
  const [quotationNotice, setQuotationNotice] = useState('');
  const [quotationFormat, setQuotationFormat] =
    useState<QuotationFormatPrefs>(DEFAULT_QUOTATION_FORMAT);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [fxRefreshError, setFxRefreshError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [customizeUserId, setCustomizeUserId] = useState<string | null>(null);
  const [customProfile, setCustomProfile] = useState<Record<string, boolean>>({});
  const { setPreviewPreset } = useVisibilityProfile(user?.role);

  /** True when auto-FX is on and rate is older than 24h (stale). */
  const isFxStale = useAutoFx && fxLastUpdated
    ? (Date.now() - new Date(fxLastUpdated).getTime()) > 24 * 60 * 60 * 1000
    : false;

  const loadSettings = async () => {
    try {
      setSettingsError(null);
      const settings = await apiClient.getSettings();
      setTenantName(settings.name || '');
      setDisplayCurrency(settings.displayCurrency || 'USD');
      setExchangeRateUsdToDisplay(Number(settings.exchangeRateUsdToDisplay) || 1);
      setUseAutoFx(Boolean(settings.useAutoFx));
      setFxLastUpdated(settings.exchangeRateUpdatedAt || null);
      setLogoUrl(settings.logo || undefined);
      setBrandPrimaryColor(settings.primaryColor || '#0F1F3D');
      setQuotationNotice(
        (settings.footerText as string) || (settings.footer as string) || ''
      );
      setQuotationFormat(parseQuotationFormat(settings.quotationFormat));
      // BUG-7: load defaultMarkup so Save doesn't overwrite with hardcoded default
      setDefaultMarkup(Number(settings.defaultMarkupPercent) || 15);
      setOperatingCostMethod(
        settings.operatingCostMethod === 'process_per_kg' ||
          settings.operatingCostMethod === 'fixed_per_group'
          ? settings.operatingCostMethod
          : 'markup_over_rm'
      );
      const profit = Number(settings.defaultProfitMarginPercent);
      setDefaultProfitMarginPercent(Number.isFinite(profit) ? profit : 5);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to load settings');
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadTeamSettings = async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const usersResp = await apiClient.getUsers();
      setTeamUsers(usersResp.users || []);
    } catch (err) {
      console.error('Failed to load team users:', err);
      setTeamError('Could not load team members');
    }
    try {
      const presets = await apiClient.getVisibilityPresets();
      setVisibilityPresets(presets || {});
    } catch (err) {
      console.error('Failed to load visibility presets:', err);
      setTeamError((prev) => prev || 'Could not load visibility presets');
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || activeTab !== 'team') return;
    loadTeamSettings();
  }, [activeTab, isAdmin]);

  const applyPresetToUser = async (userId: string, presetKey: string) => {
    const preset = visibilityPresets[presetKey];
    if (!preset) return;
    try {
      await apiClient.updateUserVisibility(userId, preset.profile);
      const usersResp = await apiClient.getUsers();
      setTeamUsers(usersResp.users || []);
      alert(`Applied "${preset.name}" to user`);
    } catch (err) {
      alert('Failed to update visibility');
    }
  };

  const saveSettings = async () => {
    try {
      if (!(Number(exchangeRateUsdToDisplay) > 0)) {
        setFxRefreshError('Set a positive USD→display exchange rate before saving.');
        return;
      }
      await apiClient.updateSettings({
        name: tenantName,
        displayCurrency,
        useAutoFx,
        exchangeRateUsdToDisplay,
        logo: logoUrl,
        primaryColor: brandPrimaryColor,
        footerText: quotationNotice,
        quotationFormat,
        defaultMarkupPercent: defaultMarkup,
        operatingCostMethod,
        defaultProfitMarginPercent,
      });
      // Keep AuthContext tenant in sync so EstimateEditor live calc uses the new method.
      try {
        await refreshTenant();
      } catch {
        /* settings saved; session refresh can retry on next navigation */
      }
      setFxRefreshError(null);
      alert('Settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    }
  };

  const refreshFx = async () => {
    try {
      setFxRefreshError(null);
      const resp = await apiClient.refreshFx();
      setExchangeRateUsdToDisplay(Number(resp.exchangeRateUsdToDisplay) || exchangeRateUsdToDisplay);
      setFxLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Failed to refresh fx', err);
      setFxRefreshError('Failed to fetch exchange rate — check your connection and try again.');
    }
  };

  return (
    <div ref={entranceRef}>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand">Settings</h1>
        <p className="text-text-secondary mt-2">Configure your Estimation Studio workspace</p>
        {settingsError && (
          <div className="mt-4 card bg-danger/10 border border-danger/30 text-sm text-danger flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{settingsError}</span>
            <button type="button" className="btn-secondary text-sm" onClick={loadSettings}>
              Retry
            </button>
          </div>
        )}
      </div>

      <nav
        className="flex flex-wrap gap-1.5 mb-6"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-micro ease-micro ${
                isActive
                  ? 'bg-accent/10 text-accent-text'
                  : 'bg-surface-raised text-text-primary hover:bg-surface-base'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </nav>

      {activeTab === 'general' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-brand mb-6">General Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-brand mb-2">Tenant Name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="input w-full lg:w-96"
                  />
                </div>

                <OperatingCostSettingsFields
                  displayCurrency={displayCurrency}
                  operatingCostMethod={operatingCostMethod}
                  defaultMarkup={defaultMarkup}
                  defaultProfitMarginPercent={defaultProfitMarginPercent}
                  onMethodChange={setOperatingCostMethod}
                  onMarkupChange={setDefaultMarkup}
                  onProfitMarginChange={setDefaultProfitMarginPercent}
                />

                <div className="pt-6 border-t border-border">
                  <ThemeSwitcher />
                </div>

                <div className="pt-6 border-t border-border">
                  <h3 className="font-display font-semibold text-brand mb-2">Density</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Auto fits laptop screens without browser zoom. Override only if you prefer a fixed size.
                  </p>
                  <div className="inline-flex flex-wrap rounded-lg border border-border p-1 bg-surface-base" role="radiogroup" aria-label="Interface density">
                    {densities.map((d) => {
                      const active = density === d;
                      const label = d.charAt(0).toUpperCase() + d.slice(1);
                      return (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => { void setDensity(d); }}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-micro ease-micro min-w-[5.5rem] ${
                            active
                              ? 'bg-surface-raised text-brand shadow-sm'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <button onClick={() => saveSettings()} className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-brand mb-6">Team & Visibility</h2>
              {!isAdmin ? (
                <p className="text-text-secondary text-sm">Only tenant admins can manage team visibility.</p>
              ) : teamLoading ? (
                <p className="text-text-secondary text-sm">Loading team settings…</p>
              ) : (
                <div className="space-y-6">
                  {teamError && (
                    <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span>{teamError}</span>
                      <button type="button" className="btn-secondary text-sm" onClick={loadTeamSettings}>
                        Retry
                      </button>
                    </div>
                  )}
                  <div>
                    <h3 className="font-display font-semibold text-brand mb-4">Preview as user</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary text-sm" onClick={() => setPreviewPreset('sales_rep')}>
                        Preview as Sales rep
                      </button>
                      <button type="button" className="btn-secondary text-sm" onClick={() => setPreviewPreset(null)}>
                        Exit preview
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">Opens estimate editor with sales rep visibility. Stored in session.</p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(visibilityPresets).map(([key, preset]) => (
                        <span key={key} className="text-xs px-3 py-1 bg-surface-base rounded-full text-text-primary">{preset.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-border">
                    <h3 className="font-display font-semibold text-brand mb-4">Team Members</h3>
                    {teamUsers.length === 0 && <p className="text-text-secondary text-sm">No team members found.</p>}
                    <div className="space-y-4">
                      {teamUsers.map((member) => (
                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-surface-base rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
                              <span className="font-display font-semibold text-brand">{member.displayName?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                              <p className="font-medium">{member.displayName}</p>
                              <p className="text-sm text-text-secondary">{member.email} · {member.role}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(visibilityPresets).map(([key, preset]) => (
                              <button
                                key={key}
                                onClick={() => applyPresetToUser(member.id, key)}
                                className="text-xs btn-secondary py-1 px-2"
                              >
                                {preset.name}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="text-xs btn-secondary py-1 px-2"
                              onClick={() => {
                                setCustomizeUserId(customizeUserId === member.id ? null : member.id);
                                setCustomProfile(member.visibilityProfile || visibilityPresets.sales_rep?.profile || {});
                              }}
                            >
                              Customize…
                            </button>
                          </div>
                          {customizeUserId === member.id && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              {VISIBILITY_KEYS.map((key) => (
                                <label key={key} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!customProfile[key]}
                                    onChange={(e) => setCustomProfile((p) => ({ ...p, [key]: e.target.checked }))}
                                  />
                                  {key.replace(/([A-Z])/g, ' $1')}
                                </label>
                              ))}
                              <button
                                type="button"
                                className="btn-primary col-span-full mt-2"
                                onClick={async () => {
                                  await apiClient.updateUserVisibility(member.id, customProfile);
                                  await loadTeamSettings();
                                  setCustomizeUserId(null);
                                }}
                              >
                                Save custom profile
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'currency' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-brand mb-6">Currency Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-brand mb-2">Display Currency</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                      <select className="input pl-10 w-48" value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                        <option value="AED">AED - UAE Dirham</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="SAR">SAR - Saudi Riyal</option>
                        <option value="INR">INR - Indian Rupee</option>
                      </select>
                    </div>
                    <span className="text-sm text-text-secondary">Material library always uses USD</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-brand mb-4">Exchange Rate</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="auto-rate"
                          name="rate-source"
                          checked={useAutoFx}
                          onChange={() => setUseAutoFx(true)}
                          className="mr-2"
                        />
                        <label htmlFor="auto-rate" className="text-sm">Auto from web</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="manual-rate"
                          name="rate-source"
                          checked={!useAutoFx}
                          onChange={() => setUseAutoFx(false)}
                          className="mr-2"
                        />
                        <label htmlFor="manual-rate" className="text-sm">Manual override</label>
                      </div>
                    </div>

                    {/* PRD §6.10 — stale-rate banner */}
                    {isFxStale && (
                      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                        <span>⚠ Exchange rate is more than 24h old.</span>
                        <button onClick={refreshFx} className="underline font-medium hover:no-underline">
                          Refresh now
                        </button>
                      </div>
                    )}
                    {fxRefreshError && (
                      <p className="text-sm text-danger">{fxRefreshError}</p>
                    )}
                    {!(Number(exchangeRateUsdToDisplay) > 0) && (
                      <p className="text-sm text-danger">
                        Exchange rate missing — set a positive rate (no silent AED default).
                      </p>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-brand mb-2">1 USD =</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={exchangeRateUsdToDisplay}
                          onChange={(e) => setExchangeRateUsdToDisplay(Number(e.target.value))}
                          step="0.0001"
                          className="input w-32"
                        />
                        <span className="text-sm">{displayCurrency}</span>
                        <button onClick={refreshFx} className="text-sm text-accent-text font-medium hover:underline ml-4">
                          Refresh now
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary">
                      {fxLastUpdated
                        ? `Last updated: ${new Date(fxLastUpdated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} (${useAutoFx ? 'auto' : 'manual'})`
                        : 'Rate not yet fetched — click Refresh now'}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <p className="text-sm text-text-secondary mb-4">
                    <strong>Note:</strong> Estimates snapshot the exchange rate at calculation time.
                    Changing rates here only affects new estimates and re-quotes.
                  </p>
                  {/* BUG-6: wire onClick so currency changes are actually persisted */}
                  <button onClick={() => saveSettings()} className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proposal' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-brand mb-6">Proposal Branding</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-brand mb-2">Company Logo</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 h-16 bg-surface-base border border-dashed border-border rounded-lg flex items-center justify-center">
                      {logoUrl ? <img src={logoUrl} alt="logo" className="max-w-full max-h-full" /> : <FileText className="w-8 h-8 text-text-secondary" />}
                    </div>
                    <div>
                      <button onClick={() => { const url = prompt('Enter logo URL'); if (url) setLogoUrl(url); }} className="btn-secondary text-sm">Upload Logo</button>
                      <p className="text-xs text-text-secondary mt-2">PNG or SVG, max 2MB (URL or upload)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand mb-2">Primary Color</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-brand border border-border"></div>
                    <input
                      type="text"
                      value={brandPrimaryColor}
                      onChange={(e) => setBrandPrimaryColor(e.target.value)}
                      className="input font-mono w-32"
                    />
                    <span className="text-sm text-text-secondary">Used for headers and accents</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand mb-2">
                    Quotation notice
                  </label>
                  <textarea
                    value={quotationNotice}
                    onChange={(e) => setQuotationNotice(e.target.value)}
                    rows={2}
                    className="input w-full"
                    placeholder="This is a system-generated quotation and does not require a signature."
                  />
                </div>

                <div className="pt-6 border-t border-border">
                  <QuotationFormatCard value={quotationFormat} onChange={setQuotationFormat} />
                </div>

                <div className="pt-6 border-t border-border">
                  <button onClick={() => saveSettings()} className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default Settings;
