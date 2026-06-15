import { useState } from 'react';
import { Settings as SettingsIcon, Users, DollarSign, FileText, Globe } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'currency' | 'proposal'>('general');

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'team', name: 'Team & Visibility', icon: Users },
    { id: 'currency', name: 'Currency', icon: DollarSign },
    { id: 'proposal', name: 'Proposal Branding', icon: FileText },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Settings</h1>
        <p className="text-mist mt-2">Configure your Estimation Studio workspace</p>
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
                    defaultValue="My Packaging Business"
                    className="input w-full lg:w-96"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Default Markup %</label>
                  <input
                    type="number"
                    defaultValue="15"
                    className="input w-32"
                  />
                  <p className="text-sm text-mist mt-2">Applied to all new estimates unless overridden</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Default Slab Template</label>
                  <select className="input w-64">
                    <option>Standard 4-tier (1T/2T/5T/10T)</option>
                    <option>Small quantities (500/1000/2000 kg)</option>
                    <option>Large quantities (5T/10T/20T/50T)</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-border">
                  <button className="btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card">
              <h2 className="text-xl font-display font-semibold text-navy mb-6">Team & Visibility</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-semibold text-navy mb-4">Default Profile for New Users</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Structure & dimensions</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Material $/kg visibility</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Markup % & cost breakdown</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Operation/process costs</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <h3 className="font-display font-semibold text-navy mb-4">Team Members</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center">
                          <span className="font-display font-semibold text-navy">SA</span>
                        </div>
                        <div>
                          <p className="font-medium">Sarah Ahmed</p>
                          <p className="text-sm text-mist">sarah@example.com · Sales Rep</p>
                        </div>
                      </div>
                      <button className="text-sm text-gold font-medium hover:underline">
                        Customize visibility
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center">
                          <span className="font-display font-semibold text-navy">AM</span>
                        </div>
                        <div>
                          <p className="font-medium">Ahmed Mohamed</p>
                          <p className="text-sm text-mist">ahmed@example.com · Sales Rep</p>
                        </div>
                      </div>
                      <button className="text-sm text-gold font-medium hover:underline">
                        Customize visibility
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <button className="btn-primary">Save Changes</button>
                </div>
              </div>
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
                      <select className="input pl-10 w-48">
                        <option>AED - UAE Dirham</option>
                        <option>USD - US Dollar</option>
                        <option>EUR - Euro</option>
                        <option>GBP - British Pound</option>
                        <option>SAR - Saudi Riyal</option>
                        <option>INR - Indian Rupee</option>
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
                          defaultChecked
                          className="mr-2"
                        />
                        <label htmlFor="auto-rate" className="text-sm">Auto from web</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="manual-rate"
                          name="rate-source"
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
                          defaultValue="3.6725"
                          step="0.0001"
                          className="input w-32"
                        />
                        <span className="text-sm">AED</span>
                        <button className="text-sm text-gold font-medium hover:underline ml-4">
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
                      <FileText className="w-8 h-8 text-mist" />
                    </div>
                    <div>
                      <button className="btn-secondary text-sm">Upload Logo</button>
                      <p className="text-xs text-mist mt-2">PNG or SVG, max 2MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Primary Color</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-navy border border-border"></div>
                    <input
                      type="text"
                      defaultValue="#0F1F3D"
                      className="input font-mono w-32"
                    />
                    <span className="text-sm text-mist">Used for headers and accents</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Terms & Conditions</label>
                  <textarea
                    defaultValue="Prices are valid for 30 days from the date of this quotation. Minimum order quantity applies. Lead times may vary based on material availability."
                    rows={4}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Footer Text</label>
                  <textarea
                    defaultValue="My Packaging Business\n123 Business Street, Dubai, UAE\n+971 4 123 4567 | info@example.com"
                    rows={3}
                    className="input w-full"
                  />
                </div>

                <div className="pt-6 border-t border-border">
                  <button className="btn-primary">Save Changes</button>
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