import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { MasterDataProvider } from './contexts/MasterDataContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EstimateEditor from './pages/EstimateEditor';
import TemplatePicker from './pages/TemplatePicker';
import EstimatesList from './pages/EstimatesList';
import CustomerDetail from './pages/CustomerDetail';
import CustomersList from './pages/CustomersList';
import Library from './pages/Library';
import Settings from './pages/Settings';
import StandardTemplates from './pages/StandardTemplates';
import MasterData from './pages/MasterData';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-mist">Loading...</p>
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
  );
}

export default App;