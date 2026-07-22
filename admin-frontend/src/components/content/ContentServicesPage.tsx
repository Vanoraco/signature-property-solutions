'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import MediaPickerDialog from '@/components/media/MediaLibrary'
import {
  normalizeContentApiErrors,
  servicesPageFormSchema,
  servicesPageScalarFields,
  servicesPageToFormValues,
  toServicesPagePayload,
  type ContentApiErrors,
  type ServicesPageFormValues,
} from './content-form'
import { Field, inputProps, Section, textareaProps } from './Field'
import PhotoField from './PhotoField'
import { pickSingleton, type ServicesPageRecord, type SingletonCollection } from './types'
import styles from './ContentForm.module.css'

const SERVICES_PAGE_QUERY_KEY = ['content', 'services-page'] as const

const fieldsTracked = new Set<string>([
  ...servicesPageScalarFields,
  'why_items', 'process_steps', 'service_items',
  'hero_image', 'clear_images',
])

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
      <button type="button" className={styles.rowAction} onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label={`Move ${label} up`} title="Move up">
        <ArrowUp aria-hidden="true" size={14} />
      </button>
      <button type="button" className={styles.rowAction} onClick={() => onMove(index, index + 1)} disabled={index === count - 1} aria-label={`Move ${label} down`} title="Move down">
        <ArrowDown aria-hidden="true" size={14} />
      </button>
      <button type="button" className={`${styles.rowAction} ${styles.rowActionDanger}`} onClick={onRemove} aria-label={`Remove ${label}`} title="Remove">
        <Trash2 aria-hidden="true" size={14} />
      </button>
    </div>
  )
}

interface ItemListProps {
  name: 'why_items' | 'process_steps'
  control: Control<ServicesPageFormValues>
  errors: FieldErrors<ServicesPageFormValues>
  titlePlaceholder: string
  textPlaceholder: string
  addLabel: string
}

function ItemList({ name, control, errors, titlePlaceholder, textPlaceholder, addLabel }: ItemListProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name, keyName: 'formKey' })
  const listErrors = errors[name]

  return (
    <div className={styles.rowList}>
      {fields.map((field, index) => {
        const rowErrors = Array.isArray(listErrors) ? listErrors[index] : undefined
        return (
          <div key={field.formKey} className={styles.row}>
            <div>
              <span className={styles.rowIndex}>{index + 1}</span>
              <input type="hidden" {...control.register(`${name}.${index}.key`)} />
              <div className={styles.rowFields}>
                <input
                  {...inputProps(`${name}-${field.formKey}-title`, rowErrors?.title?.message)}
                  placeholder={titlePlaceholder}
                  aria-label={`Item ${index + 1} title`}
                  {...control.register(`${name}.${index}.title`)}
                />
              </div>
            </div>
            <div className={styles.rowFields}>
              <textarea
                {...textareaProps(`${name}-${field.formKey}-text`, rowErrors?.text?.message, 2)}
                placeholder={textPlaceholder}
                aria-label={`Item ${index + 1} text`}
                {...control.register(`${name}.${index}.text`)}
              />
              {rowErrors?.title?.message ? <p className={styles.errorText}>{rowErrors.title.message}</p> : null}
              {rowErrors?.text?.message ? <p className={styles.errorText}>{rowErrors.text.message}</p> : null}
            </div>
            <OrderActions
              index={index}
              count={fields.length}
              label={`item ${index + 1}`}
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
        {addLabel}
      </button>
    </div>
  )
}

type InputError = { message?: string }
type TextRowError = { text?: InputError }
type TagGroupRowError = {
  title?: InputError
  items?: TextRowError[]
}
type ServiceRowError = {
  tag?: InputError
  title?: InputError
  tagline?: InputError
  paragraphs?: TextRowError[]
  tag_groups?: TagGroupRowError[]
}

interface NestedEditorProps {
  control: Control<ServicesPageFormValues>
  register: UseFormRegister<ServicesPageFormValues>
  errors: FieldErrors<ServicesPageFormValues>
}

function TagGroupEditor({
  serviceIndex,
  groupIndex,
  groupCount,
  control,
  register,
  error,
  onMove,
  onRemove,
}: Omit<NestedEditorProps, 'errors'> & {
  serviceIndex: number
  groupIndex: number
  groupCount: number
  error?: TagGroupRowError
  onMove: (from: number, to: number) => void
  onRemove: () => void
}) {
  const itemsName = `service_items.${serviceIndex}.tag_groups.${groupIndex}.items` as const
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: itemsName,
    keyName: 'formKey',
  })

  return (
    <div className={styles.tagGroup}>
      <div className={styles.tagGroupHead}>
        <span className={styles.subsectionLabel}>Tag group {groupIndex + 1}</span>
        <OrderActions
          index={groupIndex}
          count={groupCount}
          label={`tag group ${groupIndex + 1}`}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>
      <input
        type="hidden"
        {...register(`service_items.${serviceIndex}.tag_groups.${groupIndex}.key`)}
      />
      <Field
        label="Group title"
        htmlFor={`service-${serviceIndex}-group-${groupIndex}-title`}
        error={error?.title?.message}
      >
        <input
          {...inputProps(`service-${serviceIndex}-group-${groupIndex}-title`, error?.title?.message)}
          {...register(`service_items.${serviceIndex}.tag_groups.${groupIndex}.title`)}
        />
      </Field>
      <div className={styles.compactList}>
        {fields.map((field, itemIndex) => {
          const itemError = error?.items?.[itemIndex]?.text?.message
          return (
            <div key={field.formKey} className={styles.compactRow}>
              <span className={styles.rowIndex}>{itemIndex + 1}</span>
              <div className={styles.rowFields}>
                <input
                  type="hidden"
                  {...register(`service_items.${serviceIndex}.tag_groups.${groupIndex}.items.${itemIndex}.key`)}
                />
                <input
                  {...inputProps(`service-${serviceIndex}-group-${groupIndex}-item-${field.formKey}`, itemError)}
                  aria-label={`Tag group ${groupIndex + 1} item ${itemIndex + 1}`}
                  placeholder="Tag text"
                  {...register(`service_items.${serviceIndex}.tag_groups.${groupIndex}.items.${itemIndex}.text`)}
                />
                {itemError ? <p className={styles.errorText}>{itemError}</p> : null}
              </div>
              <OrderActions
                index={itemIndex}
                count={fields.length}
                label={`tag item ${itemIndex + 1}`}
                onMove={move}
                onRemove={() => remove(itemIndex)}
              />
            </div>
          )
        })}
        <button type="button" className={styles.addRow} onClick={() => append({ id: null, key: '', text: '' })}>
          <Plus aria-hidden="true" size={14} />
          Add tag
        </button>
      </div>
    </div>
  )
}

function ServiceItemEditor({
  index,
  count,
  control,
  register,
  error,
  onMove,
  onRemove,
}: Omit<NestedEditorProps, 'errors'> & {
  index: number
  count: number
  error?: ServiceRowError
  onMove: (from: number, to: number) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(index === 0)
  const title = useWatch({ control, name: `service_items.${index}.title` })
  const paragraphsName = `service_items.${index}.paragraphs` as const
  const groupsName = `service_items.${index}.tag_groups` as const
  const paragraphs = useFieldArray({ control, name: paragraphsName, keyName: 'formKey' })
  const groups = useFieldArray({ control, name: groupsName, keyName: 'formKey' })

  return (
    <details
      className={styles.collectionItem}
      open={open}
      onToggle={event => setOpen(event.currentTarget.open)}
    >
      <summary className={styles.collectionSummary}>
        <span className={styles.rowIndex}>{index + 1}</span>
        <span>{title?.trim() || `Service ${index + 1}`}</span>
      </summary>
      <div className={styles.collectionBody}>
        <div className={styles.collectionToolbar}>
          <span className={styles.subsectionLabel}>Service order</span>
          <OrderActions
            index={index}
            count={count}
            label={`service ${index + 1}`}
            onMove={onMove}
            onRemove={onRemove}
          />
        </div>
        <input type="hidden" {...register(`service_items.${index}.key`)} />
        <div className={styles.nestedGrid}>
          <Field label="Category label" htmlFor={`service-${index}-tag`} error={error?.tag?.message}>
            <input
              {...inputProps(`service-${index}-tag`, error?.tag?.message)}
              {...register(`service_items.${index}.tag`)}
            />
          </Field>
          <Field label="Title" htmlFor={`service-${index}-title`} error={error?.title?.message}>
            <input
              {...inputProps(`service-${index}-title`, error?.title?.message)}
              {...register(`service_items.${index}.title`)}
            />
          </Field>
          <Field label="Tagline" htmlFor={`service-${index}-tagline`} error={error?.tagline?.message} spanTwo>
            <input
              {...inputProps(`service-${index}-tagline`, error?.tagline?.message)}
              {...register(`service_items.${index}.tagline`)}
            />
          </Field>
        </div>

        <div className={styles.subsection}>
          <div className={styles.subsectionHead}>
            <span className={styles.subsectionLabel}>Description paragraphs</span>
            <button type="button" className={styles.addRow} onClick={() => paragraphs.append({ id: null, key: '', text: '' })}>
              <Plus aria-hidden="true" size={14} />
              Add paragraph
            </button>
          </div>
          <div className={styles.compactList}>
            {paragraphs.fields.map((field, paragraphIndex) => {
              const paragraphError = error?.paragraphs?.[paragraphIndex]?.text?.message
              return (
                <div key={field.formKey} className={styles.compactRow}>
                  <span className={styles.rowIndex}>{paragraphIndex + 1}</span>
                  <div className={styles.rowFields}>
                    <input
                      type="hidden"
                      {...register(`service_items.${index}.paragraphs.${paragraphIndex}.key`)}
                    />
                    <textarea
                      {...textareaProps(`service-${index}-paragraph-${field.formKey}`, paragraphError, 3)}
                      aria-label={`Service ${index + 1} paragraph ${paragraphIndex + 1}`}
                      {...register(`service_items.${index}.paragraphs.${paragraphIndex}.text`)}
                    />
                    {paragraphError ? <p className={styles.errorText}>{paragraphError}</p> : null}
                  </div>
                  <OrderActions
                    index={paragraphIndex}
                    count={paragraphs.fields.length}
                    label={`paragraph ${paragraphIndex + 1}`}
                    onMove={paragraphs.move}
                    onRemove={() => paragraphs.remove(paragraphIndex)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.subsection}>
          <div className={styles.subsectionHead}>
            <span className={styles.subsectionLabel}>Tag groups</span>
            <button
              type="button"
              className={styles.addRow}
              onClick={() => groups.append({
                id: null,
                key: '',
                title: '',
                items: [{ id: null, key: '', text: '' }],
              })}
            >
              <Plus aria-hidden="true" size={14} />
              Add group
            </button>
          </div>
          <div className={styles.tagGroupList}>
            {groups.fields.map((group, groupIndex) => (
              <TagGroupEditor
                key={group.formKey}
                serviceIndex={index}
                groupIndex={groupIndex}
                groupCount={groups.fields.length}
                control={control}
                register={register}
                error={error?.tag_groups?.[groupIndex]}
                onMove={groups.move}
                onRemove={() => groups.remove(groupIndex)}
              />
            ))}
          </div>
        </div>
      </div>
    </details>
  )
}

function ServiceItemsEditor({ control, register, errors, serverError }: NestedEditorProps & { serverError?: string }) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'service_items',
    keyName: 'formKey',
  })
  const listErrors = errors.service_items as unknown as ServiceRowError[] | undefined

  return (
    <div className={styles.collectionList}>
      {serverError ? <p className={styles.listError} role="alert">{serverError}</p> : null}
      {fields.map((field, index) => (
        <ServiceItemEditor
          key={field.formKey}
          index={index}
          count={fields.length}
          control={control}
          register={register}
          error={listErrors?.[index]}
          onMove={move}
          onRemove={() => remove(index)}
        />
      ))}
      <button
        type="button"
        className={styles.addRow}
        onClick={() => append({
          id: null,
          key: '',
          tag: '',
          title: '',
          tagline: '',
           paragraphs: [{ id: null, key: '', text: '' }],
          tag_groups: [{
            id: null,
            key: '',
            title: '',
             items: [{ id: null, key: '', text: '' }],
          }],
        })}
      >
        <Plus aria-hidden="true" size={14} />
        Add service
      </button>
    </div>
  )
}

export default function ContentServicesPage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [apiErrors, setApiErrors] = useState<ContentApiErrors | null>(null)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [heroRemoved, setHeroRemoved] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const heroPreviewRef = useRef<string | null>(null)

  const recordQuery = useQuery({
    queryKey: SERVICES_PAGE_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const response = await api.get<SingletonCollection<ServicesPageRecord>>('/services-page/', { signal })
      return response.data
    },
    staleTime: 15 * 60_000,
  })
  const record = pickSingleton(recordQuery.data)
  const valuesForRecord = record ? servicesPageToFormValues(record) : undefined

  const {
    register,
    control,
    setError,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<ServicesPageFormValues>({
    resolver: zodResolver(servicesPageFormSchema),
    defaultValues: servicesPageToFormValues(null),
    mode: 'onBlur',
    values: valuesForRecord,
  })

  const dirtyMap = dirtyFields as Record<string, boolean>
  const heroDirty = heroFile !== null || heroRemoved

  useEffect(() => () => {
    if (heroPreviewRef.current) URL.revokeObjectURL(heroPreviewRef.current)
  }, [])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof ServicesPageFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const assignHeroFile = (file: File) => {
    if (heroPreviewRef.current) URL.revokeObjectURL(heroPreviewRef.current)
    const nextPreview = URL.createObjectURL(file)
    heroPreviewRef.current = nextPreview
    setHeroPreview(nextPreview)
    setHeroFile(file)
    setHeroRemoved(false)
  }

  const removeHero = () => {
    if (heroPreviewRef.current) URL.revokeObjectURL(heroPreviewRef.current)
    heroPreviewRef.current = null
    setHeroPreview(null)
    setHeroFile(null)
    setHeroRemoved(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (values: ServicesPageFormValues) => {
      const payload = toServicesPagePayload(values)
      let pageId = record?.id

      if (pageId) {
        await api.patch(`/services-page/${pageId}/`, payload)
      } else {
        const created = await api.post<ServicesPageRecord>('/services-page/', payload)
        pageId = created.data.id
      }

      if (pageId && heroFile) {
        const data = new FormData()
        data.append('hero_image', heroFile)
        await api.patch(`/services-page/${pageId}/`, data)
      } else if (pageId && heroRemoved) {
        await api.patch(`/services-page/${pageId}/`, { clear_images: ['hero_image'] })
      }
    },
    onMutate: () => {
      setApiErrors(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      if (heroPreviewRef.current) URL.revokeObjectURL(heroPreviewRef.current)
      heroPreviewRef.current = null
      setHeroFile(null)
      setHeroPreview(null)
      setHeroRemoved(false)
      await queryClient.invalidateQueries({ queryKey: SERVICES_PAGE_QUERY_KEY })
      setFeedback(createAdminToastFeedback('Services page content saved.'))
    },
    onError: error => {
      const data = (error as { response?: { data?: unknown } }).response?.data
      setApiErrors(normalizeContentApiErrors(data, fieldsTracked))
    },
  })

  const submit = (values: ServicesPageFormValues) => saveMutation.mutate(values)
  const isLoading = recordQuery.isLoading
  const isError = recordQuery.isError
  const isSaving = saveMutation.isPending
  const canSave = isDirty || heroDirty
  const heroPreviewUrl = heroRemoved ? null : (heroPreview ?? record?.hero_image ?? null)

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading services page content">
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
          <p className="text-[13px] font-semibold">Services page content could not be loaded.</p>
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
            form="content-services-form"
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

      <form id="content-services-form" className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        {apiErrors?.form ? (
          <div className={styles.formAlert} role="alert">
            <AlertCircle aria-hidden="true" size={16} />
            <span>{apiErrors.form}</span>
          </div>
        ) : null}

        <Section
          title="Hero"
          description="Top banner of the public Services page."
          fields={['hero_eyebrow', 'hero_title', 'hero_lead']}
          dirtyFields={dirtyMap}
          formId="content-services-form"
          saving={isSaving}
        >
          <Field label="Eyebrow" htmlFor="sp-hero_eyebrow" error={errors.hero_eyebrow?.message} hint="Small label above the title.">
            <input id="sp-hero_eyebrow" {...inputProps('sp-hero_eyebrow', errors.hero_eyebrow?.message)} {...register('hero_eyebrow')} />
          </Field>
          <Field label="Title" htmlFor="sp-hero_title" error={errors.hero_title?.message}>
            <input id="sp-hero_title" {...inputProps('sp-hero_title', errors.hero_title?.message)} {...register('hero_title')} />
          </Field>
          <Field label="Lead paragraph" htmlFor="sp-hero_lead" error={errors.hero_lead?.message} spanTwo>
            <textarea id="sp-hero_lead" {...textareaProps('sp-hero_lead', errors.hero_lead?.message, 3)} {...register('hero_lead')} />
          </Field>
        </Section>

        <section className={`${styles.section} ${heroDirty ? styles.sectionDirty : ''}`}>
          <div className={`${styles.sectionHead} ${heroDirty ? styles.sectionHeadDirty : ''}`}>
            <div className={styles.sectionHeadCopy}>
              <h3>Hero image</h3>
              <p>Photo shown beside the Services page hero text. Landscape images work best.</p>
            </div>
            {heroDirty ? (
              <button
                type="submit"
                form="content-services-form"
                className={`btn btn-brass btn-sm ${styles.sectionSave}`}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Check aria-hidden="true" size={14} />}
                {isSaving ? 'Saving...' : 'Save section'}
              </button>
            ) : null}
          </div>
          <PhotoField
            label="Hero image"
            description="Replace, choose from media library, or remove."
            previewUrl={heroPreviewUrl}
            hasPendingFile={Boolean(heroFile)}
            error={apiErrors?.fields.hero_image}
            onPickFile={assignHeroFile}
            onOpenLibrary={() => setPickerOpen(true)}
            onRemove={removeHero}
          />
        </section>

        <Section
          title="Intro"
          description="Short narrative shown under the hero."
          fields={['intro']}
          dirtyFields={dirtyMap}
          formId="content-services-form"
          saving={isSaving}
        >
          <Field label="Intro copy" htmlFor="sp-intro" error={errors.intro?.message} hint="Supports HTML (rich text)." spanTwo>
            <textarea id="sp-intro" {...textareaProps('sp-intro', errors.intro?.message, 6)} {...register('intro')} />
          </Field>
        </Section>

        <Section
          title="Services we provide"
          description="Accordion services, descriptions, and category tags shown on the public Services page."
          fields={['service_items']}
          dirtyFields={dirtyMap}
          formId="content-services-form"
          saving={isSaving}
        >
          <div className={styles.spanTwo}>
            <ServiceItemsEditor
              control={control}
              register={register}
              errors={errors}
              serverError={apiErrors?.fields.service_items}
            />
          </div>
        </Section>

        <Section
          title="Why choose us"
          description="Cards explaining why clients should pick Signature Property Solutions."
          fields={['why_choose_title', 'why_items']}
          dirtyFields={dirtyMap}
          formId="content-services-form"
          saving={isSaving}
        >
          <Field label="Section title" htmlFor="sp-why_choose_title" error={errors.why_choose_title?.message} spanTwo>
            <input id="sp-why_choose_title" {...inputProps('sp-why_choose_title', errors.why_choose_title?.message)} {...register('why_choose_title')} />
          </Field>
          <div className={styles.spanTwo}>
            <ItemList
              name="why_items"
              control={control}
              errors={errors}
              titlePlaceholder="Card title"
              textPlaceholder="Card description"
              addLabel="Add card"
            />
          </div>
        </Section>

        <Section
          title="Process"
          description="Numbered steps shown at the bottom of the Services page."
          fields={['process_title', 'process_steps']}
          dirtyFields={dirtyMap}
          formId="content-services-form"
          saving={isSaving}
        >
          <Field label="Section title" htmlFor="sp-process_title" error={errors.process_title?.message} spanTwo>
            <input id="sp-process_title" {...inputProps('sp-process_title', errors.process_title?.message)} {...register('process_title')} />
          </Field>
          <div className={styles.spanTwo}>
            <ItemList
              name="process_steps"
              control={control}
              errors={errors}
              titlePlaceholder="Step title"
              textPlaceholder="Step description"
              addLabel="Add step"
            />
          </div>
        </Section>
      </form>

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={async file => {
          assignHeroFile(file)
          setPickerOpen(false)
        }}
        title="Choose hero image"
      />
    </div>
  )
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        <div className="page-eyebrow">Content</div>
        <h1 className="page-title">Services Page</h1>
        <p className="page-desc">Edit the hero, structured service accordion, why-choose-us cards, and process steps shown on the public Services page.</p>
      </div>
      {actions}
    </div>
  )
}
