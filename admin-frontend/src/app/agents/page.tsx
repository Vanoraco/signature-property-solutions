'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, CheckCircle2, Edit, Plus, Trash2, UserRound } from 'lucide-react'
import api from '@/lib/api'
import { fetchCollection, type ApiCollection } from '@/lib/api-collection'
import AgentForm from '@/components/agents/AgentForm'
import {
  normalizeAgentApiErrors,
  normalizeAgents,
  toAgentFormData,
  type AgentApiErrors,
  type AgentFormValues,
} from '@/components/agents/agent-form'
import type { AgentRecord } from '@/components/agents/types'
import EntityTable, { type EntityColumn } from '@/components/lookups/EntityTable'
import Modal from '@/components/ui/Modal'

interface SaveAgentArgs {
  values: AgentFormValues
  agentId?: number
}

interface Feedback {
  message: string
  tone: 'success' | 'danger'
}

interface BulkDeleteResult {
  deleted: AgentRecord[]
  failed: AgentRecord[]
}

const AGENT_DEPENDENT_QUERY_KEYS = [
  ['agents'],
  ['property-form', 'agents'],
  ['properties'],
  ['dashboard', 'agents'],
] as const

async function invalidateAgentCaches(queryClient: QueryClient) {
  await Promise.all(
    AGENT_DEPENDENT_QUERY_KEYS.map(queryKey => queryClient.invalidateQueries({ queryKey })),
  )
}

function bulkDeleteFeedback(result: BulkDeleteResult): Feedback {
  const deletedCount = result.deleted.length
  const failedCount = result.failed.length

  if (failedCount === 0) {
    return {
      tone: 'success',
      message: `${deletedCount} ${deletedCount === 1 ? 'agent' : 'agents'} deleted successfully.`,
    }
  }
  if (deletedCount === 0) {
    return {
      tone: 'danger',
      message: `No agents were deleted. ${failedCount} ${failedCount === 1 ? 'request' : 'requests'} failed.`,
    }
  }
  return {
    tone: 'danger',
    message: `${deletedCount} ${deletedCount === 1 ? 'agent was' : 'agents were'} deleted; ${failedCount} could not be deleted.`,
  }
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function agentSearchText(agent: AgentRecord) {
  return [
    agent.name,
    agent.email,
    agent.phone_number,
    agent.office_phone,
    agent.facebook,
    agent.instagram,
    agent.linkden,
  ].join('\n')
}

export default function AgentsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AgentRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentRecord | null>(null)
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<AgentRecord[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [saveErrors, setSaveErrors] = useState<AgentApiErrors | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const agentsQuery = useQuery<ApiCollection<AgentRecord>>({
    queryKey: ['agents'],
    queryFn: () => fetchCollection<AgentRecord>('/agents/'),
  })

  const closeEditor = () => {
    setModalOpen(false)
    setEditing(null)
    setSaveErrors(null)
  }

  const openCreate = () => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (agent: AgentRecord) => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(agent)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, agentId }: SaveAgentArgs) => {
      const data = toAgentFormData(values)
      return agentId ? api.patch(`/agents/${agentId}/`, data) : api.post('/agents/', data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      await invalidateAgentCaches(queryClient)
      closeEditor()
      setFeedback({
        tone: 'success',
        message: variables.agentId ? 'Agent updated successfully.' : 'Agent created successfully.',
      })
    },
    onError: error => {
      setSaveErrors(normalizeAgentApiErrors(responseData(error)))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (agent: AgentRecord) => api.delete(`/agents/${agent.id}/`),
    onSuccess: async (_response, agent) => {
      await invalidateAgentCaches(queryClient)
      setSelectedIds(current => {
        const next = new Set(current)
        next.delete(agent.id)
        return next
      })
      setDeleteTarget(null)
      setFeedback({ tone: 'success', message: 'Agent deleted successfully.' })
    },
    onError: () => {
      setDeleteTarget(null)
      setFeedback({ tone: 'danger', message: 'The agent could not be deleted.' })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (agents: AgentRecord[]): Promise<BulkDeleteResult> => {
      const results = await Promise.allSettled(
        agents.map(agent => api.delete(`/agents/${agent.id}/`)),
      )
      return results.reduce<BulkDeleteResult>((result, request, index) => {
        result[request.status === 'fulfilled' ? 'deleted' : 'failed'].push(agents[index])
        return result
      }, { deleted: [], failed: [] })
    },
    onSuccess: async result => {
      setSelectedIds(new Set())
      setBulkDeleteTargets(null)
      await invalidateAgentCaches(queryClient)
      setFeedback(bulkDeleteFeedback(result))
    },
  })

  const columns: EntityColumn<AgentRecord>[] = [
    {
      key: 'name',
      label: 'Agent',
      sortVal: agent => agent.name,
      render: agent => (
        <div className="flex items-center gap-2.5">
          {agent.image ? (
            <Image
              src={agent.image}
              alt=""
              width={42}
              height={42}
              unoptimized
              className="w-[42px] h-[42px] rounded-full object-cover bg-border-soft"
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-full bg-border-soft text-text-faint flex items-center justify-center">
              <UserRound aria-hidden="true" size={18} />
            </div>
          )}
          <div className="min-w-0">
            <div className="cell-primary">{agent.name}</div>
            <div className="cell-sub break-all">{agent.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone_number',
      label: 'Phone',
      render: agent => <span className="text-text-soft">{agent.phone_number || '—'}</span>,
    },
    {
      key: 'listing_count',
      label: 'Listings',
      sortVal: agent => agent.listing_count,
      render: agent => <span className="chip chip-brass">{agent.listing_count} active</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-right',
      className: 'w-[118px]',
      render: agent => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            aria-label={`Edit ${agent.name}`}
            title="Edit agent"
            onClick={event => {
              event.stopPropagation()
              openEdit(agent)
            }}
            className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${agent.name}`}
            title={agent.listing_count > 0 ? 'Agent has active listings' : 'Delete agent'}
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setDeleteTarget(agent)
            }}
            className="w-8 h-8 rounded-lg border border-danger-tint bg-danger-tint text-danger flex items-center justify-center hover:bg-[#f6d9d6]"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const deleteBlocked = (deleteTarget?.listing_count ?? 0) > 0

  return (
    <div>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-eyebrow">Properties</div>
          <h1 className="page-title">Agents</h1>
          <p className="page-desc">Manage every agent record shown across the site.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-brass">
          <Plus aria-hidden="true" size={16} /> New Agent
        </button>
      </div>

      {feedback ? (
        <div
          role={feedback.tone === 'danger' ? 'alert' : 'status'}
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3.5 py-3 text-[12.5px] font-semibold ${feedback.tone === 'success' ? 'border-success/20 bg-success-tint text-success' : 'border-danger/20 bg-danger-tint text-danger'}`}
        >
          {feedback.tone === 'success'
            ? <CheckCircle2 aria-hidden="true" size={16} />
            : <AlertCircle aria-hidden="true" size={16} />}
          {feedback.message}
        </div>
      ) : null}

      {agentsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading agents">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : agentsQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Agents could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => agentsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={normalizeAgents(agentsQuery.data)}
          entityLabel="Agents"
          searchPlaceholder="Search agents..."
          searchText={agentSearchText}
          storageKey="signature-admin-agent-views"
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRequestBulkDelete={agents => {
            setFeedback(null)
            setBulkDeleteTargets(agents)
          }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeEditor}
        title={editing ? 'Edit Agent' : 'New Agent'}
        description={editing ? 'Editing an existing record.' : 'Create a new agent record.'}
        footer={(
          <>
            <button type="button" onClick={closeEditor} className="btn btn-ghost" disabled={saveMutation.isPending}>Cancel</button>
            <button type="submit" form="agent-editor-form" className="btn btn-primary" disabled={saveMutation.isPending}>
              <Check aria-hidden="true" size={15} />
              {saveMutation.isPending ? 'Saving...' : 'Save Agent'}
            </button>
          </>
        )}
      >
        <AgentForm
          key={editing ? `edit-${editing.id}` : 'create'}
          initialAgent={editing}
          apiErrors={saveErrors}
          onSubmit={values => saveMutation.mutate({ values, agentId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteBlocked ? 'Agent Cannot Be Deleted' : 'Delete Agent'}
        size="default"
      >
        {deleteBlocked ? (
          <div role="alert" className="rounded-lg border border-brass/25 bg-brass-tint p-4 text-[13.5px] text-text-soft">
            <p className="font-semibold text-ink">{deleteTarget?.name} is assigned to {deleteTarget?.listing_count} active {deleteTarget?.listing_count === 1 ? 'listing' : 'listings'}.</p>
            <p className="mt-1.5">Reassign or delete those properties before removing this agent.</p>
          </div>
        ) : (
          <p className="text-text-soft text-[13.5px]">Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.</p>
        )}
        <div className="flex justify-end gap-2.5 mt-5">
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost">
            {deleteBlocked ? 'Close' : 'Cancel'}
          </button>
          {!deleteBlocked ? (
            <button
              type="button"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget)
              }}
              className="px-4 py-2 rounded-lg text-[13.5px] font-semibold bg-danger text-white hover:bg-[#b03e35] disabled:opacity-45"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={bulkDeleteTargets !== null}
        onClose={() => setBulkDeleteTargets(null)}
        title={bulkDeleteTargets?.some(agent => agent.listing_count > 0) ? 'Selected Agents Cannot Be Deleted' : 'Delete Selected Agents'}
        size="default"
      >
        {bulkDeleteTargets?.some(agent => agent.listing_count > 0) ? (
          <div role="alert" className="rounded-lg border border-brass/25 bg-brass-tint p-4 text-[13.5px] text-text-soft">
            <p className="font-semibold text-ink">One or more selected agents still have active listings.</p>
            <p className="mt-1.5">Reassign or delete those properties before removing the selected agents.</p>
          </div>
        ) : (
          <p className="text-text-soft text-[13.5px]">
            Delete {bulkDeleteTargets?.length ?? 0} selected {(bulkDeleteTargets?.length ?? 0) === 1 ? 'agent' : 'agents'}? This action cannot be undone.
          </p>
        )}
        <div className="flex justify-end gap-2.5 mt-5">
          <button type="button" onClick={() => setBulkDeleteTargets(null)} className="btn btn-ghost">
            {bulkDeleteTargets?.some(agent => agent.listing_count > 0) ? 'Close' : 'Cancel'}
          </button>
          {bulkDeleteTargets && !bulkDeleteTargets.some(agent => agent.listing_count > 0) ? (
            <button
              type="button"
              onClick={() => bulkDeleteMutation.mutate(bulkDeleteTargets)}
              className="px-4 py-2 rounded-lg text-[13.5px] font-semibold bg-danger text-white hover:bg-[#b03e35] disabled:opacity-45"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
            </button>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
