import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Users, DollarSign, FileText, Globe, Database } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useVisibilityProfile, VISIBILITY_KEYS } from '../hooks/useVisibilityProfile';

const Settings = () => {
  const { user } = useAuth();
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
  const [defaultSlabTemplate, setDefaultSlabTemplate] = useState('standard');
  const [displayCurrency, setDisplayCurrency] = useState('AED');
  const [useAutoFx, setUseAutoFx] = useState(true);
  const [exchangeRateUsdToDisplay, setExchangeRateUsdToDisplay] = useState<number>(3.6725);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#0F1F3D');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [footerText, setFooterText] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [customizeUserId, setCustomizeUserId] = useState<string | null>(null);
  const [customProfile, setCustomProfile] = useState<Record<string, boolean>>({});
  const { setPreviewPreset } = useVisibilityProfile(user?.role);

  const loadSettings = async () => {
    try {
      setSettingsError(null);
      const settings = await apiClient.getSettings();
      setTenantName(settings.name || '');
      setDisplayCurrency(settings.displayCurrency || 'AED');
      setExchangeRateUsdToDisplay(Number(settings.exchangeRateUsdToDisplay) || 1);
      setUseAutoFx(Boolean(settings.useAutoFx));
      setLogoUrl(settings.logo || undefined);
      setBrandPrimaryColor(settings.primaryColor || '#0F1F3D');
      setTermsAndConditions(settings.termsAndConditions || '');
      setFooterText((settings.footerText as string) || (settings.footer as string) || '');
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
      await apiClient.updateSettings({
        name: tenantName,
        displayCurrency,
        useAutoFx,
        exchangeRateUsdToDisplay,
        logo: logoUrl,
        primaryColor: brandPrimaryColor,
        termsAndConditions,
        footerText,
        defaultMarkupPercent: defaultMarkup,
        defaultSlabTemplate,
      });
      alert('Settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    }
  };

  const refreshFx = async () => {
    try {
      const resp = await apiClient.refreshFx();
      setExchangeRateUsdToDisplay(Number(resp.exchangeRateUsdToDisplay) || exchangeRateUsdToDisplay);
      alert('Exchange rate refreshed');
    } catch (err) {
      console.error('Failed to refresh fx', err);
      alert('Failed to refresh exchange rate');
    }
  };

  return (
    <div>
      <div className="mb-8">
        {isAdmin && (
          <Link
            to="/platform/master-data"
            className="card p-4 mb-6 flex items-center gap-3 hover:border-gold/40 transition-colors"
          >
            <Database className="w-6 h-6 text-gold shrink-0" />
            <div>
              <p className="font-medium text-navy">Master Data</p>
              <p className="text-sm text-mist">
                Platform materials, product types, units — changes sync to all tenants
              </p>
            </div>
          </Link>
        )}
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Settings</h1>
        <p className="text-mist mt-2">Configure your Estimation Studio workspace</p>
        {settingsError && (
          <div className="mt-4 card bg-red-50 border border-red-200 text-sm text-red-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{settingsError}</span>
            <button type="button" className="btn-secondary text-sm" onClick={loadSettings}>
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-navy mb-6">General Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Tenant Name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="input w-full lg:w-96"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Default Markup %</label>
                  <input
                    type="number"
                    value={defaultMarkup}
                    onChange={(e) => setDefaultMarkup(Number(e.target.value))}
                    className="input w-32"
                  />
                  <p className="text-sm text-mist mt-2">Applied to all new estimates unless overridden</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Default Slab Template</label>
                  <select value={defaultSlabTemplate} onChange={(e) => setDefaultSlabTemplate(e.target.value)} className="input w-64">
                    <option value="standard">Standard 4-tier (1T/2T/5T/10T)</option>
                    <option value="small">Small quantities (500/1000/2000 kg)</option>
                    <option value="large">Large quantities (5T/10T/20T/50T)</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-border">
                  <button onClick={() => saveSettings()} className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-navy mb-6">Team & Visibility</h2>
              {!isAdmin ? (
                <p className="text-mist text-sm">Only tenant admins can manage team visibility.</p>
              ) : teamLoading ? (
                <p className="text-mist text-sm">Loading team settings…</p>
              ) : (
                <div className="space-y-6">
                  {teamError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span>{teamError}</span>
                      <button type="button" className="btn-secondary text-sm" onClick={loadTeamSettings}>
                        Retry
                      </button>
                    </div>
                  )}
                  <div>
                    <h3 className="font-display font-semibold text-navy mb-4">Preview as user</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary text-sm" onClick={() => setPreviewPreset('sales_rep')}>
                        Preview as Sales rep
                      </button>
                      <button type="button" className="btn-secondary text-sm" onClick={() => setPreviewPreset(null)}>
                        Exit preview
                      </button>
                    </div>
                    <p className="text-xs text-mist mt-2">Opens estimate editor with sales rep visibility. Stored in session.</p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(visibilityPresets).map(([key, preset]) => (
                        <span key={key} className="text-xs px-3 py-1 bg-slate rounded-full text-ink">{preset.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-border">
                    <h3 className="font-display font-semibold text-navy mb-4">Team Members</h3>
                    {teamUsers.length === 0 && <p className="text-mist text-sm">No team members found.</p>}
                    <div className="space-y-4">
                      {teamUsers.map((member) => (
                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center">
                              <span className="font-display font-semibold text-navy">{member.displayName?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                              <p className="font-medium">{member.displayName}</p>
                              <p className="text-sm text-mist">{member.email} · {member.role}</p>
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
              <h2 className="text-xl font-display font-semibold text-navy mb-6">Currency Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Display Currency</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-mist" />
                      <select className="input pl-10 w-48" value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                        <option value="AED">AED - UAE Dirham</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="SAR">SAR - Saudi Riyal</option>
                        <option value="INR">INR - Indian Rupee</option>
                      </select>
                    </div>
                    <span className="text-sm text-mist">Material library always uses USD</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-navy mb-4">Exchange Rate</h3>
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

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">1 USD =</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={exchangeRateUsdToDisplay}
                          onChange={(e) => setExchangeRateUsdToDisplay(Number(e.target.value))}
                          step="0.0001"
                          className="input w-32"
                        />
                        <span className="text-sm">{displayCurrency}</span>
                        <button onClick={refreshFx} className="text-sm text-gold font-medium hover:underline ml-4">
                          Refresh now
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-mist">
                      Last updated: 11 Jun 2026, 09:15 UTC (auto)
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <p className="text-sm text-mist mb-4">
                    <strong>Note:</strong> Estimates snapshot the exchange rate at calculation time.
                    Changing rates here only affects new estimates and re-quotes.
                  </p>
                  <button className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proposal' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-navy mb-6">Proposal Branding</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Company Logo</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 h-16 bg-slate border border-dashed border-border rounded-lg flex items-center justify-center">
                      {logoUrl ? <img src={logoUrl} alt="logo" className="max-w-full max-h-full" /> : <FileText className="w-8 h-8 text-mist" />}
                    </div>
                    <div>
                      <button onClick={() => { const url = prompt('Enter logo URL'); if (url) setLogoUrl(url); }} className="btn-secondary text-sm">Upload Logo</button>
                      <p className="text-xs text-mist mt-2">PNG or SVG, max 2MB (URL or upload)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Primary Color</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-navy border border-border"></div>
                    <input
                      type="text"
                      value={brandPrimaryColor}
                      onChange={(e) => setBrandPrimaryColor(e.target.value)}
                      className="input font-mono w-32"
                    />
                    <span className="text-sm text-mist">Used for headers and accents</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Terms & Conditions</label>
                  <textarea
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={4}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Footer Text</label>
                  <textarea
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    rows={3}
                    className="input w-full"
                  />
                </div>

                <div className="pt-6 border-t border-border">
                  <button onClick={() => saveSettings()} className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;