import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { MasterDataProvider } from './contexts/MasterDataContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { ThemeStatusToast } from './theme/ThemeStatusToast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EstimateEditor from './pages/EstimateEditor';
import TemplatePicker from './pages/TemplatePicker';
import EstimatesList from './pages/EstimatesList';
import CustomerDetail from './pages/CustomerDetail';
import CustomersList from './pages/CustomersList';
import Settings from './pages/Settings';
import StandardTemplates from './pages/StandardTemplates';
import MasterData from './pages/MasterData';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base relative overflow-hidden">
        <div className="auth-mesh" aria-hidden="true" />
        <div className="auth-mesh auth-mesh-2" aria-hidden="true" />
        <div className="text-center relative">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-5 brand-mark flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--accent-9)) 100%)',
              boxShadow: 'var(--glow-accent-strong)',
            }}
          >
            <span className="font-display font-bold text-lg text-text-on-accent">ES</span>
          </div>
          <div className="spinner h-6 w-6 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <ThemeStatusToast />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MasterDataProvider>
                <Layout />
              </MasterDataProvider>
            </ProtectedRoute>
          }
        >
          <Route path="" element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="estimate/choose" element={<TemplatePicker />} />
          <Route path="templates" element={<StandardTemplates />} />
          <Route path="my-templates" element={<Navigate to="/templates?tab=mine" replace />} />
          <Route
            path="templates/new"
            element={<Navigate to="/templates" replace />}
          />
          <Route path="estimate/new" element={<EstimateEditor />} />
          <Route path="estimate/:id" element={<EstimateEditor />} />
          <Route path="estimates" element={<EstimatesList />} />
          <Route path="customers" element={<CustomersList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="library" element={<MasterData />} />
          <Route path="settings" element={<Settings />} />
          <Route path="platform/master-data" element={<Navigate to="/library" replace />} />
          <Route path="platform/master-library" element={<Navigate to="/library" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;