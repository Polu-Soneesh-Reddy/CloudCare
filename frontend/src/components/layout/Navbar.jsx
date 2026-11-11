import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, ChevronRight, LogOut, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { notificationsApi } from '../../api/notifications'

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Notification count
  useEffect(() => {
    let active = true
    const checkCount = async () => {
      try {
        const res = await notificationsApi.getUnreadCount()
        if (active) {
          const count = typeof res === 'number' ? res : (res?.count ?? res?.unread_count ?? 0)
          setUnreadCount(count)
        }
      } catch {
        // silent
      }
    }
    checkCount()
    return () => {
      active = false
    }
  }, [location.pathname])

  // Generate breadcrumb from path
  const pathParts = location.pathname.split('/').filter(Boolean)
  const pageTitle = pathParts.length > 0
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : 'Dashboard'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')

  return (
    <header className="h-16 bg-white border-b border-surface-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-surface-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 hidden sm:inline">Platform</span>
          <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:inline" />
          <span className="font-semibold text-slate-800">{pageTitle}</span>
          {pathParts.length > 1 && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <span className="text-slate-500 capitalize">{pathParts[1]}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick actions & User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Academic Demo Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-[11px] font-medium text-teal-700">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Demo Environment</span>
        </div>

        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-surface-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-teal-600 rounded-full ring-2 ring-white" />
          )}
        </Link>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-100 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-navy-800 text-teal-400 font-semibold text-xs flex items-center justify-center border border-navy-700">
              {userInitial}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.name || user?.email?.split('@')[0] || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {user?.role || 'Staff / Ops'}
              </p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-card-md border border-surface-200 py-1.5 z-50 divide-y divide-surface-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-surface-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Account & Clinic Settings</span>
                </Link>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
