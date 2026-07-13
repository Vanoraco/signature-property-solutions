'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Trash2,
  X,
} from 'lucide-react'

export interface EntityColumn<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  sortVal?: (row: T) => unknown
  className?: string
  headerClassName?: string
}

interface SavedView {
  id: string
  name: string
  search: string
  sortKey: string | null
  sortDir: 'asc' | 'desc'
  pageSize: number
}

interface EntityTableProps<T extends { id: number }> {
  columns: EntityColumn<T>[]
  data: T[]
  entityLabel: string
  searchPlaceholder: string
  searchText: (row: T) => string
  storageKey: string
  selectedIds: Set<number>
  onSelectionChange: (ids: Set<number>) => void
  onRequestBulkDelete: (rows: T[]) => void
  emptyMessage?: string
}

const PAGE_SIZES = [5, 8, 10, 20]

function compareValues(left: unknown, right: unknown) {
  if (left == null) return 1
  if (right == null) return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function readSavedViews(storageKey: string): SavedView[] {
  try {
    const value = window.localStorage.getItem(storageKey)
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function EntityTable<T extends { id: number }>({
  columns,
  data,
  entityLabel,
  searchPlaceholder,
  searchText,
  storageKey,
  selectedIds,
  onSelectionChange,
  onRequestBulkDelete,
  emptyMessage,
}: EntityTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [pageSize, setPageSize] = useState(8)
  const [page, setPage] = useState(1)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])

  useEffect(() => {
    const timeout = window.setTimeout(() => setSavedViews(readSavedViews(storageKey)), 0)
    return () => window.clearTimeout(timeout)
  }, [storageKey])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return data
    return data.filter(row => searchText(row).toLocaleLowerCase().includes(query))
  }, [data, search, searchText])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const column = columns.find(candidate => candidate.key === sortKey)
    if (!column?.sortVal) return filtered
    return [...filtered].sort((left, right) => {
      const result = compareValues(column.sortVal?.(left), column.sortVal?.(right))
      return sortDir === 'asc' ? result : -result
    })
  }, [columns, filtered, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  const visibleIds = visibleRows.map(row => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
  const selectedRows = data.filter(row => selectedIds.has(row.id))

  const toggleSort = (column: EntityColumn<T>) => {
    if (!column.sortVal) return
    setPage(1)
    if (sortKey === column.key) {
      setSortDir(direction => direction === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(column.key)
    setSortDir('asc')
  }

  const toggleVisible = () => {
    const next = new Set(selectedIds)
    if (allVisibleSelected) visibleIds.forEach(id => next.delete(id))
    else visibleIds.forEach(id => next.add(id))
    onSelectionChange(next)
  }

  const toggleRow = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const persistViews = (views: SavedView[]) => {
    setSavedViews(views)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(views))
    } catch {
      // The view still works for this session when storage is unavailable.
    }
  }

  const saveCurrentView = () => {
    const name = window.prompt('Name this view (e.g. "Unreviewed leads"):', search || '')?.trim()
    if (!name) return
    const view: SavedView = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      search,
      sortKey,
      sortDir,
      pageSize,
    }
    persistViews([...savedViews, view])
  }

  const applyView = (view: SavedView) => {
    setSearch(view.search)
    setSortKey(view.sortKey)
    setSortDir(view.sortDir)
    setPageSize(view.pageSize)
    setPage(1)
  }

  const start = sorted.length ? (safePage - 1) * pageSize + 1 : 0
  const end = Math.min(safePage * pageSize, sorted.length)
  const pageStart = Math.max(1, Math.min(safePage - 2, totalPages - 4))

  return (
    <div className="panel">
      <div className="toolbar">
        <label className="search-box">
          <Search aria-hidden="true" size={15} />
          <span className="sr-only">Search {entityLabel.toLocaleLowerCase()}</span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-text-main outline-none"
          />
        </label>
        <span className="count-chip">
          {sorted.length} record{sorted.length === 1 ? '' : 's'}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={saveCurrentView}
          title="Save current search and sort"
        >
          <Bookmark aria-hidden="true" size={13} /> Save View
        </button>
        <label>
          <span className="sr-only">Records per page</span>
          <select
            className="min-h-[34px] rounded-lg border border-border bg-card px-2.5 text-[12.5px] font-semibold text-text-soft outline-none focus:border-brass focus:ring-2 focus:ring-brass-tint"
            value={pageSize}
            onChange={event => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
          >
            {PAGE_SIZES.map(size => <option key={size} value={size}>{size} / page</option>)}
          </select>
        </label>
      </div>

      {savedViews.length > 0 ? (
        <div className="flex min-h-[42px] flex-wrap items-center gap-2 border-b border-border-soft px-[18px] py-2">
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-text-faint">
            <Bookmark aria-hidden="true" size={12} /> Views:
          </span>
          {savedViews.map(view => (
            <span key={view.id} className="inline-flex items-center overflow-hidden rounded-full border border-border bg-card text-[11.5px] font-semibold text-text-soft">
              <button type="button" className="px-2.5 py-1 hover:bg-canvas" onClick={() => applyView(view)}>{view.name}</button>
              <button
                type="button"
                className="border-l border-border px-1.5 py-1 hover:bg-danger-tint hover:text-danger"
                onClick={() => persistViews(savedViews.filter(candidate => candidate.id !== view.id))}
                aria-label={`Delete ${view.name} view`}
                title="Delete saved view"
              >
                <X aria-hidden="true" size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {selectedRows.length > 0 ? (
        <div className="toolbar bg-brass-tint">
          <span className="text-[13px] font-semibold text-brass-dark">
            {selectedRows.length} selected
          </span>
          <span className="flex-1" />
          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => onRequestBulkDelete(selectedRows)}>
            <Trash2 aria-hidden="true" size={13} /> Delete Selected
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelectionChange(new Set())}>
            <X aria-hidden="true" size={13} /> Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr>
              <th className="w-[48px] border-b border-border bg-[#FAFBFB] px-[18px] py-[11px] text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisible}
                  aria-label="Select all visible records"
                />
              </th>
              {columns.map(column => {
                const sortable = Boolean(column.sortVal)
                const ariaSort = !sortable
                  ? undefined
                  : sortKey !== column.key
                    ? 'none'
                    : sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                return (
                  <th
                    key={column.key}
                    aria-sort={ariaSort}
                    className={`border-b border-border bg-[#FAFBFB] text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-text-faint whitespace-nowrap ${sortable ? 'p-0 hover:text-text-soft' : 'px-[18px] py-[11px]'} ${column.headerClassName || ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="inline-flex w-full items-center gap-1 rounded-[3px] border-0 bg-transparent px-[18px] py-[11px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-inset"
                      >
                        {column.label}
                        {sortKey === column.key
                          ? sortDir === 'asc'
                            ? <ChevronUp aria-hidden="true" className="opacity-50" size={12} />
                            : <ChevronDown aria-hidden="true" className="opacity-50" size={12} />
                          : null}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">{column.label}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.id} className="border-b border-border-soft last:border-b-0 hover:bg-[#FAFBFC]">
                <td className="px-[18px] py-[13px] align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Select ${searchText(row).split('\n')[0]}`}
                  />
                </td>
                {columns.map(column => (
                  <td key={column.key} className={`px-[18px] py-[13px] align-middle text-[13.3px] ${column.className || ''}`}>
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-14 text-center">
                  <Search aria-hidden="true" className="mx-auto mb-2 text-text-faint opacity-60" size={28} />
                  <div className="font-display text-[15px] font-semibold text-ink">
                    {emptyMessage || `No ${entityLabel.toLocaleLowerCase()} match`}
                  </div>
                  <div className="mt-1 text-[12.5px] text-text-faint">Try a different search term.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-t border-border-soft px-4 py-3">
        <span className="text-[12.5px] text-text-faint">Showing {start}-{end} of {sorted.length}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="grid h-8 w-8 place-items-center rounded-[7px] border border-border bg-card text-text-soft hover:bg-canvas disabled:opacity-35"
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft aria-hidden="true" size={14} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => pageStart + index).map(pageNumber => (
            <button
              type="button"
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
              className={`grid h-8 w-8 place-items-center rounded-[7px] border text-[12.5px] font-semibold ${pageNumber === safePage ? 'border-ink bg-ink text-white' : 'border-border bg-card text-text-soft hover:bg-canvas'}`}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === safePage ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={safePage === totalPages}
            className="grid h-8 w-8 place-items-center rounded-[7px] border border-border bg-card text-text-soft hover:bg-canvas disabled:opacity-35"
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight aria-hidden="true" size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
