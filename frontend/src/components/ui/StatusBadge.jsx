import React from 'react'
import { getStatusColor } from '../../utils/formatters'

export default function StatusBadge({ status }) {
  if (!status) return null
  return (
    <span className={`badge ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}
