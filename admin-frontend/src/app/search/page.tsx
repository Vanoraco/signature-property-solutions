'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, TrendingUp, MapPin, Building2, Filter } from 'lucide-react'
import { searchEventsQueryOptions } from '@/lib/admin-queries'
import type { SearchEvent } from '@/components/search/types'
import EntityTables, { type EntityColumn } from '@/components/lookups/EntityTable'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
  return `${day} · ${time}`
}

function topTerms(events: SearchEvent[], field: keyof SearchEvent, limit = 5) {
  const counts: Record<string, number> = {}
  for (const e of events) {
    const value = String(e[field] || '').trim()
    if (!value) continue
    counts[value] = (counts[value] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

export default function SearchAnalyticsPage() {
  const [statusFilter, setStatusFilter] = useState('')

  const eventsQuery = useQuery(searchEventsQueryOptions)
  const allEvents = eventsQuery.data?.results ?? []
  const events = statusFilter
    ? allEvents.filter(e => e.status_filter.toLowerCase() === statusFilter.toLowerCase())
    : allEvents

  const stats = useMemo(() => {
    const total = events.length
    const withResults = events.filter(e => e.results_count > 0).length
    const zeroResults = events.filter(e => e.results_count === 0).length
    const avgResults = total > 0
      ? Math.round(events.reduce((sum, e) => sum + e.results_count, 0) / total)
      : 0
    return { total, withResults, zeroResults, avgResults }
  }, [events])

  const topQueries = useMemo(() => topTerms(events, 'query'), [events])
  const topLocations = useMemo(() => topTerms(events, 'location_filter'), [events])
  const topTypes = useMemo(() => topTerms(events, 'property_type'), [events])

  const columns: EntityColumn<SearchEvent>[] = [
    {
      key: 'query',
      label: 'Search term',
      className: 'min-w-[220px]',
      sortVal: e => e.query,
      render: e => (
        <div className="min-w-0">
          <div className="cell-primary font-mono">{e.query || '(empty)'}</div>
          <div className="cell-sub">{e.location_filter || e.property_type || '—'}</div>
        </div>
      ),
    },
    {
      key: 'property_type',
      label: 'Type',
      className: 'min-w-[120px]',
      sortVal: e => e.property_type,
      render: e => e.property_type ? <span className="chip chip-gray">{e.property_type}</span> : <span className="text-text-faint">—</span>,
    },
    {
      key: 'status_filter',
      label: 'Goal',
      className: 'min-w-[100px]',
      sortVal: e => e.status_filter,
      render: e => {
        if (!e.status_filter) return <span className="text-text-faint">—</span>
        const isSale = e.status_filter.toLowerCase().includes('sale')
        return <span className={`chip ${isSale ? 'chip-brass' : 'chip-success'}`}>{e.status_filter}</span>
      },
    },
    {
      key: 'results_count',
      label: 'Results',
      className: 'min-w-[100px]',
      sortVal: e => e.results_count,
      render: e => (
        <span className={`font-mono ${e.results_count === 0 ? 'text-danger' : 'text-text-soft'}`}>
          {e.results_count}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      className: 'min-w-[120px]',
      sortVal: e => e.source,
      render: e => <span className="text-text-soft text-[12px]">{e.source || 'properties'}</span>,
    },
    {
      key: 'created_at',
      label: 'When',
      className: 'min-w-[160px]',
      sortVal: e => e.created_at,
      render: e => <span className="cell-sub whitespace-nowrap">{formatDateTime(e.created_at)}</span>,
    },
  ]

  return (
    <div>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-eyebrow">Leads</div>
          <h1 className="page-title">Search Analytics</h1>
          <p className="page-desc">Read-only view of what visitors are searching for on the public site.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stat-grid mb-[18px]">
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon"><Search size={17} /></div></div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Searches</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon"><TrendingUp size={17} /></div></div>
          <div className="stat-value">{stats.withResults}</div>
          <div className="stat-label">With results</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon"><Filter size={17} /></div></div>
          <div className="stat-value">{stats.zeroResults}</div>
          <div className="stat-label">Zero results</div>
        </div>
        <div className="stat-card">
          <div className="stat-top"><div className="stat-icon"><TrendingUp size={17} /></div></div>
          <div className="stat-value">{stats.avgResults}</div>
          <div className="stat-label">Avg results</div>
        </div>
      </div>

      {/* Top terms */}
      <div className="charts-grid mb-[18px]">
        <section className="panel">
          <div className="panel-head"><h3>Top search terms</h3></div>
          <div className="panel-body">
            {topQueries.length === 0 ? (
              <p className="text-text-faint text-[13px]">No search data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topQueries.map(([term, count]) => (
                  <div key={term} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="font-mono text-text truncate">{term}</span>
                    <span className="chip chip-brass flex-shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Top locations</h3></div>
          <div className="panel-body">
            {topLocations.length === 0 ? (
              <p className="text-text-faint text-[13px]">No location data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topLocations.map(([loc, count]) => (
                  <div key={loc} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-text truncate"><MapPin aria-hidden="true" size={13} className="inline mr-1 text-text-faint" />{loc}</span>
                    <span className="chip chip-gray flex-shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Top property types</h3></div>
          <div className="panel-body">
            {topTypes.length === 0 ? (
              <p className="text-text-faint text-[13px]">No type data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-text truncate"><Building2 aria-hidden="true" size={13} className="inline mr-1 text-text-faint" />{type}</span>
                    <span className="chip chip-gray flex-shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <select
          className="min-h-[38px] px-3 border border-border rounded-lg bg-card text-text text-[13px] outline-none focus:border-brass focus:shadow-[0_0_0_3px_var(--brass-tint)]"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by goal"
        >
          <option value="">All goals</option>
          <option value="Sale">For Sale</option>
          <option value="Rent">For Rent</option>
        </select>
        <span className="count-chip">{events.length} {events.length === 1 ? 'search' : 'searches'}</span>
      </div>

      {eventsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading search analytics">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : eventsQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Search analytics could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => eventsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTables
          columns={columns}
          data={events}
          entityLabel="Search events"
          searchPlaceholder="Search analytics..."
          searchText={(e) => `${e.query}\n${e.location_filter}\n${e.property_type}\n${e.status_filter}\n${e.source}`}
          storageKey="signature-admin-search-views"
          selectedIds={new Set()}
          onSelectionChange={() => {}}
          onRequestBulkDelete={() => {}}
          emptyMessage="No searches recorded yet"
        />
      )}
    </div>
  )
}
