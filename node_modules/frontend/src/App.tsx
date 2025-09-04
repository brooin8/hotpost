import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Settings from './pages/Settings';
import AuthCallback from './pages/AuthCallback';
import AIAssistant from './pages/AIAssistant';
import EbayDiagnostics from './pages/EbayDiagnostics';
import EbayOAuthHandler from './components/EbayOAuthHandler';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  // Demo mode - bypass auth if no backend is available
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;
  
  return (isAuthenticated || isDemoMode) ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <EbayOAuthHandler />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Navigate to="/dashboard" />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <Layout>
                  <Products />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/import"
            element={
              <PrivateRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">CSV Import</h2>
                    <p className="mt-2 text-gray-600">Coming soon...</p>
                  </div>
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Layout>
                  <Settings />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <PrivateRoute>
                <Layout>
                  <AIAssistant />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/ebay-diagnostics" element={<EbayDiagnostics />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App
