'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Check, Edit, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import EntityTables, { type EntityColumn } from '@/components/lookups/EntityTable'
import type { ActivityLogEntry } from '@/components/activity/types'
import styles from '@/components/activity/ActivityLogPage.module.css'

const ACTIVITY_QUERY_KEY = ['activity'] as const

function fetchActivity(signal: AbortSignal) {
  return api.get<{ count: number; results: ActivityLogEntry[] }>('/activity/', { signal }).then(r => r.data)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
  return `${day} · ${time}`
}

interface ActionBadge {
  label: string
  className: string
  icon: typeof Check
  iconClass: string
}

function actionBadge(action: string): ActionBadge {
  switch (action) {
    case 'create':
      return { label: 'Created', className: 'chip-success', icon: Plus, iconClass: styles.logIconCreate }
    case 'update':
      return { label: 'Updated', className: 'chip-brass', icon: Edit, iconClass: styles.logIconUpdate }
    case 'delete':
      return { label: 'Deleted', className: 'chip-danger', icon: Trash2, iconClass: styles.logIconDelete }
    default:
      return { label: action, className: 'chip-gray', icon: Activity, iconClass: '' }
  }
}

export default function ActivityLogPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  const activityQuery = useQuery({
    queryKey: ACTIVITY_QUERY_KEY,
    queryFn: ({ signal }) => fetchActivity(signal),
    staleTime: 30_000,
  })

  const allEntries = activityQuery.data?.results ?? []
  const models = Array.from(new Set(allEntries.map(e => e.target_model))).sort()
  const filtered = allEntries.filter(e => {
    if (actionFilter && e.action !== actionFilter) return false
    if (modelFilter && e.target_model !== modelFilter) return false
    return true
  })

  const columns: EntityColumn<ActivityLogEntry>[] = [
    {
      key: 'summary',
      label: 'Action',
      className: 'min-w-[280px]',
      sortVal: e => e.summary,
      render: e => {
        const badge = actionBadge(e.action)
        const Icon = badge.icon
        return (
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`w-[32px] h-[32px] rounded-lg flex items-center justify-center flex-shrink-0 ${badge.iconClass}`}>
              <Icon aria-hidden="true" size={15} />
            </div>
            <div className="min-w-0">
              <div className="cell-primary truncate">{e.summary || e.target_label}</div>
              <div className="cell-sub truncate">
                by {e.actor_username || 'system'} · {e.target_model}
                {e.target_id ? ` #${e.target_id}` : ''}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'action',
      label: 'Type',
      className: 'min-w-[110px]',
      sortVal: e => e.action,
      render: e => {
        const badge = actionBadge(e.action)
        return <span className={`chip ${badge.className}`}>{badge.label}</span>
      },
    },
    {
      key: 'target_model',
      label: 'Target',
      className: 'min-w-[140px]',
      sortVal: e => e.target_model,
      render: e => <span className="text-text-soft">{e.target_model}</span>,
    },
    {
      key: 'actor_username',
      label: 'Actor',
      className: 'min-w-[140px]',
      sortVal: e => e.actor_username,
      render: e => <span className="text-text-soft">{e.actor_username || 'system'}</span>,
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
          <div className="page-eyebrow">Team &amp; Access</div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-desc">Append-only audit trail of every change made through the admin dashboard.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <select
          className={styles.select}
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          aria-label="Filter by target type"
          disabled={models.length === 0}
        >
          <option value="">All targets</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="count-chip">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {activityQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading activity log">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : activityQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Activity log could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => activityQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTables
          columns={columns}
          data={filtered}
          entityLabel="Activity entries"
          searchPlaceholder="Search activity..."
          searchText={(e) => `${e.summary}\n${e.actor_username}\n${e.target_model}\n${e.target_label}`}
          storageKey="signature-admin-activity-views"
          selectedIds={new Set()}
          onSelectionChange={() => {}}
          onRequestBulkDelete={() => {}}
          emptyMessage="No activity yet"
        />
      )}
    </div>
  )
}
