'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Upload } from 'lucide-react'
import type { PropertyMediaField } from './types'
import styles from './PropertyForm.module.css'

interface MediaSlotProps {
  field: PropertyMediaField
  label: string
  existing?: string | null
  file?: File | null
  error?: string
  featured?: boolean
  onChange: (field: PropertyMediaField, file: File) => void
}

function MediaSlot({ field, label, existing, file, error, featured, onChange }: MediaSlotProps) {
  const previewRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(file ?? null)

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const selectFile = (selected: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const nextPreview = URL.createObjectURL(selected)
    previewRef.current = nextPreview
    setPreview(nextPreview)
    setSelectedFile(selected)
    onChange(field, selected)
  }

  const source = preview ?? existing ?? null
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
  return (
    <div className={styles.mediaSection}>
      <MediaSlot
        field="main_image"
        label="Main image"
        existing={existing.main_image}
        file={files.main_image}
        error={errors.main_image}
        featured
        onChange={onChange}
      />
      <div className={styles.galleryGrid}>
        {galleryFields.map(item => (
          <MediaSlot
            key={item.field}
            field={item.field}
            label={item.label}
            existing={existing[item.field]}
            file={files[item.field]}
            error={errors[item.field]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}
