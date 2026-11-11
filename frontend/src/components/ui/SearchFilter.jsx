import React from 'react'
import { Search, X, Filter } from 'lucide-react'

export default function SearchFilter({
  searchValue = '',
  onSearchChange,
  placeholder = 'Search...',
  filters = [],
  onReset,
}) {
  const hasActiveFilters =
    Boolean(searchValue) ||
    filters.some((f) => f.value && f.value !== '' && f.value !== 'all')

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="input-field pl-9 pr-9"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Selects */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter, idx) => (
            <div key={idx} className="relative min-w-[140px]">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="input-field py-2 text-xs font-medium cursor-pointer"
              >
                {filter.label && <option value="all">{filter.label}</option>}
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-slate-500 hover:text-teal-600 px-2 py-1.5 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  )
}
