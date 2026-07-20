'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Check, Edit, LoaderCircle, Plus, Star, Trash2, UserRound } from 'lucide-react'
import api from '@/lib/api'
import {
  testimonialsQueryOptions,
  adminQueryKeys,
} from '@/lib/admin-queries'
import {
  normalizeTestimonialApiErrors,
  normalizeTestimonials,
  toTestimonialFormData,
  type TestimonialApiErrors,
  type TestimonialFormValues,
} from '@/components/testimonials/testimonial-form'
import type { Testimonial } from '@/components/testimonials/types'
import EntityTable, { type EntityColumn } from '@/components/lookups/EntityTable'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'

const loadTestimonialForm = () => import('@/components/testimonials/TestimonialForm')
const TestimonialForm = dynamic(loadTestimonialForm, {
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center" role="status" aria-label="Loading testimonial editor">
      <LoaderCircle aria-hidden="true" className="animate-spin text-brass" size={22} />
    </div>
  ),
})

interface SaveTestimonialArgs {
  values: TestimonialFormValues
  testimonialId?: number
}

interface BulkDeleteResult {
  deleted: Testimonial[]
  failed: Testimonial[]
}

const TESTIMONIAL_DEPENDENT_QUERY_KEYS = [
  adminQueryKeys.testimonials,
] as const

async function invalidateTestimonialCaches(queryClient: QueryClient) {
  await Promise.all(
    TESTIMONIAL_DEPENDENT_QUERY_KEYS.map(queryKey => queryClient.invalidateQueries({ queryKey })),
  )
}

function bulkDeleteFeedback(result: BulkDeleteResult): AdminToastFeedback {
  const deletedCount = result.deleted.length
  const failedCount = result.failed.length
  if (failedCount === 0) {
    return createAdminToastFeedback(
      `${deletedCount} ${deletedCount === 1 ? 'testimonial' : 'testimonials'} deleted successfully.`,
    )
  }
  if (deletedCount === 0) {
    return createAdminToastFeedback(
      `No testimonials were deleted. ${failedCount} ${failedCount === 1 ? 'request' : 'requests'} failed.`,
      'danger',
    )
  }
  return createAdminToastFeedback(
    `${deletedCount} ${deletedCount === 1 ? 'testimonial was' : 'testimonials were'} deleted; ${failedCount} could not be deleted.`,
    'danger',
  )
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function testimonialSearchText(t: Testimonial) {
  return [t.name, t.role, t.location, t.quote].join('\n')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export default function TestimonialsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null)
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Testimonial[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [saveErrors, setSaveErrors] = useState<TestimonialApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const testimonialsQuery = useQuery(testimonialsQueryOptions)

  const closeEditor = () => {
    setModalOpen(false)
    setEditing(null)
    setSaveErrors(null)
  }

  const openCreate = () => {
    void loadTestimonialForm()
    setFeedback(null)
    setSaveErrors(null)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (testimonial: Testimonial) => {
    void loadTestimonialForm()
    setFeedback(null)
    setSaveErrors(null)
    setEditing(testimonial)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, testimonialId }: SaveTestimonialArgs) => {
      const data = toTestimonialFormData(values)
      return testimonialId ? api.patch(`/testimonials/${testimonialId}/`, data) : api.post('/testimonials/', data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      await invalidateTestimonialCaches(queryClient)
      closeEditor()
      setFeedback(createAdminToastFeedback(
        variables.testimonialId ? 'Testimonial updated successfully.' : 'Testimonial created successfully.',
      ))
    },
    onError: error => {
      setSaveErrors(normalizeTestimonialApiErrors(responseData(error)))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (testimonial: Testimonial) => api.delete(`/testimonials/${testimonial.id}/`),
    onSuccess: async (_response, testimonial) => {
      await invalidateTestimonialCaches(queryClient)
      setSelectedIds(current => {
        const next = new Set(current)
        next.delete(testimonial.id)
        return next
      })
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('Testimonial deleted successfully.'))
    },
    onError: () => {
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('The testimonial could not be deleted.', 'danger'))
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (testimonials: Testimonial[]): Promise<BulkDeleteResult> => {
      const results = await Promise.allSettled(
        testimonials.map(t => api.delete(`/testimonials/${t.id}/`)),
      )
      return results.reduce<BulkDeleteResult>((result, request, index) => {
        result[request.status === 'fulfilled' ? 'deleted' : 'failed'].push(testimonials[index])
        return result
      }, { deleted: [], failed: [] })
    },
    onSuccess: async result => {
      setSelectedIds(new Set())
      setBulkDeleteTargets(null)
      await invalidateTestimonialCaches(queryClient)
      setFeedback(bulkDeleteFeedback(result))
    },
  })

  const columns: EntityColumn<Testimonial>[] = [
    {
      key: 'name',
      label: 'Client',
      className: 'min-w-[230px]',
      sortVal: t => t.name,
      render: t => (
        <div className="flex items-center gap-2.5">
          {t.image ? (
            <Image
              src={t.image}
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
            <div className="cell-primary">{t.name}</div>
            <div className="cell-sub">{t.role || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'quote',
      label: 'Quote',
      className: 'min-w-[260px] max-w-[420px]',
      render: t => <span className="text-text-soft line-clamp-2">{t.quote}</span>,
    },
    {
      key: 'location',
      label: 'Location',
      className: 'min-w-[140px]',
      render: t => <span className="text-text-soft">{t.location || '—'}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      className: 'min-w-[110px]',
      sortVal: t => t.rating,
      render: t => (
        <span className="inline-flex items-center gap-1 text-brass-dark">
          <Star aria-hidden="true" size={13} fill="currentColor" /> {t.rating}
        </span>
      ),
    },
    {
      key: 'is_published',
      label: 'Status',
      className: 'min-w-[110px]',
      sortVal: t => (t.is_published ? 1 : 0),
      render: t => (
        <span className={`chip ${t.is_published ? 'chip-success' : 'chip-gray'}`}>
          {t.is_published ? 'Published' : 'Unpublished'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Added',
      className: 'min-w-[110px]',
      sortVal: t => t.created_at,
      render: t => <span className="cell-sub whitespace-nowrap">{formatDate(t.created_at)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-[118px]',
      render: t => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`Edit ${t.name}`}
            title="Edit testimonial"
            onMouseEnter={() => void loadTestimonialForm()}
            onFocus={() => void loadTestimonialForm()}
            onTouchStart={() => void loadTestimonialForm()}
            onClick={event => {
              event.stopPropagation()
              openEdit(t)
            }}
            className="entity-row-action"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${t.name}`}
            title="Delete testimonial"
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setDeleteTarget(t)
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
          <h1 className="page-title">Testimonials</h1>
          <p className="page-desc">Manage the client testimonials shown on the public testimonials page.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          onMouseEnter={() => void loadTestimonialForm()}
          onFocus={() => void loadTestimonialForm()}
          onTouchStart={() => void loadTestimonialForm()}
          className="btn btn-brass"
        >
          <Plus aria-hidden="true" size={16} /> New Testimonial
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

      {testimonialsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading testimonials">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : testimonialsQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Testimonials could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => testimonialsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={normalizeTestimonials(testimonialsQuery.data)}
          entityLabel="Testimonials"
          searchPlaceholder="Search testimonials..."
          searchText={testimonialSearchText}
          storageKey="signature-admin-testimonials-views"
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
        title={editing ? 'Edit Testimonial' : 'New Testimonial'}
        description={editing ? 'Editing an existing testimonial.' : 'Create a new testimonial.'}
        size="lg"
        footer={(
          <>
            <button type="button" onClick={closeEditor} className="btn btn-ghost" disabled={saveMutation.isPending}>Cancel</button>
            <button type="submit" form="testimonial-editor-form" className="btn btn-primary" disabled={saveMutation.isPending} aria-busy={saveMutation.isPending}>
              {saveMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                : <Check aria-hidden="true" size={15} />}
              {saveMutation.isPending ? 'Saving...' : 'Save Testimonial'}
            </button>
          </>
        )}
      >
        <TestimonialForm
          key={editing ? `edit-${editing.id}` : 'create'}
          initialTestimonial={editing}
          apiErrors={saveErrors}
          onSubmit={values => saveMutation.mutate({ values, testimonialId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Testimonial?"
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
          Are you sure you want to delete the testimonial from {deleteTarget?.name}? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        open={bulkDeleteTargets !== null}
        onClose={() => setBulkDeleteTargets(null)}
        title="Delete Selected Testimonials"
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
          Delete {bulkDeleteTargets?.length ?? 0} selected {(bulkDeleteTargets?.length ?? 0) === 1 ? 'testimonial' : 'testimonials'}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
