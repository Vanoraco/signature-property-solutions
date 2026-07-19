'use client'

import { useEffect, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Shield } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import {
  userFormSchema,
  userToFormValues,
  type UserApiErrors,
  type UserFormValues,
} from './user-form'
import type { GroupRecord, UserRecord } from './types'
import { groupsQueryOptions } from '@/lib/admin-queries'
import type { ApiCollection } from '@/lib/api-collection'
import styles from './UserForm.module.css'

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

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
  variant?: 'default' | 'danger'
}

function Toggle({ label, description, checked, onChange, variant = 'default' }: ToggleProps) {
  return (
    <div className={styles.toggleRow}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-variant={variant}
        className={styles.toggleSwitch}
        onClick={() => onChange(!checked)}
        aria-label={`${checked ? 'Disable' : 'Enable'} ${label}`}
      />
      <div className={styles.toggleCopy}>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
    </div>
  )
}

interface UserFormProps {
  formId?: string
  initialUser: UserRecord | null
  apiErrors: UserApiErrors | null
  onSubmit: (values: UserFormValues) => void | Promise<void>
}

export default function UserForm({
  formId = 'user-editor-form',
  initialUser,
  apiErrors,
  onSubmit,
}: UserFormProps) {
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: userToFormValues(initialUser),
    mode: 'onBlur',
  })
  const isStaff = useWatch({ control, name: 'is_staff' })
  const isActive = useWatch({ control, name: 'is_active' })
  const isSuperuser = useWatch({ control, name: 'is_superuser' })
  const selectedGroups = useWatch({ control, name: 'groups' })

  const groupsQuery = useQuery({
    ...groupsQueryOptions,
    staleTime: 15 * 60_000,
  })
  const groupsData = groupsQuery.data as ApiCollection<GroupRecord> | undefined
  const groups: GroupRecord[] = groupsData
    ? (Array.isArray(groupsData) ? groupsData : groupsData.results)
    : []

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof UserFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const toggleGroup = (id: number) => {
    const next = selectedGroups.includes(id)
      ? selectedGroups.filter(g => g !== id)
      : [...selectedGroups, id]
    setValue('groups', next, { shouldDirty: true })
  }

  const isCreate = !initialUser

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {apiErrors?.form ? (
        <div className={styles.formAlert} role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{apiErrors.form}</span>
        </div>
      ) : null}

      <div className={styles.grid}>
        <Field label="Username" htmlFor="user-username" error={errors.username?.message} required spanTwo>
          {descriptionId => <input id="user-username" className={styles.input} autoComplete="username" aria-invalid={Boolean(errors.username)} aria-describedby={descriptionId} {...register('username')} />}
        </Field>
        <Field label="Email" htmlFor="user-email" error={errors.email?.message} spanTwo>
          {descriptionId => <input id="user-email" type="email" className={styles.input} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={descriptionId} {...register('email')} />}
        </Field>
        <Field label="First name" htmlFor="user-first_name" error={errors.first_name?.message}>
          {descriptionId => <input id="user-first_name" className={styles.input} aria-invalid={Boolean(errors.first_name)} aria-describedby={descriptionId} {...register('first_name')} />}
        </Field>
        <Field label="Last name" htmlFor="user-last_name" error={errors.last_name?.message}>
          {descriptionId => <input id="user-last_name" className={styles.input} aria-invalid={Boolean(errors.last_name)} aria-describedby={descriptionId} {...register('last_name')} />}
        </Field>
        <Field
          label="Password"
          htmlFor="user-password"
          error={errors.password?.message}
          hint={isCreate ? 'At least 8 characters. Sent securely.' : 'Leave blank to keep the current password.'}
          required={isCreate}
          spanTwo
        >
          {descriptionId => (
            <input
              id="user-password"
              type="password"
              className={styles.input}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={descriptionId}
              {...register('password')}
            />
          )}
        </Field>
      </div>

      <div className={styles.grid}>
        <Toggle
          label="Staff access"
          description="Can sign in to the admin dashboard"
          checked={isStaff}
          onChange={next => setValue('is_staff', next, { shouldDirty: true })}
        />
        <Toggle
          label="Active"
          description="Allowed to sign in"
          checked={isActive}
          onChange={next => setValue('is_active', next, { shouldDirty: true })}
        />
        <Toggle
          label="Superuser"
          description="Full unrestricted access (use sparingly)"
          checked={isSuperuser}
          onChange={next => setValue('is_superuser', next, { shouldDirty: true })}
          variant="danger"
        />
      </div>
      <input type="hidden" value={isStaff ? 'true' : 'false'} {...register('is_staff')} />
      <input type="hidden" value={isActive ? 'true' : 'false'} {...register('is_active')} />
      <input type="hidden" value={isSuperuser ? 'true' : 'false'} {...register('is_superuser')} />

      <div className={styles.field}>
        <span className={styles.label}>Roles (groups)</span>
        <div className={styles.groupGrid} role="group" aria-label="Assigned roles">
          {groups.length === 0 ? (
            <div className={styles.groupEmpty}>
              <Shield aria-hidden="true" size={20} style={{ marginBottom: 4 }} />
              <div>No roles defined yet. Create roles on the Roles &amp; Permissions page.</div>
            </div>
          ) : groups.map(group => {
            const checked = selectedGroups.includes(group.id)
            return (
              <label key={group.id} className={styles.groupOption}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGroup(group.id)}
                />
                <div className={styles.groupCopy}>
                  <strong>{group.name}</strong>
                  <span>{group.user_count} member{group.user_count === 1 ? '' : 's'}</span>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </form>
  )
}
