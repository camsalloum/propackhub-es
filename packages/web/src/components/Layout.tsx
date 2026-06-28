import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import QuickThemeSwitcher from './QuickThemeSwitcher';
import Overlay from './Overlay';
import RouteTransition from './RouteTransition';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Estimates', href: '/estimates', icon: FileText },
    { name: 'Templates', href: '/templates', icon: LayoutTemplate },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Raw Materials', href: '/library', icon: FolderOpen },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isEstimateEditor =
    location.pathname.startsWith('/estimate/') && !location.pathname.startsWith('/estimate/choose');

  const hideMobileBottomNav = isEstimateEditor;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const bottomNav = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Quotes', href: '/estimates', icon: FileText },
    { name: 'New', href: '/templates', icon: PlusCircle, accent: true },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'More', href: '#menu', icon: Menu },
  ];

  return (
    <div className="min-h-screen bg-surface-base text-text-primary relative">
      {/* Ambient gradient blobs that gently drift behind content for premium feel */}
      <div className="page-ambient" aria-hidden="true" />

      {/* Mobile hamburger drawer */}
      <Overlay
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        variant="drawer"
        labelledBy="mobile-drawer-title"
      >
        <div className="h-full w-[min(300px,85vw)] bg-surface-raised border-r border-border p-5 flex flex-col safe-area-pt lg:hidden"
          style={{ boxShadow: 'var(--elevation-4)' }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center brand-mark"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--accent-9)) 100%)',
                  boxShadow: 'var(--glow-accent)',
                }}
              >
                <span className="font-display font-bold text-base text-text-on-accent">ES</span>
              </div>
              <span id="mobile-drawer-title" className="font-display font-bold text-lg text-text-primary tracking-tight">
                Estimation Studio
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-11 h-11 flex items-center justify-center hover:bg-surface-base rounded-lg text-text-primary transition-colors"
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
                  aria-current={active ? 'page' : undefined}
                  data-active={active}
                  className="nav-item"
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-border space-y-3">
            <QuickThemeSwitcher placement="sidebar" />
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-danger hover:bg-danger-soft transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </Overlay>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-border lg:bg-surface-raised z-30">
          <div className="flex items-center min-h-16 px-5 py-5 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center brand-mark"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--accent-9)) 100%)',
                  boxShadow: 'var(--glow-accent)',
                }}
              >
                <span className="font-display font-bold text-base text-text-on-accent tracking-tight">ES</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-base text-text-primary tracking-tight leading-tight">
                  Estimation
                </h1>
                <p className="font-display font-bold text-base text-text-primary tracking-tight leading-tight">
                  Studio
                </p>
                <p className="text-[10px] text-text-secondary mt-0.5 tracking-wide">
                  Flexible Packaging Cost Estimator
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  data-active={active}
                  className="nav-item"
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <QuickThemeSwitcher placement="sidebar" />

            <div className="flex items-center gap-3 px-2 py-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-soft)) 0%, rgb(var(--accent-3)) 100%)',
                }}
              >
                <span className="font-display font-semibold text-sm text-accent-text">
                  {user?.displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate text-text-primary">{user?.displayName}</p>
                <p className="text-xs text-text-secondary truncate">{user?.role}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-danger hover:bg-danger-soft text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
          {/* Mobile header — sticky with backdrop blur */}
          <header className="lg:hidden sticky top-0 z-40 safe-area-pt"
            style={{
              backgroundColor: 'rgb(var(--color-surface-raised) / 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderBottom: '1px solid rgb(var(--color-border))',
            }}>
            <div className="flex items-center justify-between h-14 px-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-11 h-11 flex items-center justify-center hover:bg-surface-base rounded-lg text-text-primary transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/dashboard" className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--accent-9)) 100%)',
                  }}
                >
                  <span className="font-display font-bold text-xs text-text-on-accent">ES</span>
                </div>
                <span className="font-display font-bold text-text-primary tracking-tight">Studio</span>
              </Link>
              <div className="flex items-center gap-1">
                <QuickThemeSwitcher placement="header" compact />
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--color-accent-soft)) 0%, rgb(var(--accent-3)) 100%)',
                  }}
                >
                  <span className="font-display font-semibold text-accent-text text-sm">
                    {user?.displayName?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className={`flex-1 p-4 lg:p-8 ${hideMobileBottomNav ? '' : 'pb-20 lg:pb-8'} relative`}>
            <RouteTransition />
          </main>

          {/* Mobile bottom nav — glassy, refined */}
          {!hideMobileBottomNav && (
            <nav
              className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
              style={{
                backgroundColor: 'rgb(var(--color-surface-raised) / 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderTop: '1px solid rgb(var(--color-border))',
              }}
            >
              <div className="flex items-stretch justify-around">
                {bottomNav.map((item) => {
                  const Icon = item.icon;
                  if (item.href === '#menu') {
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="flex flex-col items-center justify-center flex-1 min-h-[56px] text-text-secondary tap-target transition-colors active:scale-95"
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
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex flex-col items-center justify-center flex-1 min-h-[56px] tap-target transition-all active:scale-95 ${
                        item.accent ? 'text-accent-text' : active ? 'text-accent-text' : 'text-text-secondary'
                      }`}
                    >
                      {active && !item.accent && (
                        <span
                          aria-hidden="true"
                          className="absolute top-0 h-1 w-10 rounded-b-full"
                          style={{
                            background: 'linear-gradient(90deg, rgb(var(--color-accent)) 0%, rgb(var(--accent-9)) 100%)',
                            boxShadow: '0 0 12px rgb(var(--color-accent) / 0.6)',
                          }}
                        />
                      )}
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
