import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { CallPage } from './pages/CallPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import TextProcessorPage from './pages/TextProcessorPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Sales Assistant...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/" element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            } />
            <Route path="/call" element={
              <AppLayout>
                <CallPage />
              </AppLayout>
            } />
            <Route path="/call/:id" element={
              <AppLayout>
                <CallPage />
              </AppLayout>
            } />
            <Route path="/documents" element={
              <AppLayout>
                <DocumentsPage />
              </AppLayout>
            } />
            <Route path="/analytics" element={
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            } />
            <Route path="/settings" element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            } />
            <Route path="/text-processor" element={
              <AppLayout>
                <TextProcessorPage />
              </AppLayout>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;