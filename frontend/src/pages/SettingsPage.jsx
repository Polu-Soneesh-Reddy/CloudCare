import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Building2,
  Clock,
  Users,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { settingsApi } from '../api/settings'
import ErrorState from '../components/ui/ErrorState'
import ToastContainer from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'

export default function SettingsPage() {
  const { toasts, addToast, removeToast } = useToast()

  const [settings, setSettings] = useState({
    clinic_name: 'CloudCare City Central Medical Center',
    clinic_address: '104 Healthcare Boulevard, Bangalore, Karnataka',
    contact_email: 'support@cloudcare.demo',
    contact_phone: '+91 80 4000 1234',
    default_appointment_duration: 30,
    estimated_consultation_duration: 20,
    max_queue_size: 50,
    working_hours_start: '08:30',
    working_hours_end: '18:00',
    auto_notify_sms: true,
  })

  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState(null)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await settingsApi.getAll()
      if (res && typeof res === 'object') {
        // If array of { key, value }
        if (Array.isArray(res)) {
          const mapped = {}
          res.forEach((item) => {
            mapped[item.key] = item.value
          })
          setSettings((prev) => ({ ...prev, ...mapped }))
        } else {
          setSettings((prev) => ({ ...prev, ...res }))
        }
      }
    } catch (err) {
      // If endpoint returns error or not seeded yet, fallback to defaults
      console.warn('Could not load custom settings, using defaults.', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSaveSection = async (sectionKey, keys) => {
    setSavingSection(sectionKey)
    try {
      for (const key of keys) {
        await settingsApi.update(key, settings[key])
      }
      addToast(`Configuration saved successfully.`, 'success')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update settings.'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Clinic Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tune operational parameters, clinic working windows, and queue thresholds.
        </p>
      </div>

      {/* Demo Warning */}
      <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <span>
          Demo Environment: Modifications persist across the active session and demonstration database.
        </span>
      </div>

      {loading ? (
        <div className="card p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: Clinic Information */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-surface-200">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clinic Information</h3>
                <p className="text-[11px] text-slate-500">Legal facility name and public contact details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Clinic Legal Name
                </label>
                <input
                  type="text"
                  value={settings.clinic_name || ''}
                  onChange={(e) => handleChange('clinic_name', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Facility Address
                </label>
                <input
                  type="text"
                  value={settings.clinic_address || ''}
                  onChange={(e) => handleChange('clinic_address', e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.contact_email || ''}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Helpline / Phone
                  </label>
                  <input
                    type="text"
                    value={settings.contact_phone || ''}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-surface-200 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleSaveSection('clinic_info', [
                    'clinic_name',
                    'clinic_address',
                    'contact_email',
                    'contact_phone',
                  ])
                }
                disabled={savingSection === 'clinic_info'}
                className="btn-primary text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {savingSection === 'clinic_info' ? 'Saving...' : 'Save Clinic Info'}
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 2: Appointment Defaults */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-surface-200">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Appointment & Operating Windows</h3>
                <p className="text-[11px] text-slate-500">Working hours and standard slot durations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Consultation Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={settings.default_appointment_duration || 30}
                  onChange={(e) =>
                    handleChange('default_appointment_duration', Number(e.target.value))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Estimated Average Doctor Consultation (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.estimated_consultation_duration || 20}
                  onChange={(e) =>
                    handleChange('estimated_consultation_duration', Number(e.target.value))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Facility Shift Open Time
                </label>
                <input
                  type="time"
                  value={settings.working_hours_start || '08:30'}
                  onChange={(e) => handleChange('working_hours_start', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Facility Shift Close Time
                </label>
                <input
                  type="time"
                  value={settings.working_hours_end || '18:00'}
                  onChange={(e) => handleChange('working_hours_end', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-surface-200 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleSaveSection('appointment_defaults', [
                    'default_appointment_duration',
                    'estimated_consultation_duration',
                    'working_hours_start',
                    'working_hours_end',
                  ])
                }
                disabled={savingSection === 'appointment_defaults'}
                className="btn-primary text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {savingSection === 'appointment_defaults' ? 'Saving...' : 'Save Timing Defaults'}
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 3: Queue Settings */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-surface-200">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Queue & Waiting Lobby</h3>
                <p className="text-[11px] text-slate-500">Capacity limits and live lobby buffer sizes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Maximum Lobby Queue Capacity
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={settings.max_queue_size || 50}
                  onChange={(e) =>
                    handleChange('max_queue_size', Number(e.target.value))
                  }
                  className="input-field"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Threshold before alerting staff of overcrowding
                </p>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.auto_notify_sms)}
                    onChange={(e) => handleChange('auto_notify_sms', e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-surface-200 focus:ring-teal-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Simulate Automatic Patient SMS Alerts
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Emit system notifications when queue advances
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-surface-200 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  handleSaveSection('queue_settings', [
                    'max_queue_size',
                    'auto_notify_sms',
                  ])
                }
                disabled={savingSection === 'queue_settings'}
                className="btn-primary text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {savingSection === 'queue_settings' ? 'Saving...' : 'Save Queue Settings'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
