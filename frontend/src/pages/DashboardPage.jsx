import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Stethoscope,
  Users,
  RefreshCw,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Bell,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { dashboardApi } from '../api/dashboard'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { SkeletonCard, SkeletonChart, SkeletonTable } from '../components/ui/LoadingSkeleton'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import { formatTime, formatDateTime } from '../utils/formatters'

const STATUS_COLORS = {
  Scheduled: '#94A3B8',
  'Checked In': '#F59E0B',
  Waiting: '#F59E0B',
  'In Consultation': '#8B5CF6',
  Completed: '#10B981',
  Cancelled: '#EF4444',
  'No Show': '#F97316',
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const fetchSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const res = await dashboardApi.getSummary()
      setData(res)
      setLastRefreshed(new Date())
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to connect to CloudCare backend. Please make sure the service is running.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(() => {
      fetchSummary(true)
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-7 w-48 bg-slate-200 animate-pulse rounded mb-2" />
            <div className="h-4 w-72 bg-slate-200 animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonChart height="h-72" />
          </div>
          <div>
            <SkeletonChart height="h-72" />
          </div>
        </div>
        <SkeletonTable rows={4} cols={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="Operations Dashboard Unavailable"
          message={error}
          onRetry={() => fetchSummary()}
        />
      </div>
    )
  }

  // Fallbacks / mapping for response structure
  const stats = data?.stats || data?.metrics || {
    today_total: data?.today_total ?? 0,
    waiting: data?.waiting ?? 0,
    in_consultation: data?.in_consultation ?? 0,
    completed: data?.completed ?? 0,
    cancelled: data?.cancelled ?? 0,
    available_doctors: data?.available_doctors ?? 0,
    avg_wait_time: data?.avg_wait_time ?? 0,
  }

  const trendData = data?.trend || data?.appointment_trend || []
  const statusBreakdown = data?.status_breakdown || data?.status_distribution || []
  const todayAppointments = data?.today_appointments || data?.appointments || []
  const queueItems = data?.queue || data?.current_queue || []
  const doctors = data?.doctors || data?.doctor_availability || []
  const notifications = data?.recent_notifications || data?.notifications || []

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time outpatient flow, queue capacity, and medical staff utilization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            className="btn-secondary text-xs px-3 py-1.5"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 6 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Total"
          value={stats.today_total ?? 0}
          icon={Calendar}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          subtitle="All booked slots"
        />
        <StatCard
          title="Waiting Queue"
          value={stats.waiting ?? 0}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="Checked in & waiting"
        />
        <StatCard
          title="In Consultation"
          value={stats.in_consultation ?? 0}
          icon={UserCheck}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          subtitle="Currently with doctor"
        />
        <StatCard
          title="Completed"
          value={stats.completed ?? 0}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="Discharged today"
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelled ?? 0}
          icon={XCircle}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          subtitle="Cancellations / No-shows"
        />
        <StatCard
          title="Available Doctors"
          value={stats.available_doctors ?? 0}
          icon={Stethoscope}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="On-duty clinicians"
        />
      </div>

      {/* Charts Section: Line Trend + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Appointment Trend (Last 7 Days)</h2>
              <p className="text-[11px] text-slate-500">Volume and completed visits over time</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    name="Appointments"
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0D9488' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No trend data recorded"
                description="Historical appointment data will appear once appointments are scheduled."
              />
            )}
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-800">Status Distribution</h2>
            <p className="text-[11px] text-slate-500">Current appointment state breakdown</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.name] || '#0D9488'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No status data"
                description="Statuses will appear as patient bookings occur."
              />
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Today's Appointments Table & Live Queue Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments (2 cols) */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Today's Appointment Schedule</h2>
              <p className="text-[11px] text-slate-500">Recent bookings scheduled for current session</p>
            </div>
            <Link
              to="/appointments"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-200">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5">Time</th>
                    <th className="pb-2.5">Patient</th>
                    <th className="pb-2.5">Doctor</th>
                    <th className="pb-2.5">Reason</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-xs">
                  {todayAppointments.slice(0, 5).map((app, idx) => (
                    <tr key={app.id || idx} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-2.5 font-semibold text-slate-700">
                        {formatTime(app.appointment_time || app.time)}
                      </td>
                      <td className="py-2.5 font-medium text-slate-900">
                        {app.patient?.name || app.patient_name || '—'}
                      </td>
                      <td className="py-2.5 text-slate-600">
                        Dr. {app.doctor?.name || app.doctor_name || '—'}
                      </td>
                      <td className="py-2.5 text-slate-500 max-w-[140px] truncate">
                        {app.reason || 'General Consultation'}
                      </td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={app.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No appointments scheduled today"
              description="New appointments booked will show up immediately."
            />
          )}
        </div>

        {/* Live Queue Widget (1 col) */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Current Queue</h2>
              <p className="text-[11px] text-slate-500">Live waiting lobby order</p>
            </div>
            <Link
              to="/queue"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {queueItems.length > 0 ? (
            <div className="space-y-2.5">
              {queueItems.slice(0, 4).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-navy-800 text-teal-400 font-bold text-xs flex items-center justify-center">
                      #{item.queue_number || idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {item.patient_name || item.patient?.name || 'Walk-in'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Dr. {item.doctor_name || item.doctor?.name || 'Assigned Staff'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={item.status} />
                    <p className="text-[10px] text-slate-400 mt-1">
                      ~{item.estimated_wait_minutes ?? 10}m est.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Queue is empty"
              description="No patients are currently waiting in the lobby."
            />
          )}
        </div>
      </div>

      {/* Row 4: Doctor Availability & Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Availability */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Doctor Roster & Status</h2>
              <p className="text-[11px] text-slate-500">Staff availability for consultations</p>
            </div>
            <Link
              to="/doctors"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              All Doctors <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {doctors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctors.slice(0, 4).map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="p-3 rounded-lg border border-surface-200 bg-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">
                      {doc.name ? doc.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Dr. {doc.name}</h4>
                      <p className="text-[10px] text-slate-500">{doc.specialty || 'General Practice'}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      doc.is_available ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'
                    }`}
                    title={doc.is_available ? 'Available' : 'Unavailable'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No doctors configured"
              description="Configure medical staff to enable roster tracking."
            />
          )}
        </div>

        {/* Recent Notifications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Operational Alerts</h2>
              <p className="text-[11px] text-slate-500">Recent system logs and status changes</p>
            </div>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              All Alerts <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-2.5">
              {notifications.slice(0, 3).map((notif, idx) => (
                <div
                  key={notif.id || idx}
                  className="p-3 rounded-lg bg-surface-50 border border-surface-200 flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{notif.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{notif.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(notif.created_at || notif.time)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No operational alerts"
              description="System updates and patient reminders will display here."
            />
          )}
        </div>
      </div>
    </div>
  )
}
