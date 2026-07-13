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
import styles from './EntityTable.module.css'

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
    <div className={`panel ${styles.root}`}>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
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
            className={styles.searchInput}
          />
        </label>
        <span className={styles.recordCount}>
          {sorted.length} record{sorted.length === 1 ? '' : 's'}
        </span>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${styles.saveViewButton}`}
            onClick={saveCurrentView}
            title="Save current search and sort"
          >
            <Bookmark aria-hidden="true" size={13} /> Save View
          </button>
          <label>
            <span className="sr-only">Records per page</span>
            <select
              className={styles.pageSizeSelect}
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
      </div>

      {savedViews.length > 0 ? (
        <div className={styles.savedViews}>
          <span className={styles.savedViewLabel}>
            <Bookmark aria-hidden="true" size={12} /> Views:
          </span>
          {savedViews.map(view => (
            <span key={view.id} className={styles.savedView}>
              <button type="button" className={styles.savedViewApply} onClick={() => applyView(view)}>{view.name}</button>
              <button
                type="button"
                className={styles.savedViewDelete}
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
        <div className={styles.bulkBar}>
          <span className={styles.selectedCount}>
            {selectedRows.length} selected
          </span>
          <div className={styles.bulkActions}>
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => onRequestBulkDelete(selectedRows)}>
              <Trash2 aria-hidden="true" size={13} /> Delete Selected
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelectionChange(new Set())}>
              <X aria-hidden="true" size={13} /> Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.headerCell} ${styles.headerCheckbox}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
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
                    className={`${styles.headerCell} ${sortable ? styles.sortableHeader : ''} ${column.key === 'actions' ? styles.alignRight : ''} ${column.headerClassName || ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={styles.sortButton}
                      >
                        {column.label}
                        {sortKey === column.key
                          ? sortDir === 'asc'
                            ? <ChevronUp aria-hidden="true" className={styles.sortIcon} size={12} />
                            : <ChevronDown aria-hidden="true" className={styles.sortIcon} size={12} />
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
              <tr key={row.id} className={styles.row} data-selected={selectedIds.has(row.id)}>
                <td className={styles.cell}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Select ${searchText(row).split('\n')[0]}`}
                  />
                </td>
                {columns.map(column => (
                  <td key={column.key} className={`${styles.cell} ${column.className || ''}`}>
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.emptyCell}>
                  <Search aria-hidden="true" className={styles.emptyIcon} size={28} />
                  <div className={styles.emptyTitle}>
                    {emptyMessage || `No ${entityLabel.toLocaleLowerCase()} match`}
                  </div>
                  <div className={styles.emptyHint}>Try a different search term.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.range}>Showing {start}-{end} of {sorted.length}</span>
        <div className={styles.pagination}>
          <button
            type="button"
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className={styles.pageButton}
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
              className={styles.pageButton}
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
            className={styles.pageButton}
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
