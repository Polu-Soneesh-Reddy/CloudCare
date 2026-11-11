import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { appointmentsApi } from '../api/appointments'
import { doctorsApi } from '../api/doctors'
import { patientsApi } from '../api/patients'
import DataTable from '../components/ui/DataTable'
import SearchFilter from '../components/ui/SearchFilter'
import Pagination from '../components/ui/Pagination'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ToastContainer from '../components/ui/Toast'
import ErrorState from '../components/ui/ErrorState'
import { useToast } from '../hooks/useToast'
import { formatDate, formatTime } from '../utils/formatters'

export default function AppointmentsPage() {
  const { toasts, addToast, removeToast } = useToast()

  // Data states
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [doctorsList, setDoctorsList] = useState([])
  const [patientsList, setPatientsList] = useState([])

  // Filtering & Pagination
  const [search, setSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states for New / Edit Appointment
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    duration_minutes: 30,
    status: 'Scheduled',
  })
  const [formErrors, setFormErrors] = useState({})
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Inline new patient creation inside appointment modal
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Other',
  })

  // Fetch appointments list
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page,
        limit: pageSize,
      }
      if (search.trim()) params.search = search.trim()
      if (selectedDoctor !== 'all') params.doctor_id = selectedDoctor
      if (selectedStatus !== 'all') params.status = selectedStatus
      if (selectedDate) params.date = selectedDate

      const res = await appointmentsApi.list(params)
      const list = Array.isArray(res) ? res : (res?.items || res?.data || [])
      const total = res?.total !== undefined ? res.total : (res?.count !== undefined ? res.count : list.length)

      setAppointments(list)
      setTotalCount(total)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load appointments.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, selectedDoctor, selectedStatus, selectedDate])

  // Load doctors and patients for dropdowns
  const loadReferenceData = useCallback(async () => {
    try {
      const [docsRes, patsRes] = await Promise.all([
        doctorsApi.list(),
        patientsApi.list({ limit: 100 }),
      ])
      const docs = Array.isArray(docsRes) ? docsRes : (docsRes?.items || docsRes?.data || [])
      const pats = Array.isArray(patsRes) ? patsRes : (patsRes?.items || patsRes?.data || [])
      setDoctorsList(docs)
      setPatientsList(pats)
    } catch {
      // Handled silently
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  // Fetch slots whenever doctor or date changes in form
  useEffect(() => {
    if (formData.doctor_id && formData.appointment_date) {
      let active = true
      const fetchSlots = async () => {
        setLoadingSlots(true)
        try {
          const res = await doctorsApi.getSlots(formData.doctor_id, formData.appointment_date)
          if (active) {
            const slots = Array.isArray(res) ? res : (res?.available_slots || res?.slots || [])
            setAvailableSlots(slots.length > 0 ? slots : [
              '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
              '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
            ])
          }
        } catch {
          if (active) {
            setAvailableSlots([
              '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
              '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
            ])
          }
        } finally {
          if (active) setLoadingSlots(false)
        }
      }
      fetchSlots()
      return () => { active = false }
    } else {
      setAvailableSlots([])
    }
  }, [formData.doctor_id, formData.appointment_date])

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      patient_id: patientsList[0]?.id || '',
      doctor_id: doctorsList[0]?.id || '',
      appointment_date: today,
      appointment_time: '09:00',
      reason: '',
      duration_minutes: 30,
      status: 'Scheduled',
    })
    setIsCreatingNewPatient(false)
    setFormErrors({})
    setIsCreateModalOpen(true)
  }

  const openEditModal = (app) => {
    setSelectedAppointment(app)
    setFormData({
      patient_id: app.patient_id || app.patient?.id || '',
      doctor_id: app.doctor_id || app.doctor?.id || '',
      appointment_date: app.appointment_date || app.date || '',
      appointment_time: app.appointment_time || app.time || '',
      reason: app.reason || '',
      duration_minutes: app.duration_minutes || 30,
      status: app.status || 'Scheduled',
    })
    setFormErrors({})
    setIsEditModalOpen(true)
  }

  const openDetailModal = (app) => {
    setSelectedAppointment(app)
    setIsDetailModalOpen(true)
  }

  const openCancelConfirm = (app) => {
    setSelectedAppointment(app)
    setIsCancelConfirmOpen(true)
  }

  // Handle Form Validation
  const validateForm = () => {
    const errs = {}
    if (!formData.patient_id && !isCreatingNewPatient) {
      errs.patient_id = 'Please select a patient'
    }
    if (isCreatingNewPatient && !newPatientData.name.trim()) {
      errs.patient_name = 'Patient name is required'
    }
    if (!formData.doctor_id) {
      errs.doctor_id = 'Please select a doctor'
    }
    if (!formData.appointment_date) {
      errs.appointment_date = 'Date is required'
    }
    if (!formData.appointment_time) {
      errs.appointment_time = 'Time is required'
    }
    if (!formData.reason.trim()) {
      errs.reason = 'Reason for consultation is required'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateAppointment = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      let finalPatientId = formData.patient_id

      // If user chose to create an inline patient
      if (isCreatingNewPatient) {
        const createdPat = await patientsApi.create(newPatientData)
        finalPatientId = createdPat.id
        await loadReferenceData()
      }

      await appointmentsApi.create({
        ...formData,
        patient_id: finalPatientId,
        doctor_id: Number(formData.doctor_id) || formData.doctor_id,
      })

      addToast('Appointment scheduled successfully!', 'success')
      setIsCreateModalOpen(false)
      fetchAppointments()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create appointment.'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateAppointment = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await appointmentsApi.update(selectedAppointment.id, {
        ...formData,
        doctor_id: Number(formData.doctor_id) || formData.doctor_id,
        patient_id: Number(formData.patient_id) || formData.patient_id,
      })

      addToast('Appointment updated successfully!', 'success')
      setIsEditModalOpen(false)
      fetchAppointments()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update appointment.'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return
    setIsSubmitting(true)
    try {
      await appointmentsApi.cancel(selectedAppointment.id)
      addToast('Appointment cancelled successfully.', 'success')
      setIsCancelConfirmOpen(false)
      fetchAppointments()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to cancel appointment.'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Table Columns
  const columns = [
    {
      key: 'patient',
      label: 'Patient',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface-100 border border-surface-200 text-slate-700 font-bold text-xs flex items-center justify-center">
            {row.patient?.name ? row.patient.name.charAt(0) : (row.patient_name ? row.patient_name.charAt(0) : 'P')}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.patient?.name || row.patient_name || 'Patient'}</p>
            <p className="text-[11px] text-slate-400">{row.patient?.phone || row.patient_phone || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'doctor',
      label: 'Doctor',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">Dr. {row.doctor?.name || row.doctor_name || '—'}</p>
          <p className="text-[11px] text-slate-500">{row.doctor?.specialty || row.specialty || 'General'}</p>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date & Time',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{formatDate(row.appointment_date || row.date)}</p>
          <p className="text-[11px] text-teal-600 font-medium">{formatTime(row.appointment_time || row.time)}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => (
        <span className="text-slate-600 max-w-[160px] truncate block" title={row.reason}>
          {row.reason || 'General Consultation'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDetailModal(row)}
            className="p-1.5 rounded-md text-slate-500 hover:text-teal-600 hover:bg-surface-100 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-surface-100 transition-colors"
            title="Edit Appointment"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openCancelConfirm(row)}
            disabled={row.status === 'Cancelled'}
            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-surface-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Cancel Appointment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule, modify, and track patient clinical consultations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4">
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search by patient name, doctor, or reason..."
          filters={[
            {
              label: 'All Doctors',
              value: selectedDoctor,
              onChange: setSelectedDoctor,
              options: doctorsList.map((d) => ({
                label: `Dr. ${d.name}`,
                value: String(d.id),
              })),
            },
            {
              label: 'All Statuses',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: [
                { label: 'Scheduled', value: 'Scheduled' },
                { label: 'Checked In', value: 'Checked In' },
                { label: 'In Consultation', value: 'In Consultation' },
                { label: 'Completed', value: 'Completed' },
                { label: 'Cancelled', value: 'Cancelled' },
                { label: 'No Show', value: 'No Show' },
              ],
            },
          ]}
          onReset={() => {
            setSearch('')
            setSelectedDoctor('all')
            setSelectedStatus('all')
            setSelectedDate('')
          }}
        />

        <div className="mt-3 pt-3 border-t border-surface-100 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Date Filter:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field max-w-[180px] py-1 text-xs"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear date
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchAppointments} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={appointments}
            loading={loading}
            emptyTitle="No appointments found"
            emptyDescription="There are no appointments matching your filter criteria."
            onRowClick={(row) => openDetailModal(row)}
          />

          <Pagination
            currentPage={page}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Appointment"
        subtitle="Book a consultation slot for an existing or new patient"
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-secondary text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAppointment}
              className="btn-primary text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          {/* Patient Selection or Inline Create */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Patient
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewPatient(!isCreatingNewPatient)}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                {isCreatingNewPatient ? '← Select Existing Patient' : '+ Register New Patient'}
              </button>
            </div>

            {isCreatingNewPatient ? (
              <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-xl space-y-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Patient full name"
                    value={newPatientData.name}
                    onChange={(e) =>
                      setNewPatientData({ ...newPatientData, name: e.target.value })
                    }
                    className="input-field"
                  />
                  {formErrors.patient_name && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.patient_name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newPatientData.phone}
                      onChange={(e) =>
                        setNewPatientData({ ...newPatientData, phone: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="patient@example.com"
                      value={newPatientData.email}
                      onChange={(e) =>
                        setNewPatientData({ ...newPatientData, email: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <select
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- Choose patient --</option>
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
                {formErrors.patient_id && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.patient_id}</p>
                )}
              </div>
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Doctor *
            </label>
            <select
              value={formData.doctor_id}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              className="input-field"
            >
              <option value="">-- Choose doctor --</option>
              {doctorsList.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} ({d.specialty || 'General'}) {d.is_available ? '• Available' : '• Off-duty'}
                </option>
              ))}
            </select>
            {formErrors.doctor_id && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.doctor_id}</p>
            )}
          </div>

          {/* Date & Time slot Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                min={todayStr}
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_date: e.target.value })
                }
                className="input-field"
              />
              {formErrors.appointment_date && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.appointment_date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Time Slot * {loadingSlots && '(Loading slots...)'}
              </label>
              <select
                value={formData.appointment_time}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_time: e.target.value })
                }
                className="input-field"
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatTime(slot)}
                    </option>
                  ))
                ) : (
                  <option value="09:00">09:00 AM</option>
                )}
              </select>
              {formErrors.appointment_time && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.appointment_time}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Symptoms *
            </label>
            <textarea
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Follow-up consultation, fever and joint pain, routine checkup"
              className="input-field"
            />
            {formErrors.reason && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.reason}</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Appointment"
        subtitle="Update consultation details or modify state"
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn-secondary text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateAppointment}
              className="btn-primary text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateAppointment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field font-medium"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Checked In">Checked In</option>
                <option value="In Consultation">In Consultation</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Doctor
              </label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                className="input-field"
              >
                {doctorsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_date: e.target.value })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={formData.appointment_time}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_time: e.target.value })
                }
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <textarea
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input-field"
            />
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Appointment Summary"
        subtitle={`Booking Reference #${selectedAppointment?.id || ''}`}
        maxWidth="max-w-md"
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
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200">
              <span className="text-xs text-slate-500 font-medium">Status</span>
              <StatusBadge status={selectedAppointment.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Patient</p>
                  <p className="font-semibold text-slate-900">
                    {selectedAppointment.patient?.name || selectedAppointment.patient_name || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAppointment.patient?.email || 'No email provided'} • {selectedAppointment.patient?.phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Assigned Clinician</p>
                  <p className="font-semibold text-slate-900">
                    Dr. {selectedAppointment.doctor?.name || selectedAppointment.doctor_name || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAppointment.doctor?.department || selectedAppointment.doctor?.specialty || 'General Medicine'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-xs text-slate-400">Scheduled Time</p>
                  <p className="font-semibold text-slate-900">
                    {formatDate(selectedAppointment.appointment_date || selectedAppointment.date)} at{' '}
                    {formatTime(selectedAppointment.appointment_time || selectedAppointment.time)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Duration: {selectedAppointment.duration_minutes || 30} minutes
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-surface-200">
                <p className="text-xs text-slate-400 mb-1">Reason for Visit</p>
                <p className="text-sm text-slate-700 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
                  {selectedAppointment.reason || 'None specified.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Cancel Appointment"
        message={`Are you sure you want to cancel the appointment for ${
          selectedAppointment?.patient?.name || selectedAppointment?.patient_name || 'this patient'
        }?`}
        confirmText="Cancel Appointment"
        dangerMode={true}
        loading={isSubmitting}
        onCancel={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelAppointment}
      />
    </div>
  )
}
