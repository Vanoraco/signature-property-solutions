'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  sortVal?: (row: T) => any
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchPlaceholder?: string
  searchKey?: string
  pageSize?: number
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export default function DataTable<T extends { id: number | string }>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  searchKey,
  pageSize = 8,
  onRowClick,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = data
    if (search && searchKey) {
      const q = search.toLowerCase()
      result = result.filter((row: any) =>
        String(row[searchKey] || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [data, search, searchKey])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a: any, b: any) => {
      const col = columns.find(c => c.key === sortKey)
      const va = col?.sortVal ? col.sortVal(a) : a[sortKey]
      const vb = col?.sortVal ? col.sortVal(b) : b[sortKey]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir, columns])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="bg-card border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border-soft flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-canvas border border-border rounded-lg px-3 py-2 min-w-[220px] text-text-faint">
          <Search size={14} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="bg-transparent border-none outline-none flex-1 text-[13px] text-text-main placeholder:text-text-faint"
          />
        </div>
        <span className="text-[12px] text-text-faint font-mono ml-auto">{sorted.length} records</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left text-[11px] tracking-[0.6px] uppercase text-text-faint px-[18px] py-[11px] border-b border-border bg-[#FAFBFB] whitespace-nowrap font-semibold cursor-pointer select-none hover:text-text-soft"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={12} className="opacity-50" /> : <ChevronDown size={12} className="opacity-50" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border-soft last:border-b-0 hover:bg-[#FAFBFC] ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-[18px] py-[13px] text-[13.3px] align-middle ${col.className || ''}`}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-text-faint text-[13px]">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3.5 border-t border-border-soft flex items-center justify-between flex-wrap gap-2">
          <span className="text-[12.5px] text-text-faint">
            Page {page} of {totalPages} · {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-[7px] border border-border bg-card flex items-center justify-center text-text-soft text-[12.5px] font-semibold hover:bg-canvas disabled:opacity-35"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              if (p > totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-[7px] border flex items-center justify-center text-[12.5px] font-semibold ${
                    p === page
                      ? 'bg-ink text-white border-ink'
                      : 'border-border bg-card text-text-soft hover:bg-canvas'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-[7px] border border-border bg-card flex items-center justify-center text-text-soft text-[12.5px] font-semibold hover:bg-canvas disabled:opacity-35"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
