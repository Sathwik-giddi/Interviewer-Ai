import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import HRDashboard from './pages/HRDashboard'
import HRAnalytics from './pages/HRAnalytics'
import HRReports from './pages/HRReports'
import HRCandidates from './pages/HRCandidates'
import CandidateDashboard from './pages/CandidateDashboard'
import InterviewRoom from './pages/InterviewRoom'
import HRObserverRoom from './pages/HRObserverRoom'
import HRCampaignSessions from './pages/HRCampaignSessions'
import ReportView from './pages/ReportView'
import ProfilePage from './pages/ProfilePage'
import MockInterview from './pages/MockInterview'
import ATSReport from './pages/ATSReport'
import LinkRedirect from './pages/LinkRedirect'
import NotFound from './pages/NotFound'

function AppRoutes() {
  const { currentUser, userRole } = useAuth()

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Auth pages — redirect logged-in users */}
        <Route
          path="/login"
          element={
            currentUser
              ? <Navigate to={userRole === 'hr' ? '/hr' : '/candidate'} replace />
              : <Login />
          }
        />
        <Route
          path="/signup"
          element={
            currentUser
              ? <Navigate to={userRole === 'hr' ? '/hr' : '/candidate'} replace />
              : <Signup />
          }
        />

        {/* Dashboard redirect based on role */}
        <Route
          path="/dashboard"
          element={
            currentUser
              ? <Navigate to={userRole === 'hr' ? '/hr' : '/candidate'} replace />
              : <Navigate to="/login" replace />
          }
        />

        {/* Protected — HR only */}
        <Route path="/hr" element={<ProtectedRoute requiredRole="hr"><HRDashboard /></ProtectedRoute>} />
        <Route path="/hr/analytics" element={<ProtectedRoute requiredRole="hr"><HRAnalytics /></ProtectedRoute>} />
        <Route path="/hr/reports" element={<ProtectedRoute requiredRole="hr"><HRReports /></ProtectedRoute>} />
        <Route path="/hr/candidates" element={<ProtectedRoute requiredRole="hr"><HRCandidates /></ProtectedRoute>} />
        <Route path="/hr/campaign/:campaignId/sessions" element={<ProtectedRoute requiredRole="hr"><HRCampaignSessions /></ProtectedRoute>} />

        {/* Protected — Candidate only */}
        <Route path="/candidate" element={<ProtectedRoute requiredRole="candidate"><CandidateDashboard /></ProtectedRoute>} />

        {/* Protected — Any authenticated user */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/mock" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
        <Route path="/candidate/ats-report" element={<ProtectedRoute requiredRole="candidate"><ATSReport /></ProtectedRoute>} />
        <Route path="/report/:sessionId" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />

        {/* Interview room — OPEN (no auth required, supports link sharing) */}
        <Route path="/interview/:roomId" element={<InterviewRoom />} />

        {/* Link redirect — OPEN (validates link ID and redirects) */}
        <Route path="/link/:linkId" element={<LinkRedirect />} />

        {/* HR observer room — HR only */}
        <Route path="/observe/:campaignId" element={<ProtectedRoute requiredRole="hr"><HRObserverRoom /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}
