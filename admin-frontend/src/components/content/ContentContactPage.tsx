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
  contactFormSchema,
  contactToFormValues,
  normalizeContentApiErrors,
  toContactFormData,
  type ContentApiErrors,
  type ContactFormValues,
} from './content-form'
import { Field, inputProps, Section, textareaProps } from './Field'
import { pickSingleton, type ContactRecord, type SingletonCollection } from './types'
import styles from './ContentForm.module.css'

const CONTACT_QUERY_KEY = ['content', 'contact'] as const

const CONTACT_FIELDS = [
  'phone_number', 'office_phone', 'email', 'website', 'address',
  'google_map', 'facebook', 'instagram', 'linkden',
] as const
const fieldsTracked = new Set<string>(CONTACT_FIELDS)

export default function ContentContactPage() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)
  const [apiErrors, setApiErrors] = useState<ContentApiErrors | null>(null)

  const recordQuery = useQuery({
    queryKey: CONTACT_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const response = await api.get<SingletonCollection<ContactRecord>>('/contact/', { signal })
      return response.data
    },
    staleTime: 15 * 60_000,
  })
  const record = pickSingleton(recordQuery.data)
  const valuesForRecord = record ? contactToFormValues(record) : undefined

  const {
    register,
    setError,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contactToFormValues(null),
    mode: 'onBlur',
    values: valuesForRecord,
  })

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof ContactFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const saveMutation = useMutation({
    mutationFn: async (values: ContactFormValues) => {
      const data = toContactFormData(values)
      if (record) {
        return api.patch(`/contact/${record.id}/`, data)
      }
      return api.post('/contact/', data)
    },
    onMutate: () => {
      setApiErrors(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEY })
      setFeedback(createAdminToastFeedback('Contact details saved.'))
    },
    onError: error => {
      const data = (error as { response?: { data?: unknown } }).response?.data
      setApiErrors(normalizeContentApiErrors(data, fieldsTracked))
    },
  })

  const submit = (values: ContactFormValues) => saveMutation.mutate(values)
  const isLoading = recordQuery.isLoading
  const isError = recordQuery.isError
  const isSaving = saveMutation.isPending

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading contact content">
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
          <p className="text-[13px] font-semibold">Contact details could not be loaded.</p>
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
            form="content-contact-form"
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

      <form id="content-contact-form" className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        {apiErrors?.form ? (
          <div className={styles.formAlert} role="alert">
            <AlertCircle aria-hidden="true" size={16} />
            <span>{apiErrors.form}</span>
          </div>
        ) : null}

        <Section title="Contact details" description="Phone numbers, email, and website shown across the site footer and contact page.">
          <Field label="Primary phone" htmlFor="contact-phone_number" error={errors.phone_number?.message} required>
            <input id="contact-phone_number" type="tel" autoComplete="tel" {...inputProps('contact-phone_number', errors.phone_number?.message)} {...register('phone_number')} />
          </Field>
          <Field label="Office phone" htmlFor="contact-office_phone" error={errors.office_phone?.message}>
            <input id="contact-office_phone" type="tel" autoComplete="tel" {...inputProps('contact-office_phone', errors.office_phone?.message)} {...register('office_phone')} />
          </Field>
          <Field label="Email" htmlFor="contact-email" error={errors.email?.message}>
            <input id="contact-email" type="email" autoComplete="email" {...inputProps('contact-email', errors.email?.message)} {...register('email')} />
          </Field>
          <Field label="Website" htmlFor="contact-website" error={errors.website?.message}>
            <input id="contact-website" autoComplete="url" {...inputProps('contact-website', errors.website?.message)} {...register('website')} />
          </Field>
          <Field label="Address" htmlFor="contact-address" error={errors.address?.message} spanTwo>
            <input id="contact-address" autoComplete="street-address" {...inputProps('contact-address', errors.address?.message)} {...register('address')} />
          </Field>
        </Section>

        <Section title="Map & socials" description="Google Maps embed URL and social profile links.">
          <Field label="Google Maps embed URL" htmlFor="contact-google_map" error={errors.google_map?.message} hint="Paste the src URL from Google Maps → Share → Embed a map." spanTwo>
            <textarea id="contact-google_map" {...textareaProps('contact-google_map', errors.google_map?.message, 3)} {...register('google_map')} />
          </Field>
          <Field label="Facebook" htmlFor="contact-facebook" error={errors.facebook?.message}>
            <input id="contact-facebook" autoComplete="url" {...inputProps('contact-facebook', errors.facebook?.message)} {...register('facebook')} />
          </Field>
          <Field label="Instagram" htmlFor="contact-instagram" error={errors.instagram?.message}>
            <input id="contact-instagram" autoComplete="url" {...inputProps('contact-instagram', errors.instagram?.message)} {...register('instagram')} />
          </Field>
          <Field label="LinkedIn" htmlFor="contact-linkden" error={errors.linkden?.message} spanTwo>
            <input id="contact-linkden" autoComplete="url" {...inputProps('contact-linkden', errors.linkden?.message)} {...register('linkden')} />
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
        <h1 className="page-title">Contact Page</h1>
        <p className="page-desc">Edit the contact details, Google Maps embed, and social profile links shown on the public contact page and footer.</p>
      </div>
      {actions}
    </div>
  )
}
