import React, { useState, useEffect, useCallback } from 'react'
import {
  Stethoscope,
  Plus,
  Phone,
  Mail,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Building,
  UserCheck,
  Search,
} from 'lucide-react'
import { doctorsApi } from '../api/doctors'
import Modal from '../components/ui/Modal'
import { SkeletonCard } from '../components/ui/LoadingSkeleton'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import ToastContainer from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { formatTime } from '../utils/formatters'

export default function DoctorsPage() {
  const { toasts, addToast, removeToast } = useToast()

  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Doctor Detail Slot info
  const [doctorSlots, setDoctorSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Add Doctor Form state
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    department: 'Outpatient Care',
    phone: '',
    email: '',
    is_available: true,
    working_hours_start: '09:00',
    working_hours_end: '17:00',
  })
  const [formErrors, setFormErrors] = useState({})

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await doctorsApi.list()
      const list = Array.isArray(res) ? res : (res?.items || res?.data || [])
      setDoctors(list)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load medical staff.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  // Toggle Doctor Availability
  const handleToggleAvailability = async (e, doctor) => {
    e.stopPropagation()
    const nextState = !doctor.is_available
    try {
      await doctorsApi.update(doctor.id, { is_available: nextState })
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctor.id ? { ...d, is_available: nextState } : d))
      )
      addToast(
        `Dr. ${doctor.name} marked as ${nextState ? 'Available' : 'Unavailable'}`,
        'success'
      )
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update availability status'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    }
  }

  // Open Detail Modal
  const openDoctorDetail = async (doctor) => {
    setSelectedDoctor(doctor)
    setIsDetailModalOpen(true)
    setLoadingSlots(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      const res = await doctorsApi.getSlots(doctor.id, today)
      const slots = Array.isArray(res) ? res : (res?.available_slots || res?.slots || [])
      setDoctorSlots(
        slots.length > 0
          ? slots
          : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30']
      )
    } catch {
      setDoctorSlots(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'])
    } finally {
      setLoadingSlots(false)
    }
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Doctor name is required'
    if (!formData.specialty.trim()) errs.specialty = 'Specialty is required'
    if (!formData.phone.trim()) errs.phone = 'Contact number is required'
    if (!formData.email.trim()) errs.email = 'Email address is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateDoctor = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await doctorsApi.create(formData)
      addToast('Doctor profile created successfully!', 'success')
      setIsAddModalOpen(false)
      fetchDoctors()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to register doctor profile.'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredDoctors = doctors.filter((doc) => {
    const q = search.toLowerCase()
    return (
      (doc.name || '').toLowerCase().includes(q) ||
      (doc.specialty || '').toLowerCase().includes(q) ||
      (doc.department || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Doctor Roster & Availability</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage practicing clinicians, specialties, work shifts, and consultation readiness.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              specialty: '',
              department: 'General Outpatient',
              phone: '',
              email: '',
              is_available: true,
              working_hours_start: '09:00',
              working_hours_end: '17:00',
            })
            setFormErrors({})
            setIsAddModalOpen(true)
          }}
          className="btn-primary text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Clinician</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinician by name, department, or specialty..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDoctors} />
      ) : filteredDoctors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Stethoscope}
            title="No clinicians found"
            description="No doctor profiles match your search criteria."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doctor) => {
            const initials = doctor.name
              ? doctor.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'DR'

            return (
              <div
                key={doctor.id}
                onClick={() => openDoctorDetail(doctor)}
                className="card p-5 hover:shadow-card-md transition-all duration-200 cursor-pointer flex flex-col justify-between border border-surface-200 hover:border-teal-300"
              >
                <div>
                  {/* Top Bar: Avatar & Availability Status Toggle */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold text-sm flex items-center justify-center shadow-sm">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">
                          Dr. {doctor.name}
                        </h3>
                        <p className="text-xs text-teal-600 font-medium">
                          {doctor.specialty || 'General Practitioner'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleAvailability(e, doctor)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                        doctor.is_available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Click to toggle availability"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          doctor.is_available ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {doctor.is_available ? 'On Duty' : 'Off Duty'}
                    </button>
                  </div>

                  {/* Doctor Info Details */}
                  <div className="space-y-2 text-xs text-slate-600 mb-4 bg-surface-50 p-3 rounded-lg border border-surface-200">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doctor.department || 'Outpatient Services'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doctor.phone || '+91 98000 00000'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {formatTime(doctor.working_hours_start || '09:00')} -{' '}
                        {formatTime(doctor.working_hours_end || '17:00')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Appointments Today indicator */}
                <div className="pt-3 border-t border-surface-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Today's Visits:</span>
                  <span className="font-bold text-slate-800 bg-surface-100 px-2.5 py-0.5 rounded-full">
                    {doctor.today_appointments_count ?? doctor.appointments_count ?? 0} booked
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Clinician Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Clinician Profile"
        subtitle="Register a new doctor into the clinic operations schedule"
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
              onClick={handleCreateDoctor}
              className="btn-primary text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Save Clinician'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Specialty *
              </label>
              <input
                type="text"
                placeholder="e.g. Cardiology"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="input-field"
              />
              {formErrors.specialty && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.specialty}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                placeholder="e.g. Internal Medicine"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
              {formErrors.phone && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="doctor@cloudcare.demo"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shift Start
              </label>
              <input
                type="time"
                value={formData.working_hours_start}
                onChange={(e) =>
                  setFormData({ ...formData, working_hours_start: e.target.value })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shift End
              </label>
              <input
                type="time"
                value={formData.working_hours_end}
                onChange={(e) =>
                  setFormData({ ...formData, working_hours_end: e.target.value })
                }
                className="input-field"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Doctor Detail & Today's Slots Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedDoctor ? `Dr. ${selectedDoctor.name}` : 'Doctor Profile'}
        subtitle={selectedDoctor?.specialty || 'Clinical Staff'}
        maxWidth="max-w-lg"
        footer={
          <button
            type="button"
            onClick={() => setIsDetailModalOpen(false)}
            className="btn-secondary text-sm"
          >
            Close
          </button>
        }
      >
        {selectedDoctor && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-50 border border-surface-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center">
                  {selectedDoctor.name?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Dr. {selectedDoctor.name}</h4>
                  <p className="text-xs text-slate-500">{selectedDoctor.department}</p>
                </div>
              </div>
              <span
                className={`badge ${
                  selectedDoctor.is_available
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {selectedDoctor.is_available ? 'On Duty' : 'Off Duty'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-surface-200">
                <p className="text-slate-400 mb-0.5">Contact Phone</p>
                <p className="font-semibold text-slate-800">{selectedDoctor.phone || '—'}</p>
              </div>
              <div className="p-3 rounded-lg border border-surface-200">
                <p className="text-slate-400 mb-0.5">Staff Email</p>
                <p className="font-semibold text-slate-800 truncate">{selectedDoctor.email || '—'}</p>
              </div>
              <div className="p-3 rounded-lg border border-surface-200">
                <p className="text-slate-400 mb-0.5">Working Hours</p>
                <p className="font-semibold text-slate-800">
                  {formatTime(selectedDoctor.working_hours_start || '09:00')} -{' '}
                  {formatTime(selectedDoctor.working_hours_end || '17:00')}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-surface-200">
                <p className="text-slate-400 mb-0.5">Today's Bookings</p>
                <p className="font-semibold text-teal-600">
                  {selectedDoctor.today_appointments_count ?? 0} patients scheduled
                </p>
              </div>
            </div>

            {/* Today's Available Slots Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Available Slots for Today
                </h5>
                <span className="text-[11px] text-slate-400">30 min intervals</span>
              </div>

              {loadingSlots ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : doctorSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {doctorSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 text-center text-xs font-semibold rounded-lg bg-teal-50 border border-teal-200 text-teal-700"
                    >
                      {formatTime(slot)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 text-center bg-surface-50 rounded-lg">
                  No open slots remain for this clinician today.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
