'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ImageIcon, Upload } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import {
  lookupFormSchema,
  lookupToFormValues,
  slugifyLookupName,
  type LookupApiErrors,
  type LookupFieldName,
  type LookupFormValues,
} from './lookup-form'
import type { LookupKind, LookupRecord } from './types'
import styles from './LookupForm.module.css'

interface LookupFormProps {
  kind: LookupKind
  initialRecord: LookupRecord | null
  apiErrors: LookupApiErrors | null
  onSubmit: (values: LookupFormValues) => void
}

export default function LookupForm({ kind, initialRecord, apiErrors, onSubmit }: LookupFormProps) {
  const [slugEdited, setSlugEdited] = useState(Boolean(initialRecord))
  const [clearedApiErrorState, setClearedApiErrorState] = useState<{
    source: LookupApiErrors | null
    fields: Set<LookupFieldName>
  }>(() => ({ source: apiErrors, fields: new Set() }))
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialRecord && 'icon' in initialRecord ? initialRecord.icon : null,
  )
  const isCategory = kind === 'categories'
  const singular = isCategory ? 'category' : 'facility'
  const defaultValues = useMemo(() => lookupToFormValues(initialRecord), [initialRecord])
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors },
  } = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues,
  })

  const icon = useWatch({ control, name: 'icon' })

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const clearApiFieldError = (field: LookupFieldName) => {
    if (!apiErrors?.fields[field]) return
    setClearedApiErrorState(current => {
      const currentFields = current.source === apiErrors ? current.fields : new Set<LookupFieldName>()
      if (currentFields.has(field)) return current
      const next = new Set(currentFields)
      next.add(field)
      return { source: apiErrors, fields: next }
    })
  }

  const clearedApiFields = clearedApiErrorState.source === apiErrors
    ? clearedApiErrorState.fields
    : undefined
  const fieldError = (field: LookupFieldName) => (
    errors[field]?.message || (clearedApiFields?.has(field) ? undefined : apiErrors?.fields[field])
  )
  const iconRequired = isCategory && !initialRecord
  const nameError = fieldError('name')
  const slugError = fieldError('slug')
  const iconError = fieldError('icon')
  const slugDescription = [isCategory ? 'lookup-slug-hint' : null, slugError ? 'lookup-slug-error' : null]
    .filter(Boolean)
    .join(' ') || undefined
  const iconDescription = [
    'lookup-icon-file-hint',
    iconRequired && !(icon instanceof File) ? 'lookup-icon-requirement' : null,
    iconError ? 'lookup-icon-error' : null,
  ].filter(Boolean).join(' ')

  return (
    <form id="lookup-editor-form" className={styles.form} onSubmit={handleSubmit(values => {
      if (iconRequired && !(values.icon instanceof File)) {
        setError('icon', { type: 'manual', message: 'Select a category icon.' })
        return
      }
      onSubmit(values)
    })} noValidate>
      {apiErrors?.form ? (
        <div role="alert" className={styles.formAlert}>
          <AlertCircle aria-hidden="true" size={16} /> {apiErrors.form}
        </div>
      ) : null}

      <div className={styles.grid}>
        <label className={`${styles.field} ${styles.spanTwo}`}>
          <span className={styles.label}>{isCategory ? 'Category Name' : 'Facility Name'} <span className={styles.required}>*</span></span>
          <input
            id="lookup-name"
            {...register('name')}
            className={styles.input}
            placeholder={isCategory ? 'Category Name' : 'Facility Name'}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'lookup-name-error' : undefined}
            onChange={event => {
              clearApiFieldError('name')
              register('name').onChange(event)
              if (!slugEdited) {
                clearApiFieldError('slug')
                setValue('slug', slugifyLookupName(event.target.value), { shouldValidate: false })
              }
            }}
          />
          {nameError ? <span id="lookup-name-error" className={styles.errorText}>{nameError}</span> : null}
        </label>

        <label className={`${styles.field} ${isCategory ? '' : styles.spanTwo}`}>
          <span className={styles.label}>Slug <span className={styles.required}>*</span></span>
          <input
            id="lookup-slug"
            {...register('slug')}
            className={styles.input}
            placeholder="Slug"
            aria-invalid={Boolean(slugError)}
            aria-describedby={slugDescription}
            onChange={event => {
              clearApiFieldError('slug')
              setSlugEdited(true)
              register('slug').onChange(event)
            }}
          />
          {isCategory ? <span id="lookup-slug-hint" className={styles.hint}>Used in the listing URL.</span> : null}
          {slugError ? <span id="lookup-slug-error" className={styles.errorText}>{slugError}</span> : null}
        </label>

        {isCategory ? (
          <div className={styles.field}>
            <span className={styles.label}>Icon {iconRequired ? <span className={styles.required}>*</span> : null}</span>
            <div className={styles.uploadSlot}>
              <div className={styles.preview}>
                {previewUrl ? (
                  <Image src={previewUrl} alt="Category icon preview" fill sizes="88px" unoptimized />
                ) : (
                  <ImageIcon aria-hidden="true" size={22} />
                )}
              </div>
              <div className={styles.uploadMeta}>
                <strong>{previewUrl ? 'Icon selected' : 'Choose an icon'}</strong>
                <span id="lookup-icon-file-hint" className={styles.fileName}>{icon instanceof File ? icon.name : 'PNG, JPG, or WebP up to 10 MB'}</span>
                <label className={styles.uploadButton}>
                  <Upload aria-hidden="true" size={13} /> {previewUrl ? 'Replace Icon' : 'Choose Icon'}
                  <input
                    id="lookup-icon"
                    type="file"
                    accept="image/*"
                    aria-label="Category icon file"
                    aria-invalid={Boolean(iconError)}
                    aria-describedby={iconDescription}
                    onChange={event => {
                      clearApiFieldError('icon')
                      const file = event.target.files?.[0] ?? null
                      setValue('icon', file, { shouldValidate: true })
                      if (file && typeof URL.createObjectURL === 'function') {
                        setPreviewUrl(URL.createObjectURL(file))
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            {iconRequired && !(icon instanceof File) ? <span id="lookup-icon-requirement" className={styles.hint}>An icon is required for a new category.</span> : null}
            {iconError ? <span id="lookup-icon-error" className={styles.errorText}>{iconError}</span> : null}
          </div>
        ) : null}
      </div>
      <p className="sr-only">Save this {singular} using the modal footer button.</p>
    </form>
  )
}
