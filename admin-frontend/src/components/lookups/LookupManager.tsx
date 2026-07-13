'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Compass,
  Edit,
  LoaderCircle,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react'
import api from '@/lib/api'
import { fetchCollection } from '@/lib/api-collection'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import EntityTable, { type EntityColumn } from './EntityTable'
import LookupForm from './LookupForm'
import {
  isCategory,
  lookupName,
  normalizeLookupApiErrors,
  toLookupFormData,
  type LookupApiErrors,
  type LookupFormValues,
} from './lookup-form'
import type { LookupKind, LookupRecord } from './types'

interface LookupManagerProps {
  kind: LookupKind
}

interface SaveLookupArgs {
  values: LookupFormValues
  recordId?: number
}

interface DeleteLookupResult {
  deletedCount: number
  failures: unknown[]
}

const CONFIG = {
  categories: {
    title: 'Categories',
    singular: 'Category',
    endpoint: '/categories',
    queryKey: ['categories'],
    nameLabel: 'Category',
    countLabel: 'Listings',
    searchPlaceholder: 'Search categories...',
    description: 'Manage every category record shown across the site.',
  },
  facilities: {
    title: 'Facilities',
    singular: 'Facility',
    endpoint: '/facilities',
    queryKey: ['facilities'],
    nameLabel: 'Facility',
    countLabel: 'Used In',
    searchPlaceholder: 'Search facilities...',
    description: 'Manage every facility record shown across the site.',
  },
} as const

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function recordSearchText(record: LookupRecord) {
  return `${lookupName(record)}\n${record.slug}`
}

export default function LookupManager({ kind }: LookupManagerProps) {
  const config = CONFIG[kind]
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LookupRecord | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<LookupRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [saveErrors, setSaveErrors] = useState<LookupApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const recordsQuery = useQuery({
    queryKey: config.queryKey,
    queryFn: () => fetchCollection<LookupRecord>(`${config.endpoint}/`),
  })

  const records = recordsQuery.data?.results ?? []

  const invalidateLookupConsumers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: config.queryKey }),
      queryClient.invalidateQueries({ queryKey: ['property-form', kind] }),
      queryClient.invalidateQueries({ queryKey: ['properties'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'properties'] }),
    ])
  }

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

  const openEdit = (record: LookupRecord) => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(record)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, recordId }: SaveLookupArgs) => {
      const data = toLookupFormData(kind, values)
      return recordId
        ? api.patch(`${config.endpoint}/${recordId}/`, data)
        : api.post(`${config.endpoint}/`, data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      await invalidateLookupConsumers()
      closeEditor()
      setFeedback(createAdminToastFeedback(
        `${config.singular} ${variables.recordId ? 'updated' : 'created'} successfully.`,
      ))
    },
    onError: error => {
      setSaveErrors(normalizeLookupApiErrors(responseData(error), kind))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (targets: LookupRecord[]) => {
      const result: DeleteLookupResult = { deletedCount: 0, failures: [] }
      for (const target of targets) {
        try {
          await api.delete(`${config.endpoint}/${target.id}/`)
          result.deletedCount += 1
        } catch (error) {
          result.failures.push(error)
        }
      }
      return result
    },
    onSuccess: async ({ deletedCount, failures }) => {
      await invalidateLookupConsumers()
      setDeleteTargets([])
      setSelectedIds(new Set())

      if (failures.length > 0) {
        const detail = responseData(failures[0])
        const failureMessage = detail && typeof detail === 'object' && 'detail' in detail
          ? String((detail as { detail: unknown }).detail)
          : `${config.singular} could not be deleted.`
        setFeedback(createAdminToastFeedback(
          deletedCount > 0
            ? `${deletedCount} of ${deletedCount + failures.length} records deleted. ${failures.length} failed. ${failureMessage}`
            : failureMessage,
          'danger',
        ))
        return
      }

      setFeedback(createAdminToastFeedback(
        deletedCount === 1
          ? `${config.singular} deleted successfully.`
          : `${deletedCount} ${config.title.toLocaleLowerCase()} deleted successfully.`,
      ))
    },
    onError: error => {
      const detail = responseData(error)
      const message = detail && typeof detail === 'object' && 'detail' in detail
        ? String((detail as { detail: unknown }).detail)
        : `${config.singular} could not be deleted.`
      setDeleteTargets([])
      setFeedback(createAdminToastFeedback(message, 'danger'))
    },
  })

  const requestDelete = (target: LookupRecord) => {
    if (kind === 'categories' && target.property_count > 0) {
      setFeedback(createAdminToastFeedback(
        `${lookupName(target)} cannot be deleted while ${target.property_count} ${target.property_count === 1 ? 'property uses' : 'properties use'} it.`,
        'danger',
      ))
      return
    }
    setFeedback(null)
    setDeleteTargets([target])
  }

  const requestBulkDelete = (targets: LookupRecord[]) => {
    const protectedRecord = kind === 'categories'
      ? targets.find(target => target.property_count > 0)
      : undefined
    if (protectedRecord) {
      setFeedback(createAdminToastFeedback(
        `${lookupName(protectedRecord)} is still used by properties. Remove protected categories from the selection before deleting.`,
        'danger',
      ))
      return
    }
    setFeedback(null)
    setDeleteTargets(targets)
  }

  const columns: EntityColumn<LookupRecord>[] = [
    {
      key: 'name',
      label: config.nameLabel,
      sortVal: record => lookupName(record),
      render: record => (
        <div className="flex items-center gap-2.5">
          {kind === 'categories' ? (
            <div className="relative grid h-[42px] w-[42px] flex-none place-items-center overflow-hidden rounded-lg border border-border-soft bg-border-soft text-text-faint">
              {isCategory(record) && record.icon ? (
                <Image src={record.icon} alt="" fill sizes="42px" className="object-cover" unoptimized />
              ) : (
                <Tag aria-hidden="true" size={17} />
              )}
            </div>
          ) : (
            <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-lg bg-border-soft text-text-faint">
              <Compass aria-hidden="true" size={16} />
            </div>
          )}
          <div className="min-w-0">
            <div className="cell-primary truncate">{lookupName(record)}</div>
            <div className="cell-sub truncate">/{record.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'property_count',
      label: config.countLabel,
      render: record => (
        <span className="chip chip-gray">
          {record.property_count} {record.property_count === 1 ? 'property' : 'properties'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-right',
      className: 'w-[118px]',
      render: record => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`Edit ${lookupName(record)}`}
            title={`Edit ${config.singular.toLocaleLowerCase()}`}
            onClick={() => openEdit(record)}
            className="entity-row-action"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${lookupName(record)}`}
            title={kind === 'categories' && record.property_count > 0
              ? 'This category is still used by properties'
              : `Delete ${config.singular.toLocaleLowerCase()}`}
            onClick={() => requestDelete(record)}
            className={`entity-row-action entity-row-action-danger ${kind === 'categories' && record.property_count > 0 ? 'entity-row-action-muted' : ''}`}
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const deletingMany = deleteTargets.length > 1
  const deleteLabel = deleteTargets[0] ? lookupName(deleteTargets[0]) : ''

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Properties</div>
          <h1 className="page-title">{config.title}</h1>
          <div className="page-desc">{config.description}</div>
        </div>
        <button type="button" className="btn btn-brass" onClick={openCreate}>
          <Plus aria-hidden="true" size={16} /> New {config.singular}
        </button>
      </div>

      {feedback ? (
        <AdminToast
          eventId={feedback.id}
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      {recordsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label={`Loading ${config.title.toLocaleLowerCase()}`}>
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-border border-t-brass" />
        </div>
      ) : recordsQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger">
          <p className="text-[13px] font-semibold">{config.title} could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => recordsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={records}
          entityLabel={config.title}
          searchPlaceholder={config.searchPlaceholder}
          searchText={recordSearchText}
          storageKey={`signature-admin-${kind}-views`}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRequestBulkDelete={requestBulkDelete}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeEditor}
        title={`${editing ? 'Edit' : 'New'} ${config.singular}`}
        description={editing ? 'Editing an existing record.' : `Create a new ${config.singular.toLocaleLowerCase()} record.`}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={closeEditor} disabled={saveMutation.isPending}>Cancel</button>
            <button type="submit" form="lookup-editor-form" className="btn btn-primary" disabled={saveMutation.isPending} aria-busy={saveMutation.isPending}>
              {saveMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                : <Check aria-hidden="true" size={14} />}
              {saveMutation.isPending ? 'Saving...' : `Save ${config.singular}`}
            </button>
          </>
        )}
      >
        <LookupForm
          key={editing ? `${kind}-${editing.id}` : `${kind}-new`}
          kind={kind}
          initialRecord={editing}
          apiErrors={saveErrors}
          onSubmit={values => saveMutation.mutate({ values, recordId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTargets.length > 0}
        onClose={() => setDeleteTargets([])}
        title={deletingMany ? `Delete ${deleteTargets.length} ${config.title}?` : `Delete ${config.singular}?`}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTargets([])} disabled={deleteMutation.isPending}>Cancel</button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => deleteMutation.mutate(deleteTargets)}
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
        <p className="text-[13.5px] text-text-soft">
          {deletingMany
            ? `${deleteTargets.length} records will be permanently removed. This cannot be undone.`
            : `"${deleteLabel}" will be permanently removed. This cannot be undone.`}
        </p>
      </Modal>
    </div>
  )
}
