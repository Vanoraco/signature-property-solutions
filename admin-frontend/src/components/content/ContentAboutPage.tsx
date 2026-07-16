'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import api from '@/lib/api'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import {
  aboutFormSchema,
  aboutToFormValues,
  normalizeContentApiErrors,
  toAboutFormData,
  type AboutFormValues,
  type ContentApiErrors,
} from './content-form'
import { Field, inputProps, Section, textareaProps } from './Field'
import { pickSingleton, type AboutRecord, type SingletonCollection } from './types'
import styles from './ContentForm.module.css'

const ABOUT_QUERY_KEY = ['content', 'about'] as const

const ABOUT_FIELDS = [
  'hading', 'title', 'aboutus', 'vision', 'mission', 'value',
  'why_choose_us_header', 'tytle', 'description',
  'ceo_name', 'ceo_position', 'ceo_description',
  'ceo_facebook', 'ceo_twitter', 'ceo_linkden',
] as const
const fieldsTracked = new Set<string>(ABOUT_FIELDS)

export default function ContentAboutPage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [apiErrors, setApiErrors] = useState<ContentApiErrors | null>(null)

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
    setError,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AboutFormValues>({
    resolver: zodResolver(aboutFormSchema),
    defaultValues: aboutToFormValues(null),
    mode: 'onBlur',
    values: valuesForRecord,
  })

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof AboutFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const saveMutation = useMutation({
    mutationFn: async (values: AboutFormValues) => {
      const data = toAboutFormData(values)
      if (record) {
        return api.patch(`/about/${record.id}/`, data)
      }
      return api.post('/about/', data)
    },
    onMutate: () => {
      setApiErrors(null)
      setFeedback(null)
    },
    onSuccess: async () => {
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
            disabled={isSaving || !isDirty}
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

        <Section title="Header" description="Top of the About page.">
          <Field label="Heading" htmlFor="about-hading" error={errors.hading?.message} spanTwo>
            <input id="about-hading" {...inputProps('about-hading', errors.hading?.message)} {...register('hading')} />
          </Field>
          <Field label="Title" htmlFor="about-title" error={errors.title?.message} spanTwo>
            <input id="about-title" {...inputProps('about-title', errors.title?.message)} {...register('title')} />
          </Field>
        </Section>

        <Section title="About us" description="The main company narrative shown on the About page.">
          <Field label="About us copy" htmlFor="about-aboutus" error={errors.aboutus?.message} hint="Supports HTML (rich text)." spanTwo>
            <textarea id="about-aboutus" {...textareaProps('about-aboutus', errors.aboutus?.message, 8)} {...register('aboutus')} />
          </Field>
          <Field label="Vision" htmlFor="about-vision" error={errors.vision?.message} hint="Supports HTML." spanTwo>
            <textarea id="about-vision" {...textareaProps('about-vision', errors.vision?.message, 6)} {...register('vision')} />
          </Field>
          <Field label="Mission" htmlFor="about-mission" error={errors.mission?.message} hint="Supports HTML." spanTwo>
            <textarea id="about-mission" {...textareaProps('about-mission', errors.mission?.message, 6)} {...register('mission')} />
          </Field>
          <Field label="Value" htmlFor="about-value" error={errors.value?.message} hint="Supports HTML." spanTwo>
            <textarea id="about-value" {...textareaProps('about-value', errors.value?.message, 6)} {...register('value')} />
          </Field>
        </Section>

        <Section title="Why choose us" description="Section describing why clients should pick Signature Property Solutions.">
          <Field label="Section header" htmlFor="about-why_choose_us_header" error={errors.why_choose_us_header?.message} spanTwo>
            <input id="about-why_choose_us_header" {...inputProps('about-why_choose_us_header', errors.why_choose_us_header?.message)} {...register('why_choose_us_header')} />
          </Field>
          <Field label="Title" htmlFor="about-tytle" error={errors.tytle?.message} spanTwo>
            <input id="about-tytle" {...inputProps('about-tytle', errors.tytle?.message)} {...register('tytle')} />
          </Field>
          <Field label="Description" htmlFor="about-description" error={errors.description?.message} hint="Supports HTML." spanTwo>
            <textarea id="about-description" {...textareaProps('about-description', errors.description?.message, 8)} {...register('description')} />
          </Field>
        </Section>

        <Section title="CEO profile" description="The leader featured on the About page.">
          <Field label="CEO name" htmlFor="about-ceo_name" error={errors.ceo_name?.message}>
            <input id="about-ceo_name" {...inputProps('about-ceo_name', errors.ceo_name?.message)} {...register('ceo_name')} />
          </Field>
          <Field label="CEO position" htmlFor="about-ceo_position" error={errors.ceo_position?.message}>
            <input id="about-ceo_position" {...inputProps('about-ceo_position', errors.ceo_position?.message)} {...register('ceo_position')} />
          </Field>
          <Field label="CEO description" htmlFor="about-ceo_description" error={errors.ceo_description?.message} hint="Supports HTML." spanTwo>
            <textarea id="about-ceo_description" {...textareaProps('about-ceo_description', errors.ceo_description?.message, 6)} {...register('ceo_description')} />
          </Field>
          <Field label="CEO Facebook" htmlFor="about-ceo_facebook" error={errors.ceo_facebook?.message}>
            <input id="about-ceo_facebook" {...inputProps('about-ceo_facebook', errors.ceo_facebook?.message)} {...register('ceo_facebook')} />
          </Field>
          <Field label="CEO Twitter / X" htmlFor="about-ceo_twitter" error={errors.ceo_twitter?.message}>
            <input id="about-ceo_twitter" {...inputProps('about-ceo_twitter', errors.ceo_twitter?.message)} {...register('ceo_twitter')} />
          </Field>
          <Field label="CEO LinkedIn" htmlFor="about-ceo_linkden" error={errors.ceo_linkden?.message} spanTwo>
            <input id="about-ceo_linkden" {...inputProps('about-ceo_linkden', errors.ceo_linkden?.message)} {...register('ceo_linkden')} />
          </Field>
        </Section>
      </form>
    </div>
  )
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        <div className="page-eyebrow">Content</div>
        <h1 className="page-title">About Page</h1>
        <p className="page-desc">Edit the company story, vision, mission, values, and CEO profile shown on the public About page.</p>
      </div>
      {actions}
    </div>
  )
}
