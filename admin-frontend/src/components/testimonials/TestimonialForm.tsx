'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ImageIcon, Images, Star, Upload } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import MediaPickerDialog from '@/components/media/MediaLibrary'
import {
  testimonialFormSchema,
  testimonialToFormValues,
  type TestimonialApiErrors,
  type TestimonialFormValues,
} from './testimonial-form'
import type { Testimonial } from './types'
import styles from './TestimonialForm.module.css'

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

interface TestimonialFormProps {
  formId?: string
  initialTestimonial: Testimonial | null
  apiErrors: TestimonialApiErrors | null
  onSubmit: (values: TestimonialFormValues) => void | Promise<void>
}

export default function TestimonialForm({
  formId = 'testimonial-editor-form',
  initialTestimonial,
  apiErrors,
  onSubmit,
}: TestimonialFormProps) {
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
  } = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: testimonialToFormValues(initialTestimonial),
    mode: 'onBlur',
  })
  const selectedImage = useWatch({ control, name: 'image' })
  const rating = useWatch({ control, name: 'rating' })
  const isPublished = useWatch({ control, name: 'is_published' })

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
      if (message) setError(field as keyof TestimonialFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const imageSource = preview ?? initialTestimonial?.image ?? null

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
            <Image src={imageSource} alt="Client photo preview" fill sizes="104px" unoptimized />
          ) : (
            <ImageIcon aria-hidden="true" size={28} />
          )}
        </div>
        <div className={styles.photoDetails}>
          <strong>Client photo</strong>
          <div className={styles.photoActions}>
            <label className={styles.fileButton}>
              <Upload aria-hidden="true" size={15} />
              {imageSource ? 'Replace photo' : 'Choose photo'}
              <input
                type="file"
                accept="image/*"
                aria-label="Client photo file"
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
          <span className={styles.fileName}>{selectedImage ? selectedImage.name : imageSource ? 'Current photo' : 'JPG, PNG, or WebP up to 10 MB'}</span>
          {errors.image?.message ? <p className={styles.errorText}>{errors.image.message}</p> : null}
        </div>
      </div>

      <MediaPickerDialog
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={file => selectImage(file)}
        title="Choose Client Photo"
      />

      <div className={styles.grid}>
        <Field label="Full name" htmlFor="testimonial-name" error={errors.name?.message} required spanTwo>
          {descriptionId => <input id="testimonial-name" className={styles.input} aria-invalid={Boolean(errors.name)} aria-describedby={descriptionId} {...register('name')} />}
        </Field>
        <Field label="Role / title" htmlFor="testimonial-role" error={errors.role?.message}>
          {descriptionId => <input id="testimonial-role" className={styles.input} aria-invalid={Boolean(errors.role)} aria-describedby={descriptionId} {...register('role')} />}
        </Field>
        <Field label="Location" htmlFor="testimonial-location" error={errors.location?.message}>
          {descriptionId => <input id="testimonial-location" className={styles.input} aria-invalid={Boolean(errors.location)} aria-describedby={descriptionId} {...register('location')} />}
        </Field>
        <Field label="Quote" htmlFor="testimonial-quote" error={errors.quote?.message} required spanTwo>
          {descriptionId => (
            <textarea
              id="testimonial-quote"
              rows={5}
              className={styles.input}
              style={{ minHeight: 120, resize: 'vertical' }}
              aria-invalid={Boolean(errors.quote)}
              aria-describedby={descriptionId}
              {...register('quote')}
            />
          )}
        </Field>
        <div className={styles.ratingField}>
          <span className={styles.ratingLabel}>Rating<span className={styles.required} aria-hidden="true"> *</span></span>
          <div className={styles.ratingStars} role="radiogroup" aria-label="Testimonial rating">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating >= star}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                className={styles.ratingStar}
                onClick={() => setValue('rating', star, { shouldDirty: true, shouldValidate: true })}
              >
                <Star aria-hidden="true" size={14} fill={rating >= star ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          {errors.rating?.message ? <p className={styles.errorText}>{errors.rating.message}</p> : null}
          <input type="hidden" {...register('rating')} />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Visibility</span>
          <div className={styles.toggleRow}>
            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              className={styles.toggleSwitch}
              onClick={() => setValue('is_published', !isPublished, { shouldDirty: true })}
              aria-label={isPublished ? 'Published - click to unpublish' : 'Unpublished - click to publish'}
            />
            <div className={styles.toggleCopy}>
              <strong>{isPublished ? 'Published' : 'Unpublished'}</strong>
              <span>{isPublished ? 'Visible on the public testimonials page' : 'Hidden from the public site'}</span>
            </div>
          </div>
        </div>
      </div>
      <input type="hidden" value={isPublished ? 'true' : 'false'} {...register('is_published')} />
    </form>
  )
}
