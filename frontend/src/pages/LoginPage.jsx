import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Activity,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const validate = () => {
    const newErrors = {}
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError(null)

    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify credentials.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail('admin@cloudcare.demo')
    setPassword('demo1234')
    setErrors({})
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-50">
      {/* Left Column: Branding Showcase */}
      <div className="md:w-1/2 bg-navy-900 text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/40">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Cloud<span className="text-teal-400">Care</span>
            </span>
          </div>

          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Healthcare Operations Platform
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Smarter Clinic Operations. <br />
              <span className="text-teal-400">Better Patient Flow.</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              A modern, data-driven platform designed to orchestrate outpatient queues,
              doctor scheduling, and operational visibility in real-time.
            </p>

            {/* Feature bullets */}
            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-navy-800 border border-navy-700 flex items-center justify-center text-teal-400 flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Dynamic Queue Orchestration</h4>
                  <p className="text-[11px] text-slate-400">Minimize patient waiting times with algorithmic scheduling.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-navy-800 border border-navy-700 flex items-center justify-center text-teal-400 flex-shrink-0 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Resource & Doctor Balancing</h4>
                  <p className="text-[11px] text-slate-400">Track doctor availability and consultation slots seamlessly.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-navy-800 border border-navy-700 flex items-center justify-center text-teal-400 flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Actionable Analytics</h4>
                  <p className="text-[11px] text-slate-400">Gain deep insights into completion and patient throughput.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10 text-xs text-slate-400 border-t border-navy-800 mt-8">
          <p className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            Designed for high-reliability clinical operations
          </p>
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full">
          <div className="text-left mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Sign In</h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your clinical credentials to access the operations console.
            </p>
          </div>

          {/* Demo Login Callout */}
          <div className="mb-6 p-4 rounded-xl bg-teal-50/70 border border-teal-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-teal-900 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  DEMO CREDENTIALS
                </p>
                <div className="text-xs text-teal-800 space-y-0.5 font-mono">
                  <p>Email: <span className="font-semibold text-slate-900">admin@cloudcare.demo</span></p>
                  <p>Password: <span className="font-semibold text-slate-900">demo1234</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                Auto-fill
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cloudcare.demo"
                  className={`input-field pl-9 ${errors.email ? 'border-rose-400 focus:ring-rose-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`input-field pl-9 pr-10 ${errors.password ? 'border-rose-400 focus:ring-rose-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 text-sm mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In to Console'
              )}
            </button>
          </form>

          {/* Academic disclaimer */}
          <div className="mt-8 pt-6 border-t border-surface-200 text-center">
            <p className="text-[11px] text-slate-400 leading-normal">
              This is a demonstration system for academic purposes only.
              <br />All medical data and accounts are synthetic.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
