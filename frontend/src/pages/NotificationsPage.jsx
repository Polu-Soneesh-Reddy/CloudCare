import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  CheckCheck,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  ShieldAlert,
  Search,
} from 'lucide-react'
import { notificationsApi } from '../api/notifications'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import ToastContainer from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { formatDateTime, getTypeColor } from '../utils/formatters'

export default function NotificationsPage() {
  const { toasts, addToast, removeToast } = useToast()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'unread', 'appointment', 'queue', 'system'

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (activeTab === 'unread') params.unread_only = true
      else if (['appointment', 'queue', 'system'].includes(activeTab)) {
        params.category = activeTab
      }

      const res = await notificationsApi.list(params)
      const list = Array.isArray(res) ? res : (res?.items || res?.data || [])
      setNotifications(list)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load notifications.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Mark single as read
  const handleMarkAsRead = async (notif) => {
    if (notif.is_read || notif.read) return
    try {
      await notificationsApi.markRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read: true } : n))
      )
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update notification'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read: true }))
      )
      addToast('All notifications marked as read.', 'success')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to mark all as read'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    }
  }

  const getCategoryIcon = (category, type) => {
    const cat = (category || type || '').toLowerCase()
    if (cat.includes('appointment')) return <Calendar className="w-4 h-4 text-teal-600" />
    if (cat.includes('queue')) return <Users className="w-4 h-4 text-purple-600" />
    if (cat.includes('alert') || cat.includes('warning') || cat.includes('error')) {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />
    }
    return <Info className="w-4 h-4 text-blue-600" />
  }

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification & Alert Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational reminders, dispatch logs, and queue milestone events.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          <CheckCheck className="w-4 h-4 text-teal-600" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Academic Disclaimer Callout */}
      <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <span>
          Simulation Notice: Notifications are generated within the platform demonstration. No real cellular SMS or external emails are dispatched.
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-200 pb-2">
        {[
          { key: 'all', label: 'All Notifications' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'appointment', label: 'Appointments' },
          { key: 'queue', label: 'Queue Lobby' },
          { key: 'system', label: 'System' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-surface-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-4 bg-slate-200 rounded" />
                <div className="w-3/4 h-3 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! No operational alerts require attention."
          />
        </div>
      ) : (
        <div className="card divide-y divide-surface-200 overflow-hidden">
          {notifications.map((notif) => {
            const isRead = notif.is_read || notif.read

            return (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif)}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  isRead ? 'bg-white hover:bg-surface-50/70' : 'bg-teal-50/20 hover:bg-teal-50/40'
                }`}
              >
                {/* Icon box */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isRead ? 'bg-surface-100' : 'bg-teal-100/70'
                  }`}
                >
                  {getCategoryIcon(notif.category, notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm tracking-tight truncate ${
                          isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-900'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDateTime(notif.created_at || notif.time)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`badge text-[10px] ${getTypeColor(notif.category || notif.type)}`}
                    >
                      {notif.category || notif.type || 'system'}
                    </span>
                    {notif.channel && (
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        via {notif.channel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
