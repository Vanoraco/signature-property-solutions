'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Edit, LoaderCircle, Plus, Search, Shield, Trash2, Users } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import api from '@/lib/api'
import { adminQueryKeys, groupsQueryOptions, permissionsQueryOptions } from '@/lib/admin-queries'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'
import Modal from '@/components/ui/Modal'
import EntityTables, { type EntityColumn } from '@/components/lookups/EntityTable'
import {
  groupPermissionsByModel,
  normalizeRoleApiErrors,
  normalizeRoles,
  roleFormSchema,
  roleToFormValues,
  toRoleFormData,
  type RoleApiErrors,
  type RoleFormValues,
} from '@/components/roles/role-form'
import type { GroupRecord, PermissionRecord } from '@/components/roles/types'
import styles from '@/components/roles/RoleForm.module.css'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: (descriptionId?: string) => ReactNode
}

function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`
  const descriptionId = error ? errorId : hint ? hintId : undefined
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}{required ? <span className={styles.required} aria-hidden="true"> *</span> : null}
      </label>
      {children(descriptionId)}
      {hint && !error ? <p id={hintId} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={errorId} className={styles.errorText}>{error}</p> : null}
    </div>
  )
}

interface RoleFormProps {
  formId?: string
  initialRole: GroupRecord | null
  apiErrors: RoleApiErrors | null
  onSubmit: (values: RoleFormValues) => void | Promise<void>
}

function RoleForm({ formId = 'role-editor-form', initialRole, apiErrors, onSubmit }: RoleFormProps) {
  const [permSearch, setPermSearch] = useState('')
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: roleToFormValues(initialRole),
    mode: 'onBlur',
  })
  const selected = useWatch({ control, name: 'permissions' })

  const permissionsQuery = useQuery(permissionsQueryOptions)
  const permissions = useMemo(() => permissionsQuery.data?.results ?? [], [permissionsQuery.data])

  useEffect(() => {
    if (!apiErrors) return
    Object.entries(apiErrors.fields).forEach(([field, message]) => {
      if (message) setError(field as keyof RoleFormValues, { type: 'server', message })
    })
  }, [apiErrors, setError])

  const togglePermission = (id: number) => {
    const next = selected.includes(id)
      ? selected.filter(p => p !== id)
      : [...selected, id]
    setValue('permissions', next, { shouldDirty: true })
  }

  const toggleAllInGroup = (groupPerms: PermissionRecord[]) => {
    const allSelected = groupPerms.every(p => selected.includes(p.id))
    if (allSelected) {
      const groupIds = new Set(groupPerms.map(p => p.id))
      setValue('permissions', selected.filter(id => !groupIds.has(id)), { shouldDirty: true })
    } else {
      const newIds = groupPerms.map(p => p.id).filter(id => !selected.includes(id))
      setValue('permissions', [...selected, ...newIds], { shouldDirty: true })
    }
  }

  const grouped = useMemo(() => {
    const all = groupPermissionsByModel(permissions as PermissionRecord[])
    const query = permSearch.trim().toLowerCase()
    if (!query) return all
    return all
      .map(g => ({
        ...g,
        permissions: g.permissions.filter(p =>
          p.codename.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          g.model.toLowerCase().includes(query)
        ),
      }))
      .filter(g => g.permissions.length > 0)
  }, [permissions, permSearch])

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {apiErrors?.form ? (
        <div className={styles.formAlert} role="alert">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{apiErrors.form}</span>
        </div>
      ) : null}

      <Field label="Role name" htmlFor="role-name" error={errors.name?.message} hint="A friendly label like Editor, Manager, or Reviewer." required>
        {descriptionId => <input id="role-name" className={styles.input} aria-invalid={Boolean(errors.name)} aria-describedby={descriptionId} {...register('name')} />}
      </Field>

      <div className={styles.field}>
        <span className={styles.label}>Permissions <span className={styles.permissionSummary}>{selected.length} selected</span></span>
        {permissionsQuery.isLoading ? (
          <p className={styles.hint}>Loading permissions…</p>
        ) : permissions.length === 0 ? (
          <p className={styles.hint}>No permissions available.</p>
        ) : (
          <>
            <div className={styles.permissionToolbar}>
              <label className={styles.permissionSearch}>
                <Search aria-hidden="true" size={14} />
                <input
                  type="search"
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                  placeholder="Search permissions..."
                />
              </label>
            </div>
            <div className={styles.permissionGroups}>
              {grouped.map(group => {
                const groupIds = group.permissions.map(p => p.id)
                const selectedCount = groupIds.filter(id => selected.includes(id)).length
                const allSelected = selectedCount === groupIds.length && groupIds.length > 0
                // Auto-expand groups that already have selected perms or match search
                const hasSelected = selectedCount > 0
                const isSearching = permSearch.trim().length > 0
                return (
                  <details
                    key={group.key}
                    className={styles.permissionGroup}
                    open={hasSelected || isSearching}
                  >
                    <summary className={styles.permissionGroupHead}>
                      <strong>{group.model}</strong>
                      <span className={styles.permissionGroupMeta}>
                        <span className={styles.permissionGroupCount}>
                          {selectedCount}/{groupIds.length}
                        </span>
                        <button
                          type="button"
                          className={styles.selectAllBtn}
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleAllInGroup(group.permissions)
                          }}
                        >
                          {allSelected ? 'Clear' : 'All'}
                        </button>
                      </span>
                    </summary>
                    <div className={styles.permissionList}>
                      {group.permissions.map(p => {
                        const checked = selected.includes(p.id)
                        return (
                          <label key={p.id} className={styles.permissionOption}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.id)}
                            />
                            <span className={styles.permissionCopy}>
                              <strong>{p.codename}</strong>
                              <span>{p.name}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </details>
                )
              })}
              {grouped.length === 0 ? (
                <div className={styles.permissionEmpty}>No permissions match your search.</div>
              ) : null}
            </div>
          </>
        )}
        {errors.permissions?.message ? <p className={styles.errorText}>{errors.permissions.message}</p> : null}
      </div>
    </form>
  )
}

interface SaveRoleArgs {
  values: RoleFormValues
  roleId?: number
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

export default function RolesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GroupRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GroupRecord | null>(null)
  const [saveErrors, setSaveErrors] = useState<RoleApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const groupsQuery = useQuery(groupsQueryOptions)
  const groups = normalizeRoles(groupsQuery.data)

  const closeEditor = () => {
    setModalOpen(false)
    setEditing(null)
    setSaveErrors(null)
  }

  const openCreate = () => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (role: GroupRecord) => {
    setFeedback(null)
    setSaveErrors(null)
    setEditing(role)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, roleId }: SaveRoleArgs) => {
      const data = toRoleFormData(values)
      return roleId ? api.patch(`/groups/${roleId}/`, data) : api.post('/groups/', data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      // Invalidate both groups and users (since user.group_names depends on groups)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
      ])
      closeEditor()
      setFeedback(createAdminToastFeedback(
        variables.roleId ? 'Role updated successfully.' : 'Role created successfully.',
      ))
    },
    onError: error => {
      setSaveErrors(normalizeRoleApiErrors(responseData(error)))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (role: GroupRecord) => api.delete(`/groups/${role.id}/`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
      ])
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('Role deleted successfully.'))
    },
    onError: (error) => {
      const data = responseData(error)
      const detail = data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : 'The role could not be deleted.'
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback(detail, 'danger'))
    },
  })

  const columns: EntityColumn<GroupRecord>[] = [
    {
      key: 'name',
      label: 'Role',
      className: 'min-w-[200px]',
      sortVal: r => r.name,
      render: r => (
        <div className="flex items-center gap-2.5">
          <div className="w-[42px] h-[42px] rounded-lg bg-brass-tint text-brass-dark flex items-center justify-center">
            <Shield aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <div className="cell-primary">{r.name}</div>
            <div className="cell-sub">{r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'user_count',
      label: 'Members',
      className: 'min-w-[120px]',
      sortVal: r => r.user_count,
      render: r => (
        <span className="inline-flex items-center gap-1.5 text-text-soft">
          <Users aria-hidden="true" size={14} /> {r.user_count}
        </span>
      ),
    },
    {
      key: 'permission_details',
      label: 'Permissions',
      className: 'min-w-[260px] max-w-[420px]',
      render: r => r.permission_details.length === 0
        ? <span className="text-text-faint">No permissions assigned</span>
        : (
          <span className="text-text-soft line-clamp-2">
            {r.permission_details.map(p => p.codename).join(', ')}
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-[118px]',
      render: r => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`Edit ${r.name}`}
            title="Edit role"
            onClick={event => {
              event.stopPropagation()
              openEdit(r)
            }}
            className="entity-row-action"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${r.name}`}
            title="Delete role"
            disabled={r.user_count > 0}
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setDeleteTarget(r)
            }}
            className={`entity-row-action entity-row-action-danger ${r.user_count > 0 ? 'entity-row-action-muted' : ''}`}
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-eyebrow">Team &amp; Access</div>
          <h1 className="page-title">Roles &amp; Permissions</h1>
          <p className="page-desc">Manage staff roles and the granular permissions attached to each role.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-brass">
          <Plus aria-hidden="true" size={16} /> New Role
        </button>
      </div>

      {feedback ? (
        <AdminToast
          eventId={feedback.id}
          tone={feedback.tone}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      {groupsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading roles">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : groupsQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Roles could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => groupsQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTables
          columns={columns}
          data={groups}
          entityLabel="Roles"
          searchPlaceholder="Search roles..."
          searchText={(r) => `${r.name}\n${r.permission_details.map(p => p.codename).join('\n')}`}
          storageKey="signature-admin-roles-views"
          selectedIds={new Set()}
          onSelectionChange={() => {}}
          onRequestBulkDelete={() => {}}
          emptyMessage="No roles defined"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeEditor}
        title={editing ? 'Edit Role' : 'New Role'}
        description={editing ? 'Editing an existing role.' : 'Create a new role and assign permissions.'}
        size="lg"
        footer={(
          <>
            <button type="button" onClick={closeEditor} className="btn btn-ghost" disabled={saveMutation.isPending}>Cancel</button>
            <button type="submit" form="role-editor-form" className="btn btn-primary" disabled={saveMutation.isPending} aria-busy={saveMutation.isPending}>
              {saveMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                : <Check aria-hidden="true" size={15} />}
              {saveMutation.isPending ? 'Saving...' : 'Save Role'}
            </button>
          </>
        )}
      >
        <RoleForm
          key={editing ? `edit-${editing.id}` : 'create'}
          initialRole={editing}
          apiErrors={saveErrors}
          onSubmit={values => saveMutation.mutate({ values, roleId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Role?"
        size="default"
        footer={(
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost" disabled={deleteMutation.isPending}>Cancel</button>
            <button
              type="button"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget) }}
              className="btn btn-danger"
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                : <Trash2 aria-hidden="true" size={14} />}
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </>
        )}
      >
        <p className="text-text-soft text-[13.5px]">
          Delete the role <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
