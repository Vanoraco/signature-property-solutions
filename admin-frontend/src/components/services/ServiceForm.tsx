'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Image as ImageIcon, Images, Upload } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import MediaPickerDialog from '@/components/media/MediaLibrary'
import {
  serviceFormSchema,
  serviceToFormValues,
  slugifyServiceName,
  type ServiceApiErrors,
  type ServiceFormValues,
} from './service-form'
import type { ServiceRecord } from './types'
import styles from './ServiceForm.module.css'

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

interface PhotoSlotProps {
  label: string
  hint: string
  existing?: string | null
  error?: string
  preview: string | null
  selectedName: string | null
  onPickFile: (file: File) => void
  onOpenLibrary: () => void
}

function PhotoSlot({ label, hint, existing, error, preview, selectedName, onPickFile, onOpenLibrary }: PhotoSlotProps) {
  const source = preview ?? existing ?? null
  return (
    <div className={styles.photoFieldCompact}>
      <div className={styles.photoPreviewCompact}>
        {source ? (
          <Image src={source} alt="" fill sizes="88px" unoptimized />
        ) : (
          <ImageIcon aria-hidden="true" size={24} />
        )}
      </div>
      <div className={styles.photoDetails}>
        <strong>{label}</strong>
        <div className={styles.photoActions}>
          <label className={styles.fileButton}>
            <Upload aria-hidden="true" size={14} />
            {source ? 'Replace' : 'Choose'}
            <input
              type="file"
              accept="image/*"
              aria-label={`${label} file`}
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) onPickFile(file)
                event.target.value = ''
              }}
            />
          </label>
          <button type="button" className={styles.libraryButton} onClick={onOpenLibrary}>
            <Images aria-hidden="true" size={14} /> Library
          </button>
        </div>
        <span className={styles.fileName}>{selectedName ?? (source ? 'Current' : hint)}</span>
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </div>
  )
}

interface ServiceFormProps {
  formId?: string
  initialService: ServiceRecord | null
  apiErrors: ServiceApiErrors | null
  onSubmit: (values: ServiceFormValues) => void | Promise<void>
}

export default function ServiceForm({
  formId = 'service-editor-form',
  initialService,
  apiErrors,
  onSubmit,
}: ServiceFormProps) {
  const [slugLocked, setSlugLocked] = useState(Boolean(initialService))
  const [activeMedia, setActiveMedia] = useState<'icon' | 'image' | null>(null)
  const iconPreviewRef = useRef<string | null>(null)
  const imagePreviewRef = useRef<string | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: serviceToFormValues(initialService),
    mode: 'onBlur',
  })

  const name = useWatch({ control, name: 'service_name' })
  const selectedIcon = useWatch({ control, name: 'icon' })
  const selectedImage = useWatch({ control, name: 'image' })
  const slugRegistration = register('slug')

  useEffect(() => () => {
    if (iconPreviewRef.current) URL.revokeObjectURL(iconPreviewRef.current)
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current)
  }, [])

  useEffect(() => {
    if (!slugLocked) {
      setValue('slug', slugifyServiceName(name), { shouldDirty: Boolean(name), shouldValidate: Boolean(name) })
    }
  }, [setValue, slugLocked, name])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof ServiceFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const selectIcon = (file: File) => {
    if (iconPreviewRef.current) URL.revokeObjectURL(iconPreviewRef.current)
    const next = URL.createObjectURL(file)
    iconPreviewRef.current = next
    setIconPreview(next)
    setValue('icon', file, { shouldDirty: true, shouldValidate: true })
  }
  const selectImage = (file: File) => {
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current)
    const next = URL.createObjectURL(file)
    imagePreviewRef.current = next
    setImagePreview(next)
    setValue('image', file, { shouldDirty: true, shouldValidate: true })
  }
  const handleLibrarySelect = (file: File) => {
    if (activeMedia === 'icon') selectIcon(file)
    else if (activeMedia === 'image') selectImage(file)
    setActiveMedia(null)
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {apiErrors?.form ? (
        <div className={styles.formAlert} role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{apiErrors.form}</span>
        </div>
      ) : null}

      <div className={styles.grid}>
        <Field label="Service name" htmlFor="service-service_name" error={errors.service_name?.message} required spanTwo>
          {descriptionId => <input id="service-service_name" className={styles.input} aria-invalid={Boolean(errors.service_name)} aria-describedby={descriptionId} {...register('service_name')} />}
        </Field>
        <Field label="Slug" htmlFor="service-slug" error={errors.slug?.message} hint="Generated from the name until edited." required spanTwo>
          {descriptionId => (
            <input
              id="service-slug"
              className={styles.input}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={descriptionId}
              {...slugRegistration}
              onChange={event => {
                setSlugLocked(true)
                slugRegistration.onChange(event)
              }}
            />
          )}
        </Field>
        <Field label="Short description" htmlFor="service-short" error={errors.short_discriptions?.message} hint="Supports HTML. Shown on the services list page." spanTwo>
          {descriptionId => (
            <textarea
              id="service-short"
              rows={4}
              className={styles.textarea}
              aria-invalid={Boolean(errors.short_discriptions)}
              aria-describedby={descriptionId}
              {...register('short_discriptions')}
            />
          )}
        </Field>
        <Field label="Full description" htmlFor="service-discription" error={errors.Discription?.message} hint="Supports HTML. Shown on the service detail page." spanTwo>
          {descriptionId => (
            <textarea
              id="service-discription"
              rows={8}
              className={styles.textarea}
              style={{ minHeight: 200 }}
              aria-invalid={Boolean(errors.Discription)}
              aria-describedby={descriptionId}
              {...register('Discription')}
            />
          )}
        </Field>
      </div>

      <div className={styles.photoPair}>
        <PhotoSlot
          label="Service icon"
          hint="JPG, PNG, or WebP up to 10 MB"
          existing={initialService?.icon}
          error={errors.icon?.message}
          preview={iconPreview}
          selectedName={selectedIcon instanceof File ? selectedIcon.name : null}
          onPickFile={selectIcon}
          onOpenLibrary={() => setActiveMedia('icon')}
        />
        <PhotoSlot
          label="Hero image"
          hint="JPG, PNG, or WebP up to 10 MB"
          existing={initialService?.image}
          error={errors.image?.message}
          preview={imagePreview}
          selectedName={selectedImage instanceof File ? selectedImage.name : null}
          onPickFile={selectImage}
          onOpenLibrary={() => setActiveMedia('image')}
        />
      </div>

      <MediaPickerDialog
        open={activeMedia !== null}
        onClose={() => setActiveMedia(null)}
        onSelect={handleLibrarySelect}
        title={activeMedia === 'icon' ? 'Choose Service Icon' : activeMedia === 'image' ? 'Choose Service Image' : 'Choose Image'}
      />
    </form>
  )
}
