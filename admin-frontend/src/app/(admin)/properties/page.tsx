'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import DataTable, { type Column } from '@/components/ui/DataTable'
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

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

export default function PropertiesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyRecord | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saveErrors, setSaveErrors] = useState<NormalizedApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const propertiesQuery = useQuery<ApiCollection<PropertyRecord>>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties/?page_size=100').then(response => response.data),
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
    mutationFn: (id: number) => api.delete(`/properties/${id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['properties'] })
      setDeleteId(null)
      setFeedback(createAdminToastFeedback('Property deleted successfully.'))
    },
    onError: () => {
      setDeleteId(null)
      setFeedback(createAdminToastFeedback('The property could not be deleted.', 'danger'))
    },
  })

  const columns: Column<PropertyRecord>[] = [
    {
      key: 'property_title',
      label: 'Property',
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
          <div>
            <div className="font-semibold text-ink">{property.property_title}</div>
            <div className="text-[11.5px] text-text-faint font-mono">{property.property_id || 'No ID'}</div>
          </div>
        </div>
      ),
      sortVal: property => property.property_title,
    },
    {
      key: 'property_location',
      label: 'Location',
      render: property => <span className="text-text-soft">{property.property_location}</span>,
    },
    {
      key: 'category_name',
      label: 'Category',
      render: property => (
        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-border-soft text-text-soft">
          {property.category_name}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: property => <span className="font-semibold font-mono text-ink">{property.price}</span>,
      sortVal: property => property.price_amount ?? 0,
    },
    {
      key: 'property_status',
      label: 'Status',
      render: property => (
        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${property.property_status === 'For Sale' ? 'bg-brass-tint text-brass-dark' : 'bg-success-tint text-success'}`}>
          {property.property_status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: property => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            aria-label={`Edit ${property.property_title}`}
            title="Edit property"
            onClick={event => {
              event.stopPropagation()
              openEdit(property)
            }}
            className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${property.property_title}`}
            title="Delete property"
            onClick={event => {
              event.stopPropagation()
              setDeleteId(property.id)
            }}
            className="w-8 h-8 rounded-lg border border-danger-tint bg-danger-tint text-danger flex items-center justify-center hover:bg-[#f6d9d6]"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

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
          <Plus aria-hidden="true" size={16} /> Add Property
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
        <DataTable
          columns={columns}
          data={normalizeResults(propertiesQuery.data)}
          searchKey="property_title"
          searchPlaceholder="Search properties..."
          onRowClick={openEdit}
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
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Property"
        size="default"
        footer={(
          <>
            <button type="button" onClick={() => setDeleteId(null)} className="btn btn-ghost" disabled={deleteMutation.isPending}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (deleteId !== null) deleteMutation.mutate(deleteId)
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
        <p className="text-text-soft text-[13.5px]">Are you sure you want to delete this property? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}
