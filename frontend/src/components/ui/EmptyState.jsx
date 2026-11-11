import React from 'react'
import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data available',
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-surface-100 border border-surface-200 flex items-center justify-center mb-4 text-slate-400">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
