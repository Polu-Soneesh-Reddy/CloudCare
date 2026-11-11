import React from 'react'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export function ToastItem({ toast, onRemove }) {
  const { id, message, type = 'success' } = toast

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
  }

  const borderColors = {
    success: 'border-emerald-200 bg-white shadow-card-md',
    error: 'border-rose-200 bg-white shadow-card-md',
    warning: 'border-amber-200 bg-white shadow-card-md',
    info: 'border-blue-200 bg-white shadow-card-md',
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm max-w-sm w-full transition-all duration-300 transform translate-x-0 ${borderColors[type] || borderColors.info}`}
      role="alert"
    >
      {icons[type] || icons.info}
      <div className="flex-1 font-medium text-slate-800 leading-snug">
        {typeof message === 'object' ? JSON.stringify(message) : message}
      </div>
      <button
        onClick={() => onRemove(id)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
