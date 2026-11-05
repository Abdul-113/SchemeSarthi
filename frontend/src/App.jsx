import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './stores/userStore';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Eligibility from './pages/Eligibility';
import Profile from './pages/Profile';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import About from './pages/About';
import AutoFill from './pages/AutoFill';
import RiskCheck from './pages/RiskCheck';
import DiagnosisModal from './components/DiagnosisModal';

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public: Auth page — no Layout wrapper so it's full screen */}
        <Route path="/auth" element={<Auth />} />

        {/* All other routes share the Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />

              {/* Protected routes — require login */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/eligibility" element={<ProtectedRoute><Eligibility /></ProtectedRoute>} />
              <Route path="/risk-check" element={<ProtectedRoute><RiskCheck /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/:docId" element={<ProtectedRoute><DocumentDetail /></ProtectedRoute>} />
              <Route path="/autofill" element={<ProtectedRoute><AutoFill /></ProtectedRoute>} />
            </Routes>
            <DiagnosisModal />
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
