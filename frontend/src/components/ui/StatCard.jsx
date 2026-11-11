import React from 'react'

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBg = 'bg-teal-50',
  iconColor = 'text-teal-600',
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  subtitle,
  onClick,
}) {
  const isClickable = Boolean(onClick)

  const changeColor =
    changeType === 'positive'
      ? 'text-emerald-600 bg-emerald-50'
      : changeType === 'negative'
      ? 'text-rose-600 bg-rose-50'
      : 'text-slate-600 bg-slate-100'

  return (
    <div
      onClick={onClick}
      className={`card p-5 transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:shadow-card-md hover:-translate-y-0.5' : 'hover:shadow-card-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {value !== undefined && value !== null ? value : '—'}
            </h3>
            {change && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${changeColor}`}>
                {change}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} flex-shrink-0 ml-3`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}
