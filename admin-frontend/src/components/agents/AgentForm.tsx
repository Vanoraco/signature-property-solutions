'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ImageIcon, Images, Upload } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import MediaPickerDialog from '@/components/media/MediaLibrary'
import {
  agentFormSchema,
  agentToFormValues,
  type AgentApiErrors,
  type AgentFormValues,
} from './agent-form'
import type { AgentRecord } from './types'
import styles from './AgentForm.module.css'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  spanTwo?: boolean
  children: (descriptionId?: string) => ReactNode
}

function Field({ label, htmlFor, error, hint, required, spanTwo, children }: FieldProps) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`
  const descriptionId = error ? errorId : hint ? hintId : undefined

  return (
    <div className={`${styles.field} ${spanTwo ? styles.spanTwo : ''}`}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}{required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {children(descriptionId)}
      {hint && !error ? <p id={hintId} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={errorId} className={styles.errorText}>{error}</p> : null}
    </div>
  )
}

interface AgentFormProps {
  formId?: string
  initialAgent: AgentRecord | null
  apiErrors: AgentApiErrors | null
  onSubmit: (values: AgentFormValues) => void | Promise<void>
}

export default function AgentForm({
  formId = 'agent-editor-form',
  initialAgent,
  apiErrors,
  onSubmit,
}: AgentFormProps) {
  const previewRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: agentToFormValues(initialAgent),
    mode: 'onBlur',
  })
  const selectedImage = useWatch({ control, name: 'image' })

  const selectImage = (file: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const nextPreview = URL.createObjectURL(file)
    previewRef.current = nextPreview
    setPreview(nextPreview)
    setValue('image', file, { shouldDirty: true, shouldValidate: true })
  }

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof AgentFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const imageSource = preview ?? initialAgent?.image ?? null

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {apiErrors?.form ? (
        <div className={styles.formAlert} role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{apiErrors.form}</span>
        </div>
      ) : null}

      <div className={styles.photoField}>
        <div className={styles.photoPreview}>
          {imageSource ? (
            <Image src={imageSource} alt="Agent photo preview" fill sizes="104px" unoptimized />
          ) : (
            <ImageIcon aria-hidden="true" size={28} />
          )}
        </div>
        <div className={styles.photoDetails}>
          <strong>Agent photo</strong>
          <div className={styles.photoActions}>
            <label className={styles.fileButton}>
              <Upload aria-hidden="true" size={15} />
              {imageSource ? 'Replace photo' : 'Choose photo'}
              <input
                id="agent-image"
                type="file"
                accept="image/*"
                aria-label="Agent photo file"
                aria-invalid={Boolean(errors.image)}
                aria-describedby={`agent-image-hint${errors.image ? ' agent-image-error' : ''}`}
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) selectImage(file)
                  event.target.value = ''
                }}
              />
            </label>
            <button type="button" className={styles.libraryButton} onClick={() => setMediaPickerOpen(true)}>
              <Images aria-hidden="true" size={15} /> Choose existing
            </button>
          </div>
          <span id="agent-image-hint" className={styles.fileName}>{selectedImage ? selectedImage.name : imageSource ? 'Current photo' : 'JPG, PNG, or WebP up to 10 MB'}</span>
          {errors.image?.message ? <p id="agent-image-error" className={styles.errorText}>{errors.image.message}</p> : null}
        </div>
      </div>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={file => selectImage(file)}
        title="Choose Agent Photo"
      />

      <div className={styles.grid}>
        <Field label="Full name" htmlFor="agent-name" error={errors.name?.message} required spanTwo>
          {descriptionId => <input id="agent-name" className={styles.input} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={descriptionId} {...register('name')} />}
        </Field>
        <Field label="Phone number" htmlFor="agent-phone_number" error={errors.phone_number?.message} required>
          {descriptionId => <input id="agent-phone_number" type="tel" className={styles.input} autoComplete="tel" aria-invalid={Boolean(errors.phone_number)} aria-describedby={descriptionId} {...register('phone_number')} />}
        </Field>
        <Field label="Office phone" htmlFor="agent-office_phone" error={errors.office_phone?.message}>
          {descriptionId => <input id="agent-office_phone" type="tel" className={styles.input} aria-invalid={Boolean(errors.office_phone)} aria-describedby={descriptionId} {...register('office_phone')} />}
        </Field>
        <Field label="Email" htmlFor="agent-email" error={errors.email?.message} required>
          {descriptionId => <input id="agent-email" type="email" className={styles.input} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={descriptionId} {...register('email')} />}
        </Field>
        <Field label="Facebook" htmlFor="agent-facebook" error={errors.facebook?.message}>
          {descriptionId => <input id="agent-facebook" className={styles.input} autoComplete="url" aria-invalid={Boolean(errors.facebook)} aria-describedby={descriptionId} {...register('facebook')} />}
        </Field>
        <Field label="Instagram" htmlFor="agent-instagram" error={errors.instagram?.message}>
          {descriptionId => <input id="agent-instagram" className={styles.input} autoComplete="url" aria-invalid={Boolean(errors.instagram)} aria-describedby={descriptionId} {...register('instagram')} />}
        </Field>
        <Field label="LinkedIn" htmlFor="agent-linkden" error={errors.linkden?.message}>
          {descriptionId => <input id="agent-linkden" className={styles.input} autoComplete="url" aria-invalid={Boolean(errors.linkden)} aria-describedby={descriptionId} {...register('linkden')} />}
        </Field>
      </div>
    </form>
  )
}
