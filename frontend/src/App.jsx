import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AppointmentsPage from './pages/AppointmentsPage'
import DoctorsPage from './pages/DoctorsPage'
import QueuePage from './pages/QueuePage'
import PatientsPage from './pages/PatientsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'

// 404 Page
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-5 text-teal-600 font-bold text-3xl">
        404
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        The clinical operations route you requested does not exist or has been relocated.
      </p>
      <Link to="/dashboard" className="btn-primary text-sm">
        Return to Dashboard
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Application Layout & Pages */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/new" element={<AppointmentsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
