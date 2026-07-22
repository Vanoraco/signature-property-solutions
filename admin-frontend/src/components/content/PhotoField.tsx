'use client'

import Image from 'next/image'
import { ImageIcon, Images, Trash2, Upload } from 'lucide-react'
import styles from './ContentForm.module.css'

interface PhotoFieldProps {
  label: string
  description?: string
  /** Current preview URL (object URL or remote URL). Null when empty. */
  previewUrl: string | null
  /** True when a new local file is pending upload. */
  hasPendingFile?: boolean
  error?: string
  onPickFile: (file: File) => void
  onOpenLibrary: () => void
  onRemove?: () => void
}

export default function PhotoField({
  label,
  description,
  previewUrl,
  hasPendingFile = false,
  error,
  onPickFile,
  onOpenLibrary,
  onRemove,
}: PhotoFieldProps) {
  return (
    <div className={styles.photoField}>
      <div className={styles.photoPreview}>
        {previewUrl ? (
          <Image src={previewUrl} alt={`${label} preview`} fill sizes="104px" unoptimized />
        ) : (
          <ImageIcon aria-hidden="true" size={28} />
        )}
      </div>
      <div className={styles.photoDetails}>
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
        <div className={styles.photoActions}>
          <label className={styles.fileButton}>
            <Upload aria-hidden="true" size={15} />
            {previewUrl ? 'Replace image' : 'Choose image'}
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
            <Images aria-hidden="true" size={15} /> Choose existing
          </button>
          {previewUrl && onRemove ? (
            <button type="button" className={styles.libraryButton} onClick={onRemove} aria-label={`Remove ${label}`}>
              <Trash2 aria-hidden="true" size={15} /> Remove
            </button>
          ) : null}
        </div>
        <span className={styles.fileName}>
          {hasPendingFile ? 'New image selected' : previewUrl ? 'Current image' : 'No image selected'}
        </span>
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </div>
  )
}
