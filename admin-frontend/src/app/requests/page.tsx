'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, MousePointerClick, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import {
  propertyRequestsQueryOptions,
  adminQueryKeys,
} from '@/lib/admin-queries'
import type { PropertyRequest } from '@/components/dashboard/types'
import EntityTables, { type EntityColumn } from '@/components/lookups/EntityTable'
import StatusMenu, { type StatusOption } from '@/app/requests/StatusMenu'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'

const REQUEST_DEPENDENT_QUERY_KEYS = [
  adminQueryKeys.propertyRequests,
] as const

async function invalidateRequestCaches(queryClient: QueryClient) {
  await Promise.all(
    REQUEST_DEPENDENT_QUERY_KEYS.map(queryKey => queryClient.invalidateQueries({ queryKey })),
  )
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function requestSearchText(r: PropertyRequest) {
  return [r.name, r.email, r.phone_number, r.property_type, r.goal, r.location, r.budget, r.message].join('\n')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
  return `${day} · ${time}`
}

interface GoalBadge {
  label: string
  className: string
}

function goalBadge(goal: string): GoalBadge {
  switch (goal) {
    case 'Buy':
      return { label: 'Buy', className: 'chip-brass' }
    case 'Rent':
      return { label: 'Rent', className: 'chip-success' }
    case 'Invest':
      return { label: 'Invest', className: 'chip-gray' }
    default:
      return { label: goal || 'Other', className: 'chip-gray' }
  }
}

const REQUEST_STATUSES: StatusOption[] = [
  { value: 'new', label: 'New', className: 'chip-danger' },
  { value: 'called', label: 'Called', className: 'chip-gray' },
  { value: 'talked', label: 'Talked', className: 'chip-brass' },
  { value: 'followed_up', label: 'Followed Up', className: 'chip-gray' },
  { value: 'converted', label: 'Converted', className: 'chip-success' },
  { value: 'closed', label: 'Closed', className: 'chip-gray' },
]

function statusMeta(value?: string): StatusOption {
  return REQUEST_STATUSES.find(status => status.value === value) ?? REQUEST_STATUSES[0]
}

export default function PropertyRequestsPage() {
  const queryClient = useQueryClient()
  const [viewing, setViewing] = useState<PropertyRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PropertyRequest | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkTargets, setBulkTargets] = useState<PropertyRequest[] | null>(null)

  const requestsQuery = useQuery(propertyRequestsQueryOptions)

  const updateStatus = useMutation({
    mutationFn: ({ request, status }: { request: PropertyRequest; status: string }) =>
      api.patch(`/requests/${request.id}/`, { status }),
    onMutate: ({ request }) => {
      setPendingId(request.id)
      setFeedback(null)
    },
    onSuccess: async (_response, { request, status }) => {
      await invalidateRequestCaches(queryClient)
      setFeedback(createAdminToastFeedback(`Marked as ${statusMeta(status).label}.`))
      setViewing(current => (current && current.id === request.id
        ? { ...current, status }
        : current))
    },
    onError: (error) => {
      const data = responseData(error)
      const message = data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : 'Could not update the request. Try again.'
      setFeedback(createAdminToastFeedback(message, 'danger'))
    },
    onSettled: () => setPendingId(null),
  })

  const deleteMutation = useMutation({
    mutationFn: (request: PropertyRequest) => api.delete(`/requests/${request.id}/`),
    onSuccess: async () => {
      await invalidateRequestCaches(queryClient)
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('Property request deleted.'))
    },
    onError: () => {
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('The property request could not be deleted.', 'danger'))
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (rows: PropertyRequest[]) => Promise.all(rows.map(row => api.delete(`/requests/${row.id}/`))),
    onSuccess: async (_result, rows) => {
      await invalidateRequestCaches(queryClient)
      setBulkTargets(null)
      setSelectedIds(new Set())
      const count = rows.length
      setFeedback(createAdminToastFeedback(`${count} request${count === 1 ? '' : 's'} deleted.`))
    },
    onError: () => {
      setBulkTargets(null)
      setFeedback(createAdminToastFeedback('Some selected requests could not be deleted.', 'danger'))
    },
  })

  const columns: EntityColumn<PropertyRequest>[] = [
    {
      key: 'name',
      label: 'Contact',
      className: 'min-w-[220px]',
      sortVal: r => r.name || '',
      render: r => (
        <div className="min-w-0">
          <div className="cell-primary">{r.name || 'Unnamed contact'}</div>
          <div className="cell-sub break-all">{r.email || r.phone_number || 'No contact details'}</div>
        </div>
      ),
    },
    {
      key: 'property_type',
      label: 'Interested in',
      className: 'min-w-[140px]',
      render: r => <span className="text-text-soft">{r.property_type || '—'}</span>,
    },
    {
      key: 'goal',
      label: 'Goal',
      className: 'min-w-[100px]',
      sortVal: r => r.goal || '',
      render: r => {
        const badge = goalBadge(r.goal)
        return <span className={`chip ${badge.className}`}>{badge.label}</span>
      },
    },
    {
      key: 'location',
      label: 'Location',
      className: 'min-w-[140px]',
      render: r => <span className="text-text-soft">{r.location || '—'}</span>,
    },
    {
      key: 'budget',
      label: 'Budget',
      className: 'min-w-[120px]',
      render: r => <span className="text-text-soft">{r.budget || '—'}</span>,
    },
    {
      key: 'created_at',
      label: 'Received',
      className: 'min-w-[140px]',
      sortVal: r => r.created_at,
      render: r => <span className="cell-sub whitespace-nowrap">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      className: 'min-w-[150px]',
      sortVal: r => r.status ?? 'new',
      render: r => (
        <StatusMenu
          value={r.status ?? 'new'}
          options={REQUEST_STATUSES}
          onChange={status => updateStatus.mutate({ request: r, status })}
          disabled={pendingId === r.id}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-[132px]',
      render: r => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`View request ${r.id} details`}
            title="View details"
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setViewing(r)
            }}
            className="entity-row-action"
          >
            <Check aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete request ${r.id}`}
            title="Delete request"
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setDeleteTarget(r)
            }}
            className="entity-row-action entity-row-action-danger"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const requests = requestsQuery.data?.results ?? []

  return (
    <div>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-eyebrow">Leads</div>
          <h1 className="page-title">Property Requests</h1>
          <p className="page-desc">Inbox of client inquiries submitted from the public property-request forms.</p>
        </div>
      </div>

      <div className="mt-4 flex max-w-full items-start gap-3 rounded-[10px] border border-brass/25 bg-brass-tint/60 px-4 py-3.5">
        <MousePointerClick aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brass-dark" />
        <p className="text-[13px] leading-relaxed text-text-soft">
          <span className="font-medium text-text">Status is clickable.</span>{' '}
          Click a lead&apos;s status to move it through the pipeline — Called, Talked, Followed Up,
          Converted, or Closed.
        </p>
      </div>

      {feedback ? (
        <AdminToast
          eventId={feedback.id}
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      {requestsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading property requests">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : requestsQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Property requests could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => requestsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTables
          columns={columns}
          data={requests}
          entityLabel="Property Requests"
          searchPlaceholder="Search requests..."
          searchText={requestSearchText}
          storageKey="signature-admin-requests-views"
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRequestBulkDelete={(rows) => {
            setFeedback(null)
            setBulkTargets(rows)
          }}
          emptyMessage="No requests have been received yet"
        />
      )}

      {viewing ? (
        <Modal
          open={viewing !== null}
          onClose={() => setViewing(null)}
          title="Request details"
          description={`Received ${formatDateTime(viewing.created_at)}`}
          size="lg"
          footer={(
            <button type="button" className="btn btn-primary" onClick={() => setViewing(null)}>Close</button>
          )}
        >
          <div className="grid grid-cols-2 gap-4 text-[13.5px]">
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Status</div>
              <StatusMenu
                value={viewing.status ?? 'new'}
                options={REQUEST_STATUSES}
                onChange={status => updateStatus.mutate({ request: viewing, status })}
                disabled={pendingId === viewing.id}
              />
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Name</div>
              <div className="text-text">{viewing.name || '—'}</div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Goal</div>
              <div><span className={`chip ${goalBadge(viewing.goal).className}`}>{goalBadge(viewing.goal).label}</span></div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Phone</div>
              <div className="text-text break-all">{viewing.phone_number || '—'}</div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Email</div>
              <div className="text-text break-all">{viewing.email || '—'}</div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Property type</div>
              <div className="text-text">{viewing.property_type || '—'}</div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Location</div>
              <div className="text-text">{viewing.location || '—'}</div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Budget</div>
              <div className="text-text">{viewing.budget || '—'}</div>
            </div>
            <div>
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Source page</div>
              <div className="text-text break-all">{viewing.source_page || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-text-faint text-[11.5px] uppercase tracking-wider mb-1">Message</div>
              <div className="text-text whitespace-pre-wrap rounded-lg border border-border-soft bg-canvas p-3">
                {viewing.message || 'No message provided.'}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Request?"
        size="default"
        footer={(
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost" disabled={deleteMutation.isPending}>Cancel</button>
            <button
              type="button"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget) }}
              className="btn btn-danger"
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                : <Trash2 aria-hidden="true" size={14} />}
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </>
        )}
      >
        <p className="text-text-soft text-[13.5px]">
          Delete the request from {deleteTarget?.name || 'this contact'}? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={bulkTargets !== null}
        onClose={() => setBulkTargets(null)}
        title="Delete Selected Requests?"
        size="default"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setBulkTargets(null)}
              className="btn btn-ghost"
              disabled={bulkDeleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (bulkTargets) bulkDeleteMutation.mutate(bulkTargets) }}
              className="btn btn-danger"
              disabled={bulkDeleteMutation.isPending}
              aria-busy={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                : <Trash2 aria-hidden="true" size={14} />}
              {bulkDeleteMutation.isPending
                ? 'Deleting...'
                : `Delete ${bulkTargets?.length ?? 0}`}
            </button>
          </>
        )}
      >
        <p className="text-text-soft text-[13.5px]">
          Delete {bulkTargets?.length ?? 0} selected request{bulkTargets?.length === 1 ? '' : 's'}?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
