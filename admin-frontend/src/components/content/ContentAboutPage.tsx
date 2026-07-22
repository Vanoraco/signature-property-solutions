'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, ChevronDown, ChevronUp, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import api from '@/lib/api'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import MediaPickerDialog from '@/components/media/MediaLibrary'
import {
  ABOUT_IMAGE_FIELDS,
  aboutScalarFields,
  aboutFormSchema,
  aboutToFormValues,
  normalizeContentApiErrors,
  toAboutImageFormData,
  toAboutPayload,
  type AboutFormValues,
  type AboutImageField,
  type ContentApiErrors,
} from './content-form'
import { Field, inputProps, Section, textareaProps } from './Field'
import PhotoField from './PhotoField'
import { pickSingleton, type AboutRecord, type SingletonCollection } from './types'
import styles from './ContentForm.module.css'

const ABOUT_QUERY_KEY = ['content', 'about'] as const

const ABOUT_FIELDS = [
  ...aboutScalarFields,
  'intro_paragraphs', 'value_items', 'why_items', 'commitment_paragraphs',
] as const
const fieldsTracked = new Set<string>([...ABOUT_FIELDS, ...ABOUT_IMAGE_FIELDS, 'clear_images'])

const IMAGE_META: Array<{ field: AboutImageField; label: string; description: string }> = [
  { field: 'image', label: 'Hero image', description: 'Main photo in the About hero.' },
]

type ImageSlotState = {
  file: File | null
  preview: string | null
  removed: boolean
}

function emptySlots(): Record<AboutImageField, ImageSlotState> {
  return {
    image: { file: null, preview: null, removed: false },
    aboutus_image: { file: null, preview: null, removed: false },
    vision_image: { file: null, preview: null, removed: false },
    mission_image: { file: null, preview: null, removed: false },
    value_image: { file: null, preview: null, removed: false },
    ceo_image: { file: null, preview: null, removed: false },
  }
}

type TextListName = 'intro_paragraphs' | 'commitment_paragraphs'
type RowError = {
  text?: { message?: string }
  tag?: { message?: string }
  title?: { message?: string }
}

interface ListEditorProps {
  control: Control<AboutFormValues>
  register: UseFormRegister<AboutFormValues>
  errors: FieldErrors<AboutFormValues>
  serverError?: string
}

function OrderActions({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  label: string
  onMove: (from: number, to: number) => void
  onRemove: () => void
}) {
  return (
    <div className={styles.rowActions}>
      <button
        type="button"
        className={styles.rowAction}
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        aria-label={`Move ${label} up`}
        title="Move up"
      >
        <ChevronUp aria-hidden="true" size={15} />
      </button>
      <button
        type="button"
        className={styles.rowAction}
        onClick={() => onMove(index, index + 1)}
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
        title="Move down"
      >
        <ChevronDown aria-hidden="true" size={15} />
      </button>
      <button
        type="button"
        className={`${styles.rowAction} ${styles.rowActionDanger}`}
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        title="Remove"
      >
        <Trash2 aria-hidden="true" size={14} />
      </button>
    </div>
  )
}

function OrderedTextList({
  name,
  label,
  addLabel,
  control,
  register,
  errors,
  serverError,
}: ListEditorProps & { name: TextListName; label: string; addLabel: string }) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name,
    keyName: 'formKey',
  })
  const listErrors = errors[name] as RowError[] | undefined

  return (
    <div className={styles.rowList}>
      {serverError ? <p className={styles.listError} role="alert">{serverError}</p> : null}
      {fields.map((field, index) => {
        const error = listErrors?.[index]?.text?.message
        return (
          <div key={field.formKey} className={`${styles.row} ${styles.rowSingle}`}>
            <span className={styles.rowIndex}>{index + 1}</span>
            <div className={styles.rowFields}>
              <input type="hidden" {...register(`${name}.${index}.key`)} />
              <textarea
                {...textareaProps(`${name}-${field.formKey}-text`, error, 3)}
                aria-label={`${label} ${index + 1}`}
                placeholder={`${label} text`}
                {...register(`${name}.${index}.text`)}
              />
              {error ? <p className={styles.errorText}>{error}</p> : null}
            </div>
            <OrderActions
              index={index}
              count={fields.length}
              label={`${label.toLowerCase()} ${index + 1}`}
              onMove={move}
              onRemove={() => remove(index)}
            />
          </div>
        )
      })}
      <button
        type="button"
        className={styles.addRow}
        onClick={() => append({ id: null, key: '', text: '' })}
      >
        <Plus aria-hidden="true" size={14} />
        {addLabel}
      </button>
    </div>
  )
}

function ValueList({ control, register, errors, serverError }: ListEditorProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'value_items',
    keyName: 'formKey',
  })
  const listErrors = errors.value_items as RowError[] | undefined

  return (
    <div className={styles.rowList}>
      {serverError ? <p className={styles.listError} role="alert">{serverError}</p> : null}
      {fields.map((field, index) => {
        const rowErrors = listErrors?.[index]
        return (
          <div key={field.formKey} className={styles.row}>
            <div>
              <span className={styles.rowIndex}>{index + 1}</span>
              <input type="hidden" {...register(`value_items.${index}.key`)} />
              <input
                {...inputProps(`value-${field.formKey}-tag`, rowErrors?.tag?.message)}
                aria-label={`Value ${index + 1} label`}
                placeholder="Value label"
                {...register(`value_items.${index}.tag`)}
              />
              {rowErrors?.tag?.message ? <p className={styles.errorText}>{rowErrors.tag.message}</p> : null}
            </div>
            <div className={styles.rowFields}>
              <textarea
                {...textareaProps(`value-${field.formKey}-text`, rowErrors?.text?.message, 3)}
                aria-label={`Value ${index + 1} description`}
                placeholder="Value description"
                {...register(`value_items.${index}.text`)}
              />
              {rowErrors?.text?.message ? <p className={styles.errorText}>{rowErrors.text.message}</p> : null}
            </div>
            <OrderActions
              index={index}
              count={fields.length}
              label={`value ${index + 1}`}
              onMove={move}
              onRemove={() => remove(index)}
            />
          </div>
        )
      })}
      <button
        type="button"
        className={styles.addRow}
        onClick={() => append({ id: null, key: '', tag: '', text: '' })}
      >
        <Plus aria-hidden="true" size={14} />
        Add value
      </button>
    </div>
  )
}

function ReasonList({ control, register, errors, serverError }: ListEditorProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'why_items',
    keyName: 'formKey',
  })
  const listErrors = errors.why_items as RowError[] | undefined

  return (
    <div className={styles.rowList}>
      {serverError ? <p className={styles.listError} role="alert">{serverError}</p> : null}
      {fields.map((field, index) => {
        const rowErrors = listErrors?.[index]
        return (
          <div key={field.formKey} className={styles.row}>
            <div>
              <span className={styles.rowIndex}>{index + 1}</span>
              <input type="hidden" {...register(`why_items.${index}.key`)} />
              <input
                {...inputProps(`reason-${field.formKey}-title`, rowErrors?.title?.message)}
                aria-label={`Reason ${index + 1} title`}
                placeholder="Reason title"
                {...register(`why_items.${index}.title`)}
              />
              {rowErrors?.title?.message ? <p className={styles.errorText}>{rowErrors.title.message}</p> : null}
            </div>
            <div className={styles.rowFields}>
              <textarea
                {...textareaProps(`reason-${field.formKey}-text`, rowErrors?.text?.message, 3)}
                aria-label={`Reason ${index + 1} description`}
                placeholder="Reason description"
                {...register(`why_items.${index}.text`)}
              />
              {rowErrors?.text?.message ? <p className={styles.errorText}>{rowErrors.text.message}</p> : null}
            </div>
            <OrderActions
              index={index}
              count={fields.length}
              label={`reason ${index + 1}`}
              onMove={move}
              onRemove={() => remove(index)}
            />
          </div>
        )
      })}
      <button
        type="button"
        className={styles.addRow}
        onClick={() => append({ id: null, key: '', title: '', text: '' })}
      >
        <Plus aria-hidden="true" size={14} />
        Add reason
      </button>
    </div>
  )
}

export default function ContentAboutPage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [apiErrors, setApiErrors] = useState<ContentApiErrors | null>(null)
  const [slots, setSlots] = useState(emptySlots)
  const [pickerField, setPickerField] = useState<AboutImageField | null>(null)
  const previewRefs = useRef<Partial<Record<AboutImageField, string>>>({})

  const recordQuery = useQuery({
    queryKey: ABOUT_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const response = await api.get<SingletonCollection<AboutRecord>>('/about/', { signal })
      return response.data
    },
    staleTime: 15 * 60_000,
  })
  const record = pickSingleton(recordQuery.data)
  const valuesForRecord = record ? aboutToFormValues(record) : undefined

  const {
    register,
    control,
    setError,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<AboutFormValues>({
    resolver: zodResolver(aboutFormSchema),
    defaultValues: aboutToFormValues(null),
    mode: 'onBlur',
    values: valuesForRecord,
  })

  const dirtyMap = dirtyFields as Record<string, boolean>
  const imagesDirty = ABOUT_IMAGE_FIELDS.some(
    field => slots[field].file !== null || slots[field].removed,
  )

  useEffect(() => () => {
    Object.values(previewRefs.current).forEach(url => {
      if (url) URL.revokeObjectURL(url)
    })
  }, [])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof AboutFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const assignFile = (field: AboutImageField, file: File) => {
    const previous = previewRefs.current[field]
    if (previous) URL.revokeObjectURL(previous)
    const nextPreview = URL.createObjectURL(file)
    previewRefs.current[field] = nextPreview
    setSlots(prev => ({
      ...prev,
      [field]: { file, preview: nextPreview, removed: false },
    }))
  }

  const removeImage = (field: AboutImageField) => {
    const previous = previewRefs.current[field]
    if (previous) URL.revokeObjectURL(previous)
    delete previewRefs.current[field]
    setSlots(prev => ({
      ...prev,
      [field]: { file: null, preview: null, removed: true },
    }))
  }

  const saveMutation = useMutation({
    mutationFn: async (values: AboutFormValues) => {
      const payload = toAboutPayload(values)
      let pageId = record?.id

      if (pageId) {
        await api.patch(`/about/${pageId}/`, payload)
      } else {
        const created = await api.post<AboutRecord>('/about/', payload)
        pageId = created.data.id
      }

      const images: Partial<Record<AboutImageField, File | null>> = {}
      const clearImages: AboutImageField[] = []
      ABOUT_IMAGE_FIELDS.forEach(field => {
        const slot = slots[field]
        if (slot.file) images[field] = slot.file
        else if (slot.removed) clearImages.push(field)
      })
      if (pageId && (Object.keys(images).length > 0 || clearImages.length > 0)) {
        const data = toAboutImageFormData(images, clearImages)
        await api.patch(`/about/${pageId}/`, data)
      }
    },
    onMutate: () => {
      setApiErrors(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      setSlots(emptySlots)
      Object.values(previewRefs.current).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
      previewRefs.current = {}
      await queryClient.invalidateQueries({ queryKey: ABOUT_QUERY_KEY })
      setFeedback(createAdminToastFeedback('About page content saved.'))
    },
    onError: error => {
      const data = (error as { response?: { data?: unknown } }).response?.data
      setApiErrors(normalizeContentApiErrors(data, fieldsTracked))
    },
  })

  const submit = (values: AboutFormValues) => saveMutation.mutate(values)
  const isLoading = recordQuery.isLoading
  const isError = recordQuery.isError
  const isSaving = saveMutation.isPending
  const canSave = isDirty || imagesDirty

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading about content">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <Header />
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">About content could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => recordQuery.refetch()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        actions={(
          <button
            type="submit"
            form="content-about-form"
            className="btn btn-brass"
            disabled={isSaving || !canSave}
            aria-busy={isSaving}
          >
            {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Check aria-hidden="true" size={15} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      />

      {feedback ? (
        <AdminToast
          eventId={feedback.id}
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <form id="content-about-form" className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        {apiErrors?.form ? (
          <div className={styles.formAlert} role="alert">
            <AlertCircle aria-hidden="true" size={16} />
            <span>{apiErrors.form}</span>
          </div>
        ) : null}

        <Section
          title="Header"
          description="Top of the About page."
          fields={['hero_eyebrow', 'hero_title', 'hero_lead']}
          dirtyFields={dirtyMap}
          formId="content-about-form"
          saving={isSaving}
        >
          <Field label="Eyebrow" htmlFor="about-hero_eyebrow" error={errors.hero_eyebrow?.message}>
            <input id="about-hero_eyebrow" {...inputProps('about-hero_eyebrow', errors.hero_eyebrow?.message)} {...register('hero_eyebrow')} />
          </Field>
          <Field label="Title" htmlFor="about-hero_title" error={errors.hero_title?.message}>
            <input id="about-hero_title" {...inputProps('about-hero_title', errors.hero_title?.message)} {...register('hero_title')} />
          </Field>
          <Field label="Hero lead" htmlFor="about-hero_lead" error={errors.hero_lead?.message} hint="Short paragraph shown under the title." spanTwo>
            <textarea id="about-hero_lead" {...textareaProps('about-hero_lead', errors.hero_lead?.message, 3)} {...register('hero_lead')} />
          </Field>
        </Section>

        <section className={`${styles.section} ${imagesDirty ? styles.sectionDirty : ''}`}>
          <div className={`${styles.sectionHead} ${imagesDirty ? styles.sectionHeadDirty : ''}`}>
            <div className={styles.sectionHeadCopy}>
              <h3>Hero image</h3>
              <p>Upload, replace, or remove the photo shown beside the public About hero text.</p>
            </div>
            {imagesDirty ? (
              <button
                type="submit"
                form="content-about-form"
                className={`btn btn-brass btn-sm ${styles.sectionSave}`}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Check aria-hidden="true" size={14} />}
                {isSaving ? 'Saving...' : 'Save section'}
              </button>
            ) : null}
          </div>
          <div className={styles.grid}>
            {IMAGE_META.map(meta => {
              const slot = slots[meta.field]
              const existing = record?.[meta.field] ?? null
              const previewUrl = slot.removed ? null : (slot.preview ?? existing)
              return (
                <div key={meta.field} className={styles.spanTwo}>
                  <PhotoField
                    label={meta.label}
                    description={meta.description}
                    previewUrl={previewUrl}
                    hasPendingFile={Boolean(slot.file)}
                    error={apiErrors?.fields[meta.field]}
                    onPickFile={file => assignFile(meta.field, file)}
                    onOpenLibrary={() => setPickerField(meta.field)}
                    onRemove={() => removeImage(meta.field)}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <Section
          title="Introduction"
          description="Ordered paragraphs shown beneath the About hero."
          fields={['intro_paragraphs']}
          dirtyFields={dirtyMap}
          formId="content-about-form"
          saving={isSaving}
        >
          <div className={styles.spanTwo}>
            <OrderedTextList
              name="intro_paragraphs"
              label="Paragraph"
              addLabel="Add paragraph"
              control={control}
              register={register}
              errors={errors}
              serverError={apiErrors?.fields.intro_paragraphs}
            />
          </div>
        </Section>

        <Section
          title="Vision and mission"
          description="The two statements shown in the split vision/mission cards."
          fields={['vision_statement', 'mission_statement']}
          dirtyFields={dirtyMap}
          formId="content-about-form"
          saving={isSaving}
        >
          <Field label="Vision" htmlFor="about-vision_statement" error={errors.vision_statement?.message}>
            <textarea id="about-vision_statement" {...textareaProps('about-vision_statement', errors.vision_statement?.message, 6)} {...register('vision_statement')} />
          </Field>
          <Field label="Mission" htmlFor="about-mission_statement" error={errors.mission_statement?.message}>
            <textarea id="about-mission_statement" {...textareaProps('about-mission_statement', errors.mission_statement?.message, 6)} {...register('mission_statement')} />
          </Field>
        </Section>

        <Section
          title="Core values"
          description="Ordered value cards shown in the four-column public grid."
          fields={['value_items']}
          dirtyFields={dirtyMap}
          formId="content-about-form"
          saving={isSaving}
        >
          <div className={styles.spanTwo}>
            <ValueList
              control={control}
              register={register}
              errors={errors}
              serverError={apiErrors?.fields.value_items}
            />
          </div>
        </Section>

        <Section
          title="Why choose us"
          description="Ordered reason cards shown in the two-column public grid."
          fields={['why_choose_title', 'why_items']}
          dirtyFields={dirtyMap}
          formId="content-about-form"
          saving={isSaving}
        >
          <Field label="Section title" htmlFor="about-why_choose_title" error={errors.why_choose_title?.message} spanTwo>
            <input id="about-why_choose_title" {...inputProps('about-why_choose_title', errors.why_choose_title?.message)} {...register('why_choose_title')} />
          </Field>
          <div className={styles.spanTwo}>
            <ReasonList
              control={control}
              register={register}
              errors={errors}
              serverError={apiErrors?.fields.why_items}
            />
          </div>
        </Section>

        <Section
          title="Commitment panel"
          description="Closing promise and ordered paragraphs shown at the bottom of the About page."
          fields={['commitment_promise', 'commitment_paragraphs']}
          dirtyFields={dirtyMap}
          formId="content-about-form"
          saving={isSaving}
        >
          <Field label="Promise line" htmlFor="about-commitment_promise" error={errors.commitment_promise?.message} hint="Italic headline of the closing panel." spanTwo>
            <input id="about-commitment_promise" {...inputProps('about-commitment_promise', errors.commitment_promise?.message)} {...register('commitment_promise')} />
          </Field>
          <div className={styles.spanTwo}>
            <OrderedTextList
              name="commitment_paragraphs"
              label="Paragraph"
              addLabel="Add commitment paragraph"
              control={control}
              register={register}
              errors={errors}
              serverError={apiErrors?.fields.commitment_paragraphs}
            />
          </div>
        </Section>
      </form>

      <MediaPickerDialog
        open={pickerField !== null}
        onClose={() => setPickerField(null)}
        onSelect={async file => {
          if (pickerField) assignFile(pickerField, file)
          setPickerField(null)
        }}
        title="Choose image"
      />
    </div>
  )
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        <div className="page-eyebrow">Content</div>
        <h1 className="page-title">About Page</h1>
        <p className="page-desc">Edit the public About hero, ordered narrative, vision, mission, value cards, reasons, and commitment.</p>
      </div>
      {actions}
    </div>
  )
}
