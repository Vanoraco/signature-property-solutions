'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { fetchCollection } from '@/lib/api-collection'
import EntityTable, { type EntityColumn } from '@/components/lookups/EntityTable'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import PropertyForm from '@/components/properties/PropertyForm'
import {
  normalizeApiErrors,
  normalizeResults,
  toPropertyFormData,
  type NormalizedApiErrors,
  type PropertyFormValues,
} from '@/components/properties/property-form'
import type {
  AgentOption,
  ApiCollection,
  CategoryOption,
  FacilityOption,
  PropertyRecord,
} from '@/components/properties/types'

interface SavePropertyArgs {
  values: PropertyFormValues
  propertyId?: number
}

interface DeletePropertiesResult {
  deleted: PropertyRecord[]
  failed: PropertyRecord[]
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function propertySearchText(property: PropertyRecord) {
  return [
    property.property_title,
    property.property_id,
    property.slug,
    property.property_location,
    property.category_name,
    property.price,
    property.property_status,
    property.agent_name,
    ...property.facilitie_names,
  ].filter(Boolean).join('\n')
}

export default function PropertiesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyRecord | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<PropertyRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [saveErrors, setSaveErrors] = useState<NormalizedApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: () => fetchCollection<PropertyRecord>('/properties/'),
  })

  const categoriesQuery = useQuery<ApiCollection<CategoryOption>>({
    queryKey: ['property-form', 'categories'],
    queryFn: () => api.get('/categories/?page_size=100').then(response => response.data),
    enabled: modalOpen,
  })

  const agentsQuery = useQuery<ApiCollection<AgentOption>>({
    queryKey: ['property-form', 'agents'],
    queryFn: () => api.get('/agents/?page_size=100').then(response => response.data),
    enabled: modalOpen,
  })

  const facilitiesQuery = useQuery<ApiCollection<FacilityOption>>({
    queryKey: ['property-form', 'facilities'],
    queryFn: () => api.get('/facilities/?page_size=100').then(response => response.data),
    enabled: modalOpen,
  })

  const closePropertyModal = () => {
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

  const openEdit = (property: PropertyRecord) => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(property)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, propertyId }: SavePropertyArgs) => {
      const data = toPropertyFormData(values)
      return propertyId
        ? api.patch(`/properties/${propertyId}/`, data)
        : api.post('/properties/', data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['properties'] })
      closePropertyModal()
      setFeedback(createAdminToastFeedback(
        variables.propertyId ? 'Property updated successfully.' : 'Property created successfully.',
      ))
    },
    onError: error => {
      setSaveErrors(normalizeApiErrors(responseData(error)))
      setFeedback(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (targets: PropertyRecord[]): Promise<DeletePropertiesResult> => {
      const requests = await Promise.allSettled(
        targets.map(property => api.delete(`/properties/${property.id}/`)),
      )
      return requests.reduce<DeletePropertiesResult>((result, request, index) => {
        result[request.status === 'fulfilled' ? 'deleted' : 'failed'].push(targets[index])
        return result
      }, { deleted: [], failed: [] })
    },
    onSuccess: async result => {
      await queryClient.invalidateQueries({ queryKey: ['properties'] })
      setDeleteTargets([])
      setSelectedIds(new Set(result.failed.map(property => property.id)))

      if (result.failed.length === 0) {
        setFeedback(createAdminToastFeedback(
          result.deleted.length === 1
            ? 'Property deleted successfully.'
            : `${result.deleted.length} properties deleted successfully.`,
        ))
        return
      }

      setFeedback(createAdminToastFeedback(
        result.deleted.length === 0
          ? `No properties were deleted. ${result.failed.length} ${result.failed.length === 1 ? 'request' : 'requests'} failed.`
          : `${result.deleted.length} ${result.deleted.length === 1 ? 'property was' : 'properties were'} deleted; ${result.failed.length} could not be deleted.`,
        'danger',
      ))
    },
    onError: () => {
      setDeleteTargets([])
      setFeedback(createAdminToastFeedback('The property could not be deleted.', 'danger'))
    },
  })

  const requestDelete = (targets: PropertyRecord[]) => {
    setFeedback(null)
    setDeleteTargets(targets)
  }

  const columns: EntityColumn<PropertyRecord>[] = [
    {
      key: 'property_title',
      label: 'Property',
      className: 'min-w-[230px]',
      render: property => (
        <div className="flex items-center gap-2.5">
          {property.main_image ? (
            <Image
              src={property.main_image}
              alt=""
              width={42}
              height={42}
              className="w-[42px] h-[42px] rounded-lg object-cover bg-border-soft"
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-lg bg-border-soft" />
          )}
          <div className="min-w-0">
            <div className="cell-primary">{property.property_title}</div>
            <div className="cell-sub font-mono">{property.property_id || 'No ID'}</div>
          </div>
        </div>
      ),
      sortVal: property => property.property_title,
    },
    {
      key: 'property_location',
      label: 'Location',
      className: 'min-w-[170px]',
      render: property => <span className="text-text-soft">{property.property_location}</span>,
    },
    {
      key: 'category_name',
      label: 'Category',
      className: 'min-w-[130px]',
      render: property => (
        <span className="chip chip-gray">
          {property.category_name}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      className: 'min-w-[130px]',
      render: property => <span className="cell-primary font-mono whitespace-nowrap">{property.price}</span>,
      sortVal: property => property.price_amount ?? 0,
    },
    {
      key: 'property_status',
      label: 'Status',
      className: 'min-w-[110px]',
      render: property => (
        <span className={`chip ${property.property_status === 'For Sale' ? 'chip-brass' : 'chip-success'}`}>
          {property.property_status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-[118px]',
      render: property => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`Edit ${property.property_title}`}
            title="Edit property"
            onClick={event => {
              event.stopPropagation()
              openEdit(property)
            }}
            className="entity-row-action"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${property.property_title}`}
            title="Delete property"
            onClick={event => {
              event.stopPropagation()
              requestDelete([property])
            }}
            className="entity-row-action entity-row-action-danger"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const properties = propertiesQuery.data?.results ?? []
  const lookupLoading = categoriesQuery.isLoading || agentsQuery.isLoading || facilitiesQuery.isLoading
  const lookupError = categoriesQuery.isError || agentsQuery.isError || facilitiesQuery.isError

  const retryLookups = () => {
    void Promise.all([
      categoriesQuery.refetch(),
      agentsQuery.refetch(),
      facilitiesQuery.refetch(),
    ])
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Properties</div>
          <div className="page-title">All Properties</div>
          <div className="page-desc">Manage every property record shown across the site.</div>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-brass">
          <Plus aria-hidden="true" size={16} /> New Property
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

      {propertiesQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading properties">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : propertiesQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger">
          <p className="text-[13px] font-semibold">Properties could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => propertiesQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={properties}
          entityLabel="Properties"
          searchPlaceholder="Search properties..."
          searchText={propertySearchText}
          storageKey="signature-admin-properties-views"
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRequestBulkDelete={requestDelete}
          emptyMessage="No properties match"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closePropertyModal}
        title={editing ? 'Edit Property' : 'Add Property'}
        description={editing ? 'Update listing details and replace media when needed.' : 'Create a property listing for the public site.'}
        size="xl"
        footer={(
          <>
            <button type="button" onClick={closePropertyModal} className="btn btn-ghost" disabled={saveMutation.isPending}>
              Cancel
            </button>
            <button
              type="submit"
              form="property-editor-form"
              className="btn btn-brass"
              disabled={saveMutation.isPending || lookupLoading || lookupError}
            >
              {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Property'}
            </button>
          </>
        )}
      >
        <PropertyForm
          key={editing ? `edit-${editing.id}` : 'create'}
          initialProperty={editing}
          categories={normalizeResults(categoriesQuery.data)}
          agents={normalizeResults(agentsQuery.data)}
          facilities={normalizeResults(facilitiesQuery.data)}
          lookupsLoading={lookupLoading}
          lookupError={lookupError}
          apiErrors={saveErrors}
          onRetryLookups={retryLookups}
          onSubmit={values => saveMutation.mutate({ values, propertyId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTargets.length > 0}
        onClose={() => setDeleteTargets([])}
        title={deleteTargets.length === 1 ? 'Delete Property?' : `Delete ${deleteTargets.length} Properties?`}
        size="default"
        footer={(
          <>
            <button type="button" onClick={() => setDeleteTargets([])} className="btn btn-ghost" disabled={deleteMutation.isPending}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (deleteTargets.length > 0) deleteMutation.mutate(deleteTargets)
              }}
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
          {deleteTargets.length === 1
            ? `"${deleteTargets[0]?.property_title}" will be permanently removed. This cannot be undone.`
            : `${deleteTargets.length} selected properties will be permanently removed. This cannot be undone.`}
        </p>
      </Modal>
    </div>
  )
}
