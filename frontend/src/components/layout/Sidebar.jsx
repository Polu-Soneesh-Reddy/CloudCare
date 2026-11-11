import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Stethoscope,
  Users,
  UserRound,
  BarChart3,
  Bell,
  Settings,
  X,
  Activity,
} from 'lucide-react'
import { notificationsApi } from '../../api/notifications'

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count periodically or on route change
  useEffect(() => {
    let isMounted = true
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.getUnreadCount()
        if (isMounted) {
          const count = typeof res === 'number' ? res : (res?.count ?? res?.unread_count ?? 0)
          setUnreadCount(count)
        }
      } catch {
        // Silent catch for background unread count fetch
      }
    }
    fetchUnread()
    const timer = setInterval(fetchUnread, 30000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [location.pathname])

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Appointments', path: '/appointments', icon: Calendar },
    { label: 'Doctors', path: '/doctors', icon: Stethoscope },
    { label: 'Live Queue', path: '/queue', icon: Users },
    { label: 'Patients', path: '/patients', icon: UserRound },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-navy-800 text-slate-200 flex flex-col border-r border-navy-700 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-navy-700/80">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-900/40 group-hover:bg-teal-500 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white">
                  Cloud<span className="text-teal-400">Care</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Clinic Operations
              </p>
            </div>
          </NavLink>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-navy-700/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white text-teal-700'
                        : 'bg-teal-500/20 text-teal-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom Version badge */}
        <div className="p-4 border-t border-navy-700/80">
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="font-medium">CloudCare</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-navy-700 text-teal-400 border border-navy-600">
              v1.0 Demo
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
