import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  FileText,
  Users,
  FolderOpen,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  PlusCircle,
  LayoutTemplate,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Estimates', href: '/estimates', icon: FileText },
    { name: 'Standard Templates', href: '/templates', icon: LayoutTemplate },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Raw Materials', href: '/library', icon: FolderOpen },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isEstimateEditor =
    location.pathname.startsWith('/estimate/') && !location.pathname.startsWith('/estimate/choose');

  const isNewQuotePicker =
    location.pathname === '/templates' && new URLSearchParams(location.search).get('new') === '1';

  const hideMobileBottomNav = isEstimateEditor || isNewQuotePicker;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const bottomNav = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Quotes', href: '/estimates', icon: FileText },
    { name: 'New', href: '/templates?new=1', icon: PlusCircle, accent: true },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'More', href: '#menu', icon: Menu },
  ];

  return (
    <div className="min-h-screen bg-slate">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-black/25"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[min(280px,85vw)] bg-white p-6 shadow-xl flex flex-col safe-area-pt">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-navy rounded-lg" />
                <span className="font-display font-bold text-xl text-navy">ES</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-11 h-11 flex items-center justify-center hover:bg-slate rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 min-h-[48px] rounded-lg transition-colors ${active ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'
                      }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              {user && (user.role === 'tenant_admin' || user.role === 'platform_admin') && (
                <Link
                  to="/platform/master-data"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 min-h-[48px] rounded-lg ${isActive('/platform/master-data') ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'
                    }`}
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium">Master Data</span>
                </Link>
              )}
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 min-h-[48px] rounded-lg text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <div className="lg:flex">
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-border lg:bg-white">
          <div className="flex items-center min-h-16 px-6 py-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-navy rounded-lg" />
              <div>
                <h1 className="font-display font-bold text-xl text-navy">Estimation Studio</h1>
                <p className="text-xs text-mist">Flexible Packaging Cost Estimator</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            {user && (user.role === 'tenant_admin' || user.role === 'platform_admin') && (
              <Link
                to="/platform/master-data"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${isActive('/platform/master-data') ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'
                  }`}
              >
                <FolderOpen className="w-5 h-5" />
                <span className="font-medium">Master Data</span>
              </Link>
            )}
          </nav>
          <div className="p-6 border-t border-border space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-navy/10 rounded-full flex items-center justify-center">
                <span className="font-display font-semibold text-navy">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{user?.displayName}</p>
                <p className="text-xs text-mist">{user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
          <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-border safe-area-pt">
            <div className="flex items-center justify-between h-14 px-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-11 h-11 flex items-center justify-center hover:bg-slate rounded-lg"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-navy rounded-lg" />
                <span className="font-display font-bold text-navy">ES</span>
              </div>
              <div className="w-11 h-11 bg-navy/10 rounded-full flex items-center justify-center">
                <span className="font-display font-semibold text-navy text-sm">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </header>

          <main className={`flex-1 p-4 lg:p-8 ${hideMobileBottomNav ? '' : 'pb-20 lg:pb-8'}`}>
            <Outlet />
          </main>

          {!hideMobileBottomNav && (
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border safe-area-pb">
              <div className="flex items-stretch justify-around">
                {bottomNav.map((item) => {
                  const Icon = item.icon;
                  if (item.href === '#menu') {
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="flex flex-col items-center justify-center flex-1 min-h-[56px] text-mist tap-target"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] mt-0.5 font-medium">{item.name}</span>
                      </button>
                    );
                  }
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex flex-col items-center justify-center flex-1 min-h-[56px] tap-target ${item.accent ? 'text-gold' : active ? 'text-gold' : 'text-mist'
                        }`}
                    >
                      <Icon className={`w-5 h-5 ${item.accent ? 'scale-110' : ''}`} />
                      <span className="text-[10px] mt-0.5 font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
