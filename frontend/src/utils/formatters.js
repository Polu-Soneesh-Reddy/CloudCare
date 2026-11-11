export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export const formatTime = (timeStr) => {
  if (!timeStr) return '—'
  try {
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':')
      const h = parseInt(parts[0], 10)
      const minutes = parts[1].slice(0, 2)
      const period = h >= 12 ? 'PM' : 'AM'
      const displayH = h % 12 || 12
      return `${displayH}:${minutes} ${period}`
    }
    return timeStr
  } catch {
    return timeStr
  }
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export const getStatusColor = (status) => {
  const norm = (status || '').toLowerCase().trim()
  const map = {
    'scheduled': 'bg-slate-100 text-slate-700 border border-slate-200',
    'confirmed': 'bg-blue-50 text-blue-700 border border-blue-200',
    'checked in': 'bg-amber-50 text-amber-700 border border-amber-200',
    'in consultation': 'bg-purple-50 text-purple-700 border border-purple-200',
    'in-consultation': 'bg-purple-50 text-purple-700 border border-purple-200',
    'waiting': 'bg-amber-50 text-amber-700 border border-amber-200',
    'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'cancelled': 'bg-rose-50 text-rose-700 border border-rose-200',
    'no show': 'bg-orange-50 text-orange-700 border border-orange-200',
    'no-show': 'bg-orange-50 text-orange-700 border border-orange-200',
  }
  return map[norm] || 'bg-slate-100 text-slate-700 border border-slate-200'
}

export const getTypeColor = (type) => {
  const norm = (type || '').toLowerCase().trim()
  const colors = {
    'info': 'bg-blue-50 text-blue-700 border border-blue-200',
    'success': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'warning': 'bg-amber-50 text-amber-700 border border-amber-200',
    'error': 'bg-rose-50 text-rose-700 border border-rose-200',
    'appointment': 'bg-teal-50 text-teal-700 border border-teal-200',
    'queue': 'bg-purple-50 text-purple-700 border border-purple-200',
    'system': 'bg-slate-100 text-slate-700 border border-slate-200',
  }
  return colors[norm] || 'bg-slate-100 text-slate-700 border border-slate-200'
}
