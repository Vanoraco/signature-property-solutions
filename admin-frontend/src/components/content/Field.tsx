'use client'

import { type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react'
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
  children: ReactNode
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className={styles.grid}>{children}</div>
    </section>
  )
}
