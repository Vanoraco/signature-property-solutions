'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Images, Upload } from 'lucide-react'
import MediaPickerDialog, { type MediaAsset } from '@/components/media/MediaLibrary'
import type { PropertyMediaField } from './types'
import styles from './PropertyForm.module.css'

interface MediaSlotProps {
  field: PropertyMediaField
  label: string
  existing?: string | null
  file?: File | null
  libraryPreview?: string | null
  error?: string
  featured?: boolean
  onChange: (field: PropertyMediaField, file: File) => void
  onChooseExisting: (field: PropertyMediaField) => void
}

function MediaSlot({
  field,
  label,
  existing,
  file,
  libraryPreview,
  error,
  featured,
  onChange,
  onChooseExisting,
}: MediaSlotProps) {
  const previewRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(file ?? null)

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  useEffect(() => {
    if (!libraryPreview || !previewRef.current) return
    URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
  }, [libraryPreview])

  const selectFile = (selected: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const nextPreview = URL.createObjectURL(selected)
    previewRef.current = nextPreview
    setPreview(nextPreview)
    setSelectedFile(selected)
    onChange(field, selected)
  }

  const source = libraryPreview ?? preview ?? existing ?? null
  const displayedFile = file ?? selectedFile

  return (
    <section className={featured ? styles.mediaFeatured : styles.mediaSlot}>
      <div className={styles.mediaPreview}>
        {source ? (
          <Image src={source} alt={`${label} preview`} fill sizes={featured ? '420px' : '220px'} unoptimized />
        ) : (
          <ImageIcon aria-hidden="true" size={28} />
        )}
      </div>
      <div className={styles.mediaMeta}>
        <strong>{label}</strong>
        <span>{displayedFile ? displayedFile.name : existing ? 'Current image' : 'No image selected'}</span>
        {displayedFile ? <span>{(displayedFile.size / 1024 / 1024).toFixed(2)} MB</span> : null}
      </div>
      <div className={styles.mediaActions}>
        <label className={styles.mediaButton}>
          <Upload aria-hidden="true" size={15} />
          {source ? 'Replace image' : 'Choose image'}
          <input
            type="file"
            accept="image/*"
            aria-label={`${label} file`}
            onChange={event => {
              const selected = event.target.files?.[0]
              if (selected) selectFile(selected)
              event.target.value = ''
            }}
          />
        </label>
        <button type="button" className={styles.mediaLibraryButton} onClick={() => onChooseExisting(field)}>
          <Images aria-hidden="true" size={15} /> Choose existing
        </button>
      </div>
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </section>
  )
}

interface PropertyMediaFieldsProps {
  existing: Partial<Record<PropertyMediaField, string | null>>
  files: Partial<Record<PropertyMediaField, File | null>>
  errors: Partial<Record<PropertyMediaField, string | undefined>>
  onChange: (field: PropertyMediaField, file: File) => void
}

const galleryFields: Array<{ field: PropertyMediaField; label: string }> = [
  { field: 'slide_1', label: 'Gallery image 1' },
  { field: 'slide_2', label: 'Gallery image 2' },
  { field: 'slide_3', label: 'Gallery image 3' },
  { field: 'slide_4', label: 'Gallery image 4' },
  { field: 'slide_5', label: 'Gallery image 5' },
  { field: 'slide_6', label: 'Gallery image 6' },
]

export default function PropertyMediaFields({ existing, files, errors, onChange }: PropertyMediaFieldsProps) {
  const [activeField, setActiveField] = useState<PropertyMediaField | null>(null)
  const [libraryPreviews, setLibraryPreviews] = useState<Partial<Record<PropertyMediaField, string>>>({})
  const fieldLabels = Object.fromEntries([
    ['main_image', 'Main image'],
    ...galleryFields.map(item => [item.field, item.label]),
  ]) as Record<PropertyMediaField, string>

  const selectExisting = (file: File, asset: MediaAsset) => {
    if (!activeField) return
    setLibraryPreviews(current => ({ ...current, [activeField]: asset.url }))
    onChange(activeField, file)
  }

  const selectLocal = (field: PropertyMediaField, file: File) => {
    setLibraryPreviews(current => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    onChange(field, file)
  }

  return (
    <>
      <div className={styles.mediaSection}>
        <MediaSlot
          field="main_image"
          label="Main image"
          existing={existing.main_image}
          file={files.main_image}
          libraryPreview={libraryPreviews.main_image}
          error={errors.main_image}
          featured
          onChange={selectLocal}
          onChooseExisting={setActiveField}
        />
        <div className={styles.galleryGrid}>
          {galleryFields.map(item => (
            <MediaSlot
              key={item.field}
              field={item.field}
              label={item.label}
              existing={existing[item.field]}
              file={files[item.field]}
              libraryPreview={libraryPreviews[item.field]}
              error={errors[item.field]}
              onChange={selectLocal}
              onChooseExisting={setActiveField}
            />
          ))}
        </div>
      </div>
      <MediaPickerDialog
        open={activeField !== null}
        onClose={() => setActiveField(null)}
        onSelect={selectExisting}
        title={activeField ? `Choose ${fieldLabels[activeField]}` : 'Choose Existing Image'}
      />
    </>
  )
}
