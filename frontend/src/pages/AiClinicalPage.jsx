import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Activity,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Info,
  ChevronRight,
  UserCheck,
} from 'lucide-react'
import { aiApi } from '../api/ai'

export default function AiClinicalPage() {
  const [activeTab, setActiveTab] = useState('triage') // 'triage' | 'noshow' | 'soap'

  // Queue insights state
  const [queueInsights, setQueueInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)

  // 1. Triage State
  const [triageForm, setTriageForm] = useState({
    patient_name: 'Alex Johnson',
    age: 48,
    symptoms_text: 'Sudden onset chest tightness radiating to left shoulder, shortness of breath, diaphoresis',
    pain_level: 8,
    systolic_bp: 168,
    diastolic_bp: 95,
    heart_rate: 112,
    oxygen_saturation: 93,
    temperature_c: 37.4,
    chronic_conditions_text: 'Hypertension, High Cholesterol',
  })
  const [triageResult, setTriageResult] = useState(null)
  const [triageLoading, setTriageLoading] = useState(false)

  // 2. No-Show State
  const [noShowForm, setNoShowForm] = useState({
    patient_age: 34,
    lead_time_days: 18,
    previous_appointments: 4,
    previous_no_shows: 2,
    slot_hour: 8,
    day_of_week: 'Friday',
    has_chronic_condition: false,
    reminders_sent: 0,
  })
  const [noShowResult, setNoShowResult] = useState(null)
  const [noShowLoading, setNoShowLoading] = useState(false)

  // 3. SOAP State
  const [soapForm, setSoapForm] = useState({
    patient_name: 'Eleanor Vance',
    patient_age: 52,
    chief_complaint: 'Persistent dry cough and low-grade evening fever for 5 days',
    symptoms_text: 'dry cough, fatigue, mild wheezing, evening fever',
    bp: '126/82',
    hr: 78,
    temp: '37.8 C',
    spo2: '96%',
    clinical_observations: 'Alert, oriented x3. Bilateral expiratory wheezing noted in lower lung bases. Pharynx clear.',
    duration_days: 5,
    known_allergies: 'Penicillin (mild cutaneous hives)',
  })
  const [soapResult, setSoapResult] = useState(null)
  const [soapLoading, setSoapLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load Queue Insights on mount
  const fetchQueueInsights = async () => {
    setLoadingInsights(true)
    try {
      const data = await aiApi.getQueueInsights()
      setQueueInsights(data)
    } catch {
      // Fallback fallback simulated payload if server database is empty
      setQueueInsights({
        total_active_queue: 3,
        estimated_avg_wait_minutes: 14,
        system_load_status: 'OPTIMAL',
        urgency_distribution: { EMERGENCY: 0, URGENT: 1, PRIORITY: 1, ROUTINE: 1 },
        bottlenecks: [],
        ai_recommendations: ['Queue pacing nominal. Routine consultations can proceed as scheduled.'],
      })
    } finally {
      setLoadingInsights(false)
    }
  }

  useEffect(() => {
    fetchQueueInsights()
  }, [])

  // Handle Triage Submit
  const handleTriageSubmit = async (e) => {
    if (e) e.preventDefault()
    setTriageLoading(true)
    try {
      const symptomsList = triageForm.symptoms_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const chronicList = triageForm.chronic_conditions_text
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      const payload = {
        patient_name: triageForm.patient_name,
        age: parseInt(triageForm.age) || 30,
        symptoms: symptomsList.length > 0 ? symptomsList : ['general malaise'],
        pain_level: parseInt(triageForm.pain_level) || 0,
        systolic_bp: triageForm.systolic_bp ? parseInt(triageForm.systolic_bp) : undefined,
        diastolic_bp: triageForm.diastolic_bp ? parseInt(triageForm.diastolic_bp) : undefined,
        heart_rate: triageForm.heart_rate ? parseInt(triageForm.heart_rate) : undefined,
        oxygen_saturation: triageForm.oxygen_saturation ? parseInt(triageForm.oxygen_saturation) : undefined,
        temperature_c: triageForm.temperature_c ? parseFloat(triageForm.temperature_c) : undefined,
        chronic_conditions: chronicList,
      }

      const res = await aiApi.evaluateTriage(payload)
      setTriageResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setTriageLoading(false)
    }
  }

  // Handle No-Show Predict Submit
  const handleNoShowSubmit = async (e) => {
    if (e) e.preventDefault()
    setNoShowLoading(true)
    try {
      const payload = {
        patient_age: parseInt(noShowForm.patient_age) || 35,
        lead_time_days: parseInt(noShowForm.lead_time_days) || 0,
        previous_appointments: parseInt(noShowForm.previous_appointments) || 0,
        previous_no_shows: parseInt(noShowForm.previous_no_shows) || 0,
        slot_hour: parseInt(noShowForm.slot_hour) || 10,
        day_of_week: noShowForm.day_of_week,
        has_chronic_condition: Boolean(noShowForm.has_chronic_condition),
        reminders_sent: parseInt(noShowForm.reminders_sent) || 0,
      }
      const res = await aiApi.predictNoShow(payload)
      setNoShowResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setNoShowLoading(false)
    }
  }

  // Handle SOAP Generate Submit
  const handleSoapSubmit = async (e) => {
    if (e) e.preventDefault()
    setSoapLoading(true)
    try {
      const symptomsList = soapForm.symptoms_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        patient_name: soapForm.patient_name,
        patient_age: parseInt(soapForm.patient_age) || 40,
        chief_complaint: soapForm.chief_complaint,
        symptoms: symptomsList.length > 0 ? symptomsList : ['cough'],
        vitals: {
          bp: soapForm.bp,
          hr: soapForm.hr,
          temp: soapForm.temp,
          spo2: soapForm.spo2,
        },
        clinical_observations: soapForm.clinical_observations,
        duration_days: parseInt(soapForm.duration_days) || 1,
        known_allergies: soapForm.known_allergies,
      }

      const res = await aiApi.generateSoapNote(payload)
      setSoapResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setSoapLoading(false)
    }
  }

  const copySoapToClipboard = () => {
    if (!soapResult) return
    const text = `CLINICAL CONSULTATION SOAP NOTE\n=================================\n\nSUBJECTIVE:\n${soapResult.subjective}\n\nOBJECTIVE:\n${soapResult.objective}\n\nASSESSMENT:\n${soapResult.assessment}\n\nPLAN:\n${soapResult.plan}\n\nFOLLOW-UP:\n${soapResult.follow_up_recommendation}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-teal-900 rounded-2xl p-6 text-white shadow-xl border border-teal-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-400/20 text-teal-300 border border-teal-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                CloudCare ML Engine v2.4
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              AI Clinical Center & Intelligent Decision Support
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Real-time Emergency Severity Index triage, machine-learning appointment no-show risk prediction, automated medical SOAP documentation, and dynamic queue load optimization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchQueueInsights}
              disabled={loadingInsights}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
              Refresh Queue Insights
            </button>
          </div>
        </div>

        {/* Real-time Dynamic Queue Micro-Bar */}
        {queueInsights && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
            <div>
              <span className="text-slate-400 block">Active In Queue</span>
              <span className="text-lg font-bold text-white">{queueInsights.total_active_queue} Patients</span>
            </div>
            <div>
              <span className="text-slate-400 block">Forecast Avg Wait</span>
              <span className="text-lg font-bold text-teal-300">~{queueInsights.estimated_avg_wait_minutes} mins</span>
            </div>
            <div>
              <span className="text-slate-400 block">Clinic Load Acuity</span>
              <span className={`text-lg font-bold ${
                queueInsights.system_load_status === 'OPTIMAL' ? 'text-emerald-400' :
                queueInsights.system_load_status === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {queueInsights.system_load_status}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Emergency / Urgent</span>
              <span className="text-lg font-bold text-rose-300">
                {(queueInsights.urgency_distribution?.EMERGENCY || 0) + (queueInsights.urgency_distribution?.URGENT || 0)} Flagged
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('triage')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'triage'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Clinical Symptom Triage (ESI)
        </button>

        <button
          onClick={() => setActiveTab('noshow')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'noshow'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          No-Show Predictor (ML Model)
        </button>

        <button
          onClick={() => setActiveTab('soap')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'soap'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          AI Consultation SOAP Synthesizer
        </button>
      </div>

      {/* TAB 1: TRIAGE */}
      {activeTab === 'triage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                Patient Triage & Urgency Evaluation
              </h2>
              <span className="text-xs text-slate-500">Heuristic ESI Acuity Engine</span>
            </div>

            <form onSubmit={handleTriageSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={triageForm.patient_name}
                    onChange={(e) => setTriageForm({ ...triageForm, patient_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. Alex Johnson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={triageForm.age}
                    onChange={(e) => setTriageForm({ ...triageForm, age: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    min="0"
                    max="125"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Presenting Symptoms (comma separated)
                </label>
                <textarea
                  rows="2"
                  value={triageForm.symptoms_text}
                  onChange={(e) => setTriageForm({ ...triageForm, symptoms_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. chest pain, shortness of breath, dizziness"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[11px] text-slate-400">Quick insert:</span>
                  {['Chest Pain', 'Shortness of Breath', 'High Fever', 'Migraine', 'Abdominal Cramps'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() =>
                        setTriageForm((prev) => ({
                          ...prev,
                          symptoms_text: prev.symptoms_text ? `${prev.symptoms_text}, ${preset}` : preset,
                        }))
                      }
                      className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-2 py-0.5 rounded text-slate-600 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pain Level Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Patient Pain Scale (0 = None, 10 = Worst Possible)
                  </label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    triageForm.pain_level >= 8 ? 'bg-rose-100 text-rose-700' :
                    triageForm.pain_level >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {triageForm.pain_level} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={triageForm.pain_level}
                  onChange={(e) => setTriageForm({ ...triageForm, pain_level: e.target.value })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Vitals Grid */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                  Point-of-Care Vitals (Optional but enhances acuity scoring)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={triageForm.systolic_bp}
                      onChange={(e) => setTriageForm({ ...triageForm, systolic_bp: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={triageForm.heart_rate}
                      onChange={(e) => setTriageForm({ ...triageForm, heart_rate: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      placeholder="75"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">SpO2 Oxygen (%)</label>
                    <input
                      type="number"
                      value={triageForm.oxygen_saturation}
                      onChange={(e) => setTriageForm({ ...triageForm, oxygen_saturation: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      placeholder="98"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={triageForm.temperature_c}
                      onChange={(e) => setTriageForm({ ...triageForm, temperature_c: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      placeholder="37.0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Known Chronic Conditions (comma separated)
                </label>
                <input
                  type="text"
                  value={triageForm.chronic_conditions_text}
                  onChange={(e) => setTriageForm({ ...triageForm, chronic_conditions_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. Asthma, Diabetes Type 2, Hypertension"
                />
              </div>

              <button
                type="submit"
                disabled={triageLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-700/20"
              >
                {triageLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating Clinical Acuity...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Run AI Triage Assessment
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5 space-y-4">
            {triageResult ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acuity Evaluation</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                    triageResult.urgency_tier === 'EMERGENCY' ? 'bg-rose-600 text-white animate-pulse' :
                    triageResult.urgency_tier === 'URGENT' ? 'bg-amber-500 text-white' :
                    triageResult.urgency_tier === 'PRIORITY' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'
                  }`}>
                    {triageResult.urgency_tier} TIER
                  </span>
                </div>

                {/* Score bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700">Urgency Acuity Index</span>
                    <span className="font-bold text-slate-900">{triageResult.urgency_score} / 100</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        triageResult.urgency_score >= 70 ? 'bg-rose-500' :
                        triageResult.urgency_score >= 45 ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${triageResult.urgency_score}%` }}
                    />
                  </div>
                </div>

                {/* Badges Info */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">Suggested Dept</span>
                    <span className="font-bold text-slate-900">{triageResult.suggested_department}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Queue Boost</span>
                    <span className="font-bold text-teal-700">+{triageResult.queue_priority_boost} Points</span>
                  </div>
                </div>

                {/* Red Flags Alert if present */}
                {triageResult.red_flags && triageResult.red_flags.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Critical Red Flags Detected
                    </div>
                    <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
                      {triageResult.red_flags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Immediate Care Actions */}
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                    Immediate Clinical Directives:
                  </span>
                  <div className="space-y-2">
                    {triageResult.immediate_care_actions.map((act, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-teal-50/60 p-2.5 rounded-lg border border-teal-100">
                        <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {triageResult.clinical_summary}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Awaiting Clinical Intake</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Fill in patient symptoms and vitals on the left and click 'Run AI Triage Assessment' to analyze urgency acuity.
                </p>
                <button
                  onClick={() => handleTriageSubmit()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Load & Evaluate Demo Profile
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NO-SHOW PREDICTOR */}
      {activeTab === 'noshow' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Appointment No-Show Behavioral Model
              </h2>
              <span className="text-xs text-slate-500">Logistic-Bayesian Inference</span>
            </div>

            <form onSubmit={handleNoShowSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Age</label>
                  <input
                    type="number"
                    value={noShowForm.patient_age}
                    onChange={(e) => setNoShowForm({ ...noShowForm, patient_age: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduling Lead Time ({noShowForm.lead_time_days} Days)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={noShowForm.lead_time_days}
                    onChange={(e) => setNoShowForm({ ...noShowForm, lead_time_days: e.target.value })}
                    className="w-full accent-teal-600 cursor-pointer mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Previous Appointments</label>
                  <input
                    type="number"
                    value={noShowForm.previous_appointments}
                    onChange={(e) => setNoShowForm({ ...noShowForm, previous_appointments: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Historical Missed / No-Shows</label>
                  <input
                    type="number"
                    value={noShowForm.previous_no_shows}
                    onChange={(e) => setNoShowForm({ ...noShowForm, previous_no_shows: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Day of Week</label>
                  <select
                    value={noShowForm.day_of_week}
                    onChange={(e) => setNoShowForm({ ...noShowForm, day_of_week: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot Hour (24h)</label>
                  <select
                    value={noShowForm.slot_hour}
                    onChange={(e) => setNoShowForm({ ...noShowForm, slot_hour: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="8">08:00 AM (Early Morning)</option>
                    <option value="10">10:00 AM (Mid-Morning)</option>
                    <option value="12">12:00 PM (Noon)</option>
                    <option value="14">02:00 PM (Afternoon)</option>
                    <option value="16">04:00 PM (Late Afternoon)</option>
                    <option value="18">06:00 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={noShowForm.has_chronic_condition}
                    onChange={(e) => setNoShowForm({ ...noShowForm, has_chronic_condition: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  Has Active Chronic Condition
                </label>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Reminders Sent Count</label>
                  <input
                    type="number"
                    value={noShowForm.reminders_sent}
                    onChange={(e) => setNoShowForm({ ...noShowForm, reminders_sent: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                    min="0"
                    max="5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={noShowLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-700/20"
              >
                {noShowLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating ML Probabilities...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Predict No-Show Likelihood
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {noShowResult ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prediction Outcome</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    noShowResult.risk_tier === 'HIGH' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    noShowResult.risk_tier === 'MODERATE' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {noShowResult.risk_tier} RISK
                  </span>
                </div>

                <div className="text-center py-2">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    {noShowResult.no_show_probability}%
                  </span>
                  <span className="block text-xs font-medium text-slate-500 mt-1">
                    Estimated Probability of Patient Missing Appointment
                  </span>
                  <span className="inline-block mt-2 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Model Confidence: {Math.round(noShowResult.confidence_score * 100)}%
                  </span>
                </div>

                {/* Factors */}
                <div className="space-y-3">
                  {noShowResult.risk_factors.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                        Primary Risk Drivers:
                      </span>
                      <ul className="text-xs text-rose-600 space-y-1 list-disc list-inside bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
                        {noShowResult.risk_factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {noShowResult.protective_factors.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                        Attendance Stabilizers:
                      </span>
                      <ul className="text-xs text-emerald-600 space-y-1 list-disc list-inside bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                        {noShowResult.protective_factors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actionable Interventions */}
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                    Recommended Clinic Mitigations:
                  </span>
                  <div className="space-y-2">
                    {noShowResult.recommended_interventions.map((inv, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <ChevronRight className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>{inv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Ready for Prediction</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Adjust lead time and attendance history sliders to assess no-show probability and suggested preventative interventions.
                </p>
                <button
                  onClick={() => handleNoShowSubmit()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Run Baseline Prediction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SOAP CONSULTATION NOTE */}
      {activeTab === 'soap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Clinical Encounter Synthesizer
              </h2>
              <span className="text-xs text-slate-500">Structured Medical Documentation</span>
            </div>

            <form onSubmit={handleSoapSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    value={soapForm.patient_name}
                    onChange={(e) => setSoapForm({ ...soapForm, patient_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age & Duration (Days)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={soapForm.patient_age}
                      onChange={(e) => setSoapForm({ ...soapForm, patient_age: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="Age"
                    />
                    <input
                      type="number"
                      value={soapForm.duration_days}
                      onChange={(e) => setSoapForm({ ...soapForm, duration_days: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      placeholder="Days"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint</label>
                <input
                  type="text"
                  value={soapForm.chief_complaint}
                  onChange={(e) => setSoapForm({ ...soapForm, chief_complaint: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reported Symptoms</label>
                <input
                  type="text"
                  value={soapForm.symptoms_text}
                  onChange={(e) => setSoapForm({ ...soapForm, symptoms_text: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] text-slate-500">BP</label>
                  <input
                    type="text"
                    value={soapForm.bp}
                    onChange={(e) => setSoapForm({ ...soapForm, bp: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">HR (bpm)</label>
                  <input
                    type="text"
                    value={soapForm.hr}
                    onChange={(e) => setSoapForm({ ...soapForm, hr: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Temp</label>
                  <input
                    type="text"
                    value={soapForm.temp}
                    onChange={(e) => setSoapForm({ ...soapForm, temp: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">SpO2</label>
                  <input
                    type="text"
                    value={soapForm.spo2}
                    onChange={(e) => setSoapForm({ ...soapForm, spo2: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physician Physical Examination Observations
                </label>
                <textarea
                  rows="2"
                  value={soapForm.clinical_observations}
                  onChange={(e) => setSoapForm({ ...soapForm, clinical_observations: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  value={soapForm.known_allergies}
                  onChange={(e) => setSoapForm({ ...soapForm, known_allergies: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={soapLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-700/20"
              >
                {soapLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synthesizing SOAP Record...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Synthesize Structured SOAP Note
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            {soapResult ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    EMR Clinical Documentation Ready
                  </span>
                  <button
                    onClick={copySoapToClipboard}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-teal-700 font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Full Note
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-teal-800 uppercase tracking-wide block mb-1">
                      S — Subjective
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{soapResult.subjective}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-teal-800 uppercase tracking-wide block mb-1">
                      O — Objective
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{soapResult.objective}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-teal-800 uppercase tracking-wide block mb-1">
                      A — Assessment & Differentials
                    </span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed mb-2">{soapResult.assessment}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {soapResult.differential_diagnoses.map((dx, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 text-[11px] font-medium">
                          • {dx}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                    <span className="font-bold text-teal-900 uppercase tracking-wide block mb-1">
                      P — Treatment Plan & Orders
                    </span>
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed">{soapResult.plan}</p>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span><strong>Follow-up:</strong> {soapResult.follow_up_recommendation}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Draft Clinical Notes with AI</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Input encounter observations and hit 'Synthesize Structured SOAP Note' to generate standardized EMR documentation.
                </p>
                <button
                  onClick={() => handleSoapSubmit()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Generate Sample SOAP Note
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
