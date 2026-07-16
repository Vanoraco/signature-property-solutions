'use client'

import { type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import styles from './ContentForm.module.css'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  spanTwo?: boolean
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, required, spanTwo, children }: FieldProps) {
  return (
    <div className={`${styles.field} ${spanTwo ? styles.spanTwo : ''}`}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}{required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  )
}

export function inputProps(
  id: string,
  error: string | undefined,
): InputHTMLAttributes<HTMLInputElement> & { 'aria-invalid'?: boolean } {
  return {
    id,
    className: styles.input,
    'aria-invalid': Boolean(error),
  }
}

export function textareaProps(
  id: string,
  error: string | undefined,
  rows = 6,
): TextareaHTMLAttributes<HTMLTextAreaElement> & { 'aria-invalid'?: boolean } {
  return {
    id,
    rows,
    className: styles.textarea,
    'aria-invalid': Boolean(error),
  }
}

interface SectionProps {
  title: string
  description?: string
  /** Field names that belong to this section, used to decide if it is dirty. */
  fields?: readonly string[]
  /** Schema-level dirty fields (react-hook-form formState.dirtyFields). */
  dirtyFields?: Record<string, boolean>
  /** Form id to submit when the per-section Save button is pressed. */
  formId?: string
  /** True while the form is being saved (disables the button + shows spinner). */
  saving?: boolean
  children: ReactNode
}

export function Section({ title, description, fields, dirtyFields, formId, saving, children }: SectionProps) {
  const sectionDirty = Boolean(
    fields && fields.length > 0 && dirtyFields && fields.some(name => dirtyFields[name]),
  )
  return (
    <section className={styles.section}>
      <div className={`${styles.sectionHead} ${sectionDirty ? styles.sectionHeadDirty : ''}`}>
        <div className={styles.sectionHeadCopy}>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {sectionDirty && formId ? (
          <button
            type="submit"
            form={formId}
            className={`btn btn-brass btn-sm ${styles.sectionSave}`}
            disabled={saving}
            aria-busy={saving}
            title="Save changes in this section"
          >
            {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Check aria-hidden="true" size={14} />}
            {saving ? 'Saving...' : 'Save section'}
          </button>
        ) : null}
      </div>
      <div className={styles.grid}>{children}</div>
    </section>
  )
}
