import React from 'react'
import EmptyState from './EmptyState'
import { SkeletonLine } from './LoadingSkeleton'

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display.',
  onRowClick,
  rowKey = 'id',
}) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 bg-white">
              {Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-5 py-4 whitespace-nowrap">
                      <SkeletonLine
                        width={cIdx === 0 ? 'w-32' : 'w-20'}
                        height="h-4"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="card overflow-hidden">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-surface-200">
          <thead className="bg-surface-50">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                    col.className || ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 bg-white">
            {data.map((item, rowIdx) => {
              const key = item[rowKey] !== undefined ? item[rowKey] : rowIdx
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-surface-50'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-5 py-4 text-sm text-slate-700 whitespace-nowrap ${
                        col.cellClassName || ''
                      }`}
                    >
                      {col.render ? col.render(item, rowIdx) : item[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
