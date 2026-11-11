import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. The backend server might be offline or unreachable.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`card p-8 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-500">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-5 break-words">
        {typeof message === 'object' ? JSON.stringify(message) : message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-secondary text-sm"
          type="button"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </button>
      )}
    </div>
  )
}
