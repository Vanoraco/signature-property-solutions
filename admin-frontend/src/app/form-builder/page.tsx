'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DragEvent, FormEvent, KeyboardEvent } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  GripVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import api from '@/lib/api'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'

type FieldType = 'text' | 'tel' | 'email' | 'textarea' | 'select'

interface FormField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

interface FieldDraft extends FormField {
  isNew: boolean
  optionsText: string
}

const FIELD_TYPE_META: Record<FieldType, string> = {
  text: 'Text',
  tel: 'Phone',
  email: 'Email',
  textarea: 'Paragraph',
  select: 'Dropdown',
}

const INITIAL_FIELDS: FormField[] = [
  { id: 'name', label: 'Full Name', type: 'text', required: true },
  { id: 'phone_number', label: 'Phone Number', type: 'tel', required: true },
  { id: 'email', label: 'Email Address', type: 'email', required: false },
  {
    id: 'property_type',
    label: 'Property Type',
    type: 'select',
    required: true,
    options: ['Apartment', 'Penthouse', 'House', 'Building', 'Warehouse', 'Office', 'Land'],
  },
  { id: 'goal', label: 'Goal', type: 'select', required: true, options: ['Rent', 'Buy', 'Invest', 'Other'] },
  { id: 'location', label: 'Preferred Location', type: 'text', required: false },
  { id: 'budget', label: 'Budget', type: 'text', required: false },
  { id: 'message', label: 'Message', type: 'textarea', required: true },
]

const controlClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[13.5px] text-text-main outline-none transition focus:border-brass focus:ring-2 focus:ring-brass-tint'

const previewControlClass =
  'fake-input block w-full outline-none transition focus:border-brass focus:ring-2 focus:ring-brass-tint'

function newFieldId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

interface RequestFormFieldRow {
  key: string
  label: string
  field_type: FieldType
  is_required: boolean
  options?: string[]
  position: number
}

function toFormField(row: RequestFormFieldRow): FormField {
  return {
    id: row.key,
    label: row.label,
    type: row.field_type,
    required: row.is_required,
    ...(row.field_type === 'select' ? { options: row.options ?? [] } : {}),
  }
}

function toRequestRow(field: FormField) {
  return {
    key: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.type === 'select' ? (field.options ?? []) : [],
  }
}

export default function FormBuilderPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<FieldDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FormField | null>(null)
  const [dirty, setDirty] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const formFieldsQuery = useQuery({
    queryKey: ['request-form-fields'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ count: number; results: RequestFormFieldRow[] }>(
        '/request-form-fields/',
        { signal },
      )
      const rows = data?.results ?? []
      return rows.length ? rows.map(toFormField) : INITIAL_FIELDS
    },
    // The query cache is the single source of truth for the working copy:
    // the builder edits it through updateFields, so there is no local
    // state to keep in sync and nothing is lost on refetch.
    placeholderData: INITIAL_FIELDS,
  })

  const fields = formFieldsQuery.data ?? INITIAL_FIELDS

  const updateFields = (updater: (current: FormField[]) => FormField[]) => {
      setDirty(true)
      queryClient.setQueryData<FormField[]>(['request-form-fields'], current => updater(current ?? []))
    }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/request-form-fields/save-all/', {
        fields: fields.map(toRequestRow),
      }),
    onSuccess: () => {
          setDirty(false)
          showFeedback('Form changes saved')
          void queryClient.invalidateQueries({ queryKey: ['request-form-fields'] })
        },
    onError: () => {
      showFeedback('Failed to save form changes. Please try again.', 'danger')
    },
  })

  const showFeedback = (message: string, tone: AdminToastFeedback['tone'] = 'success') => {
    setFeedback(createAdminToastFeedback(message, tone))
  }

  const openFieldEditor = (field?: FormField) => {
    setEditorError('')
    setDraft(
      field
        ? { ...field, isNew: false, optionsText: field.options?.join(', ') ?? '' }
        : {
            id: newFieldId(),
            label: 'New Field',
            type: 'text',
            required: false,
            isNew: true,
            optionsText: '',
          },
    )
  }

  const closeFieldEditor = () => {
    setDraft(null)
    setEditorError('')
  }

  const saveField = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft) return

    const label = draft.label.trim()
    if (!label) {
      setEditorError('Field label is required.')
      return
    }

    const nextField: FormField = {
      id: draft.id,
      label,
      type: draft.type,
      required: draft.required,
      ...(draft.type === 'select'
        ? {
            options: draft.optionsText
              .split(',')
              .map(option => option.trim())
              .filter(Boolean),
          }
        : {}),
    }

    updateFields(current =>
      draft.isNew
        ? [...current, nextField]
        : current.map(field => (field.id === nextField.id ? nextField : field)),
    )
    closeFieldEditor()
    showFeedback(draft.isNew ? 'Field added' : 'Field updated')
  }

  const toggleRequired = (id: string) => {
    updateFields(current =>
      current.map(field => (field.id === id ? { ...field, required: !field.required } : field)),
    )
  }

  const removeField = (current: FormField[], id: string) =>
      current.filter(field => field.id !== id)

    const confirmDeleteField = () => {
      if (!deleteTarget) return
      updateFields(current => removeField(current, deleteTarget.id))
      showFeedback(`"${deleteTarget.label}" removed. Click Save Changes to publish.`)
      setDeleteTarget(null)
    }

  const moveField = (id: string, targetIndex: number) => {
    updateFields(current => {
      const fromIndex = current.findIndex(field => field.id === id)
      if (fromIndex < 0 || targetIndex < 0 || targetIndex >= current.length || fromIndex === targetIndex) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDropTargetId(null)
      return
    }

    const targetIndex = fields.findIndex(field => field.id === targetId)
    moveField(draggedId, targetIndex)
    setDraggedId(null)
    setDropTargetId(null)
  }

  const handleReorderKey = (event: KeyboardEvent<HTMLButtonElement>, field: FormField, index: number) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    moveField(field.id, index + (event.key === 'ArrowUp' ? -1 : 1))
  }

  const isSaving = saveMutation.isPending

  return (
      <div>
        <div className="page-head">
        <div>
          <div className="page-eyebrow">Marketing</div>
          <h1 className="page-title">Form Builder</h1>
          <p className="page-desc">
            Customize the &quot;Request a Property&quot; lead form shown across the public site. Drag to reorder.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-brass"
          onClick={() => saveMutation.mutate()}
          disabled={isSaving}
        >
          {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {dirty && !isSaving && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-[6px] border border-brass/40 bg-brass/5 px-3 py-2 text-[12.5px] text-ink"
        >
          <AlertTriangle size={15} className="shrink-0 text-brass" />
          <span>
            <strong>Unsaved changes.</strong> Click &quot;Save Changes&quot; to publish — edits here
            only apply to this form once you save.
          </span>
        </div>
      )}

      <div className="fb-layout">
        <section className="panel" aria-labelledby="form-fields-heading">
          <div className="panel-head">
            <div>
              <h2 id="form-fields-heading">Form Fields</h2>
              <p className="mt-0.5 text-[11.5px] text-text-faint font-mono">
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openFieldEditor()}>
              <Plus size={15} />
              Add Field
            </button>
          </div>

          <div className="panel-body">
            {fields.length === 0 ? (
              <div className="rounded-[9px] border border-dashed border-border px-5 py-12 text-center">
                <p className="text-[13px] font-semibold text-text-main">No fields yet</p>
                <button
                  type="button"
                  className="btn btn-brass btn-sm mt-4"
                  onClick={() => openFieldEditor()}
                >
                  <Plus size={15} />
                  Add Field
                </button>
              </div>
            ) : (
              fields.map((field, index) => {
                const optionCount = field.type === 'select' ? field.options?.length ?? 0 : 0
                const typeLabel = `${FIELD_TYPE_META[field.type]}${
                  field.type === 'select' ? ` · ${optionCount} ${optionCount === 1 ? 'option' : 'options'}` : ''
                }`

                return (
                  <div
                    key={field.id}
                    className={`fb-field-row ${draggedId === field.id ? 'dragging' : ''}`}
                    style={dropTargetId === field.id ? { borderColor: 'var(--brass)' } : undefined}
                    onDragEnter={() => draggedId && setDropTargetId(field.id)}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => handleDrop(event, field.id)}
                  >
                    <button
                      type="button"
                      className="fb-handle border-0 bg-transparent p-1"
                      draggable
                      aria-label={`Reorder ${field.label}`}
                      title="Drag to reorder"
                      onDragStart={event => {
                        setDraggedId(field.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', field.id)
                      }}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDropTargetId(null)
                      }}
                      onKeyDown={event => handleReorderKey(event, field, index)}
                    >
                      <GripVertical size={16} />
                    </button>

                    <div className="fb-field-info">
                      <div className="fb-field-label">
                        {field.label}
                        {field.required && <span className="ml-1 text-danger">*</span>}
                      </div>
                      <div className="fb-field-type">{typeLabel}</div>
                    </div>

                    <div className="fb-field-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}
                        aria-label={`Edit ${field.label}`}
                        title="Edit field"
                        onClick={() => openFieldEditor(field)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}
                        aria-label={`${field.required ? 'Make' : 'Mark'} ${field.label} ${
                          field.required ? 'optional' : 'required'
                        }`}
                        aria-pressed={field.required}
                        title={field.required ? 'Make optional' : 'Mark as required'}
                        onClick={() => toggleRequired(field.id)}
                      >
                        {field.required ? <Check size={14} /> : <X size={14} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}
                        aria-label={`Delete ${field.label}`}
                                                title="Delete field"
                                                onClick={() => setDeleteTarget(field)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="preview-frame" aria-labelledby="form-preview-heading">
          <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[1.3px] text-text-faint">
            Live Preview
          </div>
          <h2 id="form-preview-heading" className="font-display text-[19px] font-semibold text-ink">
            Request a Property
          </h2>
          <p className="mb-[18px] mt-1 text-[12.5px] text-text-soft">
            Tell us what you&apos;re looking for and an agent will follow up.
          </p>

          <form onSubmit={event => event.preventDefault()}>
            {fields.map(field => (
              <div className="preview-form-field" key={field.id}>
                <label htmlFor={`preview-${field.id}`}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`preview-${field.id}`}
                    className={`${previewControlClass} min-h-[68px] resize-none`}
                    placeholder="Type here..."
                    required={field.required}
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <div className="relative">
                    <select
                      id={`preview-${field.id}`}
                      className={`${previewControlClass} appearance-none pr-9`}
                      defaultValue=""
                      required={field.required}
                    >
                      <option value="" disabled>
                        Select...
                      </option>
                      {(field.options ?? []).map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint"
                    />
                  </div>
                ) : (
                  <input
                    id={`preview-${field.id}`}
                    className={previewControlClass}
                    type={field.type}
                    placeholder={
                      field.type === 'email' ? 'name@example.com' : field.type === 'tel' ? '+251 ...' : 'Type here...'
                    }
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <button type="submit" className="btn btn-brass mt-1 w-full justify-center">
              Submit Request
            </button>
          </form>
        </section>
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={closeFieldEditor}
        title={draft?.isNew ? 'Add Field' : 'Edit Field'}
        description="Configure this form field."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeFieldEditor}>
              Cancel
            </button>
            <button type="submit" form="field-editor-form" className="btn btn-primary">
              <Check size={15} />
              Save Field
            </button>
          </>
        }
      >
        {draft && (
          <form id="field-editor-form" onSubmit={saveField}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="field-label" className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
                  Field Label
                </label>
                <input
                  id="field-label"
                  className={controlClass}
                  type="text"
                  value={draft.label}
                  autoFocus
                  aria-invalid={Boolean(editorError)}
                  aria-describedby={editorError ? 'field-label-error' : undefined}
                  onChange={event => {
                    setDraft(current => (current ? { ...current, label: event.target.value } : current))
                    if (editorError) setEditorError('')
                  }}
                />
                {editorError && (
                  <p id="field-label-error" className="mt-1.5 text-[11.5px] text-danger">
                    {editorError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="field-type" className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">
                  Field Type
                </label>
                <select
                  id="field-type"
                  className={controlClass}
                  value={draft.type}
                  onChange={event =>
                    setDraft(current =>
                      current ? { ...current, type: event.target.value as FieldType } : current,
                    )
                  }
                >
                  {(Object.entries(FIELD_TYPE_META) as [FieldType, string][]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="mb-1.5 block text-[12.5px] font-semibold text-text-soft">Required</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.required}
                  className={`relative mt-1 h-6 w-11 rounded-full border transition ${
                    draft.required ? 'border-brass bg-brass' : 'border-border bg-border-soft'
                  }`}
                  onClick={() =>
                    setDraft(current => (current ? { ...current, required: !current.required } : current))
                  }
                >
                  <span
                    className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition ${
                      draft.required ? 'left-[21px]' : 'left-0.5'
                    }`}
                  />
                  <span className="sr-only">Toggle required field</span>
                </button>
              </div>

              {draft.type === 'select' && (
                <div className="sm:col-span-2">
                  <label
                    htmlFor="field-options"
                    className="mb-1.5 block text-[12.5px] font-semibold text-text-soft"
                  >
                    Options (comma-separated)
                  </label>
                  <input
                    id="field-options"
                    className={controlClass}
                    type="text"
                    value={draft.optionsText}
                    placeholder="Apartment, House, Office"
                    onChange={event =>
                      setDraft(current => (current ? { ...current, optionsText: event.target.value } : current))
                    }
                  />
                </div>
              )}
            </div>
          </form>
        )}
      </Modal>

            <Modal
              open={Boolean(deleteTarget)}
              onClose={() => setDeleteTarget(null)}
              title="Delete field?"
              footer={
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDeleteField}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              }
            >
              <p className="text-[13.5px] text-text-soft">
                &quot;{deleteTarget?.label}&quot; will be removed from the form. This applies immediately
                and takes effect on the public site once you click &quot;Save Changes.&quot;
              </p>
            </Modal>

            {feedback ? (
        <AdminToast
          eventId={feedback.id}
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </div>
  )
}
