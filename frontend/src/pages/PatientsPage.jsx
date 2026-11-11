import React, { useState, useEffect, useCallback } from 'react'
import {
  UserRound,
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Eye,
  Info,
  Clock,
  FileText,
  MapPin,
} from 'lucide-react'
import { patientsApi } from '../api/patients'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import StatusBadge from '../components/ui/StatusBadge'
import ErrorState from '../components/ui/ErrorState'
import ToastContainer from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { formatDate, formatTime } from '../utils/formatters'

export default function PatientsPage() {
  const { toasts, addToast, removeToast } = useToast()

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [patientDetails, setPatientDetails] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add Patient Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Other',
    address: '',
    blood_group: 'O+',
  })
  const [formErrors, setFormErrors] = useState({})

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page,
        limit: pageSize,
      }
      if (search.trim()) params.search = search.trim()

      const res = await patientsApi.list(params)
      const list = Array.isArray(res) ? res : (res?.items || res?.data || [])
      const total = res?.total !== undefined ? res.total : (res?.count !== undefined ? res.count : list.length)

      setPatients(list)
      setTotalCount(total)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load patients list.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Open Detail Modal & fetch appointment history for patient
  const openPatientDetail = async (patient) => {
    setSelectedPatient(patient)
    setIsDetailModalOpen(true)
    setLoadingDetails(true)
    try {
      const res = await patientsApi.get(patient.id)
      setPatientDetails(res)
    } catch {
      setPatientDetails(patient)
    } finally {
      setLoadingDetails(false)
    }
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Patient name is required'
    if (!formData.phone.trim()) errs.phone = 'Contact number is required'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreatePatient = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await patientsApi.create(formData)
      addToast('Patient registered successfully!', 'success')
      setIsAddModalOpen(false)
      fetchPatients()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to register patient.'
      addToast(typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Patient Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xs flex items-center justify-center">
            {row.name ? row.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-[11px] text-slate-400">ID: #{row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-slate-600 font-mono text-xs">
          {row.email || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <span className="text-slate-700 font-medium">
          {row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      render: (row) => (
        <span className="text-slate-600">
          {formatDate(row.date_of_birth || row.dob)}
        </span>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (row) => (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-slate-700">
          {row.gender || 'Other'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            openPatientDetail(row)
          }}
          className="p-1.5 rounded-md text-slate-500 hover:text-teal-600 hover:bg-surface-100 transition-colors"
          title="View Patient Records"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered medical histories, demographics, and outpatient visit logs.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              phone: '',
              date_of_birth: '1995-01-01',
              gender: 'Other',
              address: '',
              blood_group: 'O+',
            })
            setFormErrors({})
            setIsAddModalOpen(true)
          }}
          className="btn-primary text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register Patient</span>
        </button>
      </div>

      {/* Academic Disclaimer Callout */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          Academic System Notice: All patient identities, demographics, and records presented are synthetic and for demonstration only.
        </span>
      </div>

      {/* Search Input */}
      <div className="card p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or telephone number..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchPatients} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={patients}
            loading={loading}
            emptyTitle="No patient records found"
            emptyDescription="Register a patient or refine your search query."
            onRowClick={(row) => openPatientDetail(row)}
          />

          <Pagination
            currentPage={page}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Register Patient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Patient"
        subtitle="Create an outpatient record in CloudCare"
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
              onClick={handleCreatePatient}
              className="btn-primary text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Save Patient'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
              {formErrors.phone && <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="patient@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
              {formErrors.email && <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) =>
                  setFormData({ ...formData, date_of_birth: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input-field"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="input-field"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Residential Address
            </label>
            <input
              type="text"
              placeholder="Apartment, Street, City"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>
        </form>
      </Modal>

      {/* Patient Detail & Appointment History Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedPatient?.name || 'Patient Profile'}
        subtitle={`Patient ID #${selectedPatient?.id || ''}`}
        maxWidth="max-w-2xl"
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
        {selectedPatient && (
          <div className="space-y-5">
            {/* Demographic Info Card */}
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">Contact</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Email</p>
                  <p className="font-semibold text-slate-800 truncate">{selectedPatient.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Date of Birth</p>
                  <p className="font-semibold text-slate-800">
                    {formatDate(selectedPatient.date_of_birth || selectedPatient.dob)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Blood / Gender</p>
                  <p className="font-semibold text-slate-800">
                    {selectedPatient.blood_group || 'O+'} • {selectedPatient.gender || 'Other'}
                  </p>
                </div>
              </div>
            </div>

            {/* Appointment History */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Consultation History
                </h4>
                <span className="text-[11px] text-slate-400">Past & Upcoming Visits</span>
              </div>

              {loadingDetails ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading visit records...</div>
              ) : (
                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  {patientDetails?.appointments && patientDetails.appointments.length > 0 ? (
                    <div className="divide-y divide-surface-100 max-h-56 overflow-y-auto">
                      {patientDetails.appointments.map((app, idx) => (
                        <div
                          key={app.id || idx}
                          className="p-3 text-xs flex items-center justify-between hover:bg-surface-50"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">
                              {formatDate(app.appointment_date || app.date)} at{' '}
                              {formatTime(app.appointment_time || app.time)}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Dr. {app.doctor?.name || app.doctor_name || 'Assigned Clinician'} • {app.reason || 'Consultation'}
                            </p>
                          </div>
                          <StatusBadge status={app.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 text-center text-xs text-slate-500">
                      No appointment history recorded for this patient.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
