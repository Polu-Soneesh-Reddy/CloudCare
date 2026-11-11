import React from 'react'

export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div
      className={`${width} ${height} bg-slate-200/70 animate-pulse rounded ${className}`}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-3">
      <SkeletonLine width="w-1/3" height="h-4" />
      <SkeletonLine width="w-1/2" height="h-8" />
      <SkeletonLine width="w-3/4" height="h-3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-200 flex justify-between">
        <SkeletonLine width="w-48" height="h-6" />
        <SkeletonLine width="w-24" height="h-6" />
      </div>
      <div className="divide-y divide-surface-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <SkeletonLine
                key={j}
                width={j === 0 ? 'w-32' : 'w-24'}
                height="h-4"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonChart({ height = 'h-64' }) {
  return (
    <div className={`card p-6 flex flex-col justify-between ${height}`}>
      <div className="flex justify-between items-center mb-4">
        <SkeletonLine width="w-40" height="h-5" />
        <SkeletonLine width="w-20" height="h-4" />
      </div>
      <div className="flex-1 flex items-end gap-3 pt-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200/70 animate-pulse rounded-t"
            style={{ height: `${20 + (i * 12) % 70}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
