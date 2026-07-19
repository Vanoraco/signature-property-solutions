'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Check, Edit, Image as ImageIcon, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import {
  servicesQueryOptions,
  adminQueryKeys,
} from '@/lib/admin-queries'
import {
  normalizeServiceApiErrors,
  normalizeServices,
  toServiceFormData,
  type ServiceApiErrors,
  type ServiceFormValues,
} from '@/components/services/service-form'
import type { ServiceRecord } from '@/components/services/types'
import EntityTables, { type EntityColumn } from '@/components/lookups/EntityTable'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'

const loadServiceForm = () => import('@/components/services/ServiceForm')
const ServiceForm = dynamic(loadServiceForm, {
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center" role="status" aria-label="Loading service editor">
      <LoaderCircle aria-hidden="true" className="animate-spin text-brass" size={22} />
    </div>
  ),
})

interface SaveServiceArgs {
  values: ServiceFormValues
  serviceId?: number
}

interface BulkDeleteResult {
  deleted: ServiceRecord[]
  failed: ServiceRecord[]
}

const SERVICE_DEPENDENT_QUERY_KEYS = [adminQueryKeys.services] as const

async function invalidateServiceCaches(queryClient: QueryClient) {
  await Promise.all(
    SERVICE_DEPENDENT_QUERY_KEYS.map(queryKey => queryClient.invalidateQueries({ queryKey })),
  )
}

function bulkDeleteFeedback(result: BulkDeleteResult): AdminToastFeedback {
  const deletedCount = result.deleted.length
  const failedCount = result.failed.length
  if (failedCount === 0) {
    return createAdminToastFeedback(
      `${deletedCount} ${deletedCount === 1 ? 'service' : 'services'} deleted successfully.`,
    )
  }
  if (deletedCount === 0) {
    return createAdminToastFeedback(
      `No services were deleted. ${failedCount} ${failedCount === 1 ? 'request' : 'requests'} failed.`,
      'danger',
    )
  }
  return createAdminToastFeedback(
    `${deletedCount} ${deletedCount === 1 ? 'service was' : 'services were'} deleted; ${failedCount} could not be deleted.`,
    'danger',
  )
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function serviceSearchText(s: ServiceRecord) {
  return [s.service_name, s.short_discriptions, s.Discription].join('\n')
}

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null)
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<ServiceRecord[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [saveErrors, setSaveErrors] = useState<ServiceApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const servicesQuery = useQuery(servicesQueryOptions)

  const closeEditor = () => {
    setModalOpen(false)
    setEditing(null)
    setSaveErrors(null)
  }

  const openCreate = () => {
    void loadServiceForm()
    setFeedback(null)
    setSaveErrors(null)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (service: ServiceRecord) => {
    void loadServiceForm()
    setFeedback(null)
    setSaveErrors(null)
    setEditing(service)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, serviceId }: SaveServiceArgs) => {
      const data = toServiceFormData(values)
      return serviceId ? api.patch(`/services/${serviceId}/`, data) : api.post('/services/', data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      await invalidateServiceCaches(queryClient)
      closeEditor()
      setFeedback(createAdminToastFeedback(
        variables.serviceId ? 'Service updated successfully.' : 'Service created successfully.',
      ))
    },
    onError: error => {
      setSaveErrors(normalizeServiceApiErrors(responseData(error)))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (service: ServiceRecord) => api.delete(`/services/${service.id}/`),
    onSuccess: async (_response, service) => {
      await invalidateServiceCaches(queryClient)
      setSelectedIds(current => {
        const next = new Set(current)
        next.delete(service.id)
        return next
      })
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('Service deleted successfully.'))
    },
    onError: () => {
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('The service could not be deleted.', 'danger'))
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (services: ServiceRecord[]): Promise<BulkDeleteResult> => {
      const results = await Promise.allSettled(
        services.map(s => api.delete(`/services/${s.id}/`)),
      )
      return results.reduce<BulkDeleteResult>((result, request, index) => {
        result[request.status === 'fulfilled' ? 'deleted' : 'failed'].push(services[index])
        return result
      }, { deleted: [], failed: [] })
    },
    onSuccess: async result => {
      setSelectedIds(new Set())
      setBulkDeleteTargets(null)
      await invalidateServiceCaches(queryClient)
      setFeedback(bulkDeleteFeedback(result))
    },
  })

  const columns: EntityColumn<ServiceRecord>[] = [
    {
      key: 'service_name',
      label: 'Service',
      className: 'min-w-[230px]',
      sortVal: s => s.service_name,
      render: s => (
        <div className="flex items-center gap-2.5">
          {s.icon ? (
            <Image
              src={s.icon}
              alt=""
              width={42}
              height={42}
              unoptimized
              className="w-[42px] h-[42px] rounded-lg object-cover bg-border-soft"
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-lg bg-border-soft text-text-faint flex items-center justify-center">
              <ImageIcon aria-hidden="true" size={18} />
            </div>
          )}
          <div className="min-w-0">
            <div className="cell-primary">{s.service_name}</div>
            <div className="cell-sub font-mono">{s.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'short_discriptions',
      label: 'Short description',
      className: 'min-w-[260px] max-w-[420px]',
      render: s => <span className="text-text-soft line-clamp-2">{s.short_discriptions}</span>,
    },
    {
      key: 'image',
      label: 'Hero image',
      className: 'min-w-[90px]',
      render: s => (
        s.image ? (
          <Image
            src={s.image}
            alt=""
            width={42}
            height={42}
            unoptimized
            className="w-[42px] h-[42px] rounded-lg object-cover bg-border-soft"
          />
        ) : <span className="text-text-faint">—</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-[118px]',
      render: s => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`Edit ${s.service_name}`}
            title="Edit service"
            onMouseEnter={() => void loadServiceForm()}
            onFocus={() => void loadServiceForm()}
            onTouchStart={() => void loadServiceForm()}
            onClick={event => {
              event.stopPropagation()
              openEdit(s)
            }}
            className="entity-row-action"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${s.service_name}`}
            title="Delete service"
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setDeleteTarget(s)
            }}
            className="entity-row-action entity-row-action-danger"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-eyebrow">Marketing</div>
          <h1 className="page-title">Services</h1>
          <p className="page-desc">Manage the real-estate services listed on the public services page.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          onMouseEnter={() => void loadServiceForm()}
          onFocus={() => void loadServiceForm()}
          onTouchStart={() => void loadServiceForm()}
          className="btn btn-brass"
        >
          <Plus aria-hidden="true" size={16} /> New Service
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

      {servicesQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading services">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : servicesQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Services could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => servicesQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTables
          columns={columns}
          data={normalizeServices(servicesQuery.data)}
          entityLabel="Services"
          searchPlaceholder="Search services..."
          searchText={serviceSearchText}
          storageKey="signature-admin-services-views"
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRequestBulkDelete={items => {
            setFeedback(null)
            setBulkDeleteTargets(items)
          }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeEditor}
        title={editing ? 'Edit Service' : 'New Service'}
        description={editing ? 'Editing an existing service.' : 'Create a new service.'}
        size="lg"
        footer={(
          <>
            <button type="button" onClick={closeEditor} className="btn btn-ghost" disabled={saveMutation.isPending}>Cancel</button>
            <button type="submit" form="service-editor-form" className="btn btn-primary" disabled={saveMutation.isPending} aria-busy={saveMutation.isPending}>
              {saveMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                : <Check aria-hidden="true" size={15} />}
              {saveMutation.isPending ? 'Saving...' : 'Save Service'}
            </button>
          </>
        )}
      >
        <ServiceForm
          key={editing ? `edit-${editing.id}` : 'create'}
          initialService={editing}
          apiErrors={saveErrors}
          onSubmit={values => saveMutation.mutate({ values, serviceId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Service?"
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
          Are you sure you want to delete the service &quot;{deleteTarget?.service_name}?&quot; This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={bulkDeleteTargets !== null}
        onClose={() => setBulkDeleteTargets(null)}
        title="Delete Selected Services"
        size="default"
        footer={(
          <>
            <button type="button" onClick={() => setBulkDeleteTargets(null)} className="btn btn-ghost" disabled={bulkDeleteMutation.isPending}>Cancel</button>
            <button
              type="button"
              onClick={() => { if (bulkDeleteTargets) bulkDeleteMutation.mutate(bulkDeleteTargets) }}
              className="btn btn-danger"
              disabled={bulkDeleteMutation.isPending}
              aria-busy={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                : <Trash2 aria-hidden="true" size={14} />}
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
            </button>
          </>
        )}
      >
        <p className="text-text-soft text-[13.5px]">
          Delete {bulkDeleteTargets?.length ?? 0} selected {(bulkDeleteTargets?.length ?? 0) === 1 ? 'service' : 'services'}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
