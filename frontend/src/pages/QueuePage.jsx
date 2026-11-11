import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Clock,
  Plus,
  RefreshCw,
  CheckCircle,
  PlayCircle,
  XCircle,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Stethoscope,
} from 'lucide-react'
import { queueApi } from '../api/queue'
import { appointmentsApi } from '../api/appointments'
import { doctorsApi } from '../api/doctors'
import { patientsApi } from '../api/patients'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import ToastContainer from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { formatTime } from '../utils/formatters'

export default function QueuePage() {
  const { toasts, addToast, removeToast } = useToast()

  const [queueItems, setQueueItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Modals & form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [todayAppointments, setTodayAppointments] = useState([])
  const [doctorsList, setDoctorsList] = useState([])
  const [patientsList, setPatientsList] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [addMode, setAddMode] = useState('from_appointment') // 'from_appointment' or 'walk_in'
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [walkInData, setWalkInData] = useState({
    patient_id: '',
    doctor_id: '',
    priority: 'Normal',
  })

  // Fetch current queue
  const fetchQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const res = await queueApi.list()
      const list = Array.isArray(res) ? res : (res?.items || res?.queue || res?.data || [])
      setQueueItems(list)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load queue lobby.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    const timer = setInterval(() => {
      fetchQueue(true)
    }, 20000) // Poll queue every 20 seconds
    return () => clearInterval(timer)
  }, [fetchQueue])

  // Load appointments & doctors when Add modal opens
  const openAddQueueModal = async () => {
    setIsAddModalOpen(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [appRes, docRes, patRes] = await Promise.all([
        appointmentsApi.list({ date: today }),
        doctorsApi.list(),
        patientsApi.list({ limit: 50 }),
      ])
      const apps = Array.isArray(appRes) ? appRes : (appRes?.items || appRes?.data || [])
      const docs = Array.isArray(docRes) ? docRes : (docRes?.items || docRes?.data || [])
      const pats = Array.isArray(patRes) ? patRes : (patRes?.items || patRes?.data || [])

      setTodayAppointments(apps)
      setDoctorsList(docs)
      setPatientsList(pats)

      if (apps.length > 0) setSelectedAppointmentId(apps[0].id)
      if (pats.length > 0 && docs.length > 0) {
        setWalkInData({
          patient_id: pats[0].id,
          doctor_id: docs[0].id,
          priority: 'Normal',
        })
      }
    } catch {
      // Handled silently
    }
  }

  // Handle Status Update (e.g. Waiting -> In Consultation -> Completed)
  const handleUpdateStatus = async (item, nextStatus) => {
    try {
      await queueApi.updateStatus(item.id, nextStatus)
      addToast(`Queue entry updated to "${nextStatus}"`, 'success')
      fetchQueue(true)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update queue status'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    }
  }

  // Handle adding patient to queue
  const handleAddToQueue = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (addMode === 'from_appointment') {
        const app = todayAppointments.find((a) => String(a.id) === String(selectedAppointmentId))
        await queueApi.addToQueue({
          appointment_id: Number(selectedAppointmentId) || selectedAppointmentId,
          patient_id: app?.patient_id || app?.patient?.id,
          doctor_id: app?.doctor_id || app?.doctor?.id,
          patient_name: app?.patient?.name || app?.patient_name,
          doctor_name: app?.doctor?.name || app?.doctor_name,
        })
      } else {
        const patient = patientsList.find((p) => String(p.id) === String(walkInData.patient_id))
        const doctor = doctorsList.find((d) => String(d.id) === String(walkInData.doctor_id))
        await queueApi.addToQueue({
          patient_id: Number(walkInData.patient_id) || walkInData.patient_id,
          doctor_id: Number(walkInData.doctor_id) || walkInData.doctor_id,
          patient_name: patient?.name,
          doctor_name: doctor?.name,
        })
      }

      addToast('Patient admitted to live queue!', 'success')
      setIsAddModalOpen(false)
      fetchQueue(true)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add to queue'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Queue metrics
  const waitingCount = queueItems.filter((i) => (i.status || '').toLowerCase() === 'waiting').length
  const inConsultCount = queueItems.filter(
    (i) => (i.status || '').toLowerCase().includes('consultation')
  ).length
  const completedTodayCount = queueItems.filter(
    (i) => (i.status || '').toLowerCase() === 'completed'
  ).length

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Outpatient Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active lobby monitoring, queue sequencing, and patient consultation progression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="btn-secondary text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openAddQueueModal}
            className="btn-primary text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Admit to Queue</span>
          </button>
        </div>
      </div>

      {/* Queue Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Waiting in Lobby
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{waitingCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Estimated avg ~12m wait</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-4 border-l-4 border-purple-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Consultation
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{inConsultCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Active with clinicians</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-4 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Today
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{completedTodayCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Successfully served</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Queue Table */}
      {loading ? (
        <div className="card p-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading live clinic queue...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchQueue} />
      ) : queueItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Lobby queue is clear"
            description="There are currently no patients waiting in the outpatient lobby."
            action={
              <button onClick={openAddQueueModal} className="btn-primary text-xs mt-2">
                Admit Patient to Queue
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-200">
              <thead className="bg-surface-50">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Queue #</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">Arrival / Appt</th>
                  <th className="px-5 py-3.5">Est. Wait</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Advance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 bg-white">
                {queueItems.map((item, idx) => {
                  const statusNorm = (item.status || '').toLowerCase()
                  const isWaiting = statusNorm === 'waiting'
                  const isInConsult = statusNorm.includes('consultation')
                  const isCompleted = statusNorm === 'completed'

                  return (
                    <tr key={item.id || idx} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy-800 text-teal-400 font-mono font-bold text-sm shadow-sm">
                          #{item.queue_number || idx + 1}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-sm">
                          {item.patient_name || item.patient?.name || 'Walk-in Patient'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.patient_phone || item.patient?.phone || 'No phone'}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-800">
                          Dr. {item.doctor_name || item.doctor?.name || 'Assigned Clinician'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.department || 'Outpatient Clinic'}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
                        <div>
                          Arrival: <span className="font-medium text-slate-800">{formatTime(item.arrival_time || '09:15')}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Appt: {formatTime(item.appointment_time || item.time || '09:30')}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ~{item.estimated_wait_minutes ?? 15} mins
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">estimate</span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status || 'Waiting'} />
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        {isWaiting && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'In Consultation')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold border border-purple-200 transition-colors"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Call to Room</span>
                          </button>
                        )}
                        {isInConsult && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'Completed')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Completed</span>
                          </button>
                        )}
                        {isCompleted && (
                          <span className="text-xs text-slate-400 italic">Discharged</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admit to Queue Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Admit Patient to Lobby Queue"
        subtitle="Issue queue token for an appointment or walk-in patient"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddToQueue}
              className="btn-primary text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Admitting...' : 'Issue Token'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddToQueue} className="space-y-4">
          <div className="flex border-b border-surface-200 mb-3">
            <button
              type="button"
              onClick={() => setAddMode('from_appointment')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                addMode === 'from_appointment'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              From Today's Bookings
            </button>
            <button
              type="button"
              onClick={() => setAddMode('walk_in')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                addMode === 'walk_in'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Ad-hoc / Walk-in
            </button>
          </div>

          {addMode === 'from_appointment' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Today's Appointment *
              </label>
              {todayAppointments.length > 0 ? (
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  className="input-field"
                >
                  {todayAppointments.map((app) => (
                    <option key={app.id} value={app.id}>
                      {formatTime(app.appointment_time || app.time)} — {app.patient?.name || app.patient_name} (Dr. {app.doctor?.name || app.doctor_name})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 bg-surface-50 rounded-lg">
                  No appointments registered for today. Use the walk-in tab instead.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient *
                </label>
                <select
                  value={walkInData.patient_id}
                  onChange={(e) => setWalkInData({ ...walkInData, patient_id: e.target.value })}
                  className="input-field"
                >
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assign Doctor *
                </label>
                <select
                  value={walkInData.doctor_id}
                  onChange={(e) => setWalkInData({ ...walkInData, doctor_id: e.target.value })}
                  className="input-field"
                >
                  {doctorsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialty || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
