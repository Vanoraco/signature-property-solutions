'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Edit, LoaderCircle, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import api from '@/lib/api'
import { usersQueryOptions, adminQueryKeys } from '@/lib/admin-queries'
import {
  normalizeUserApiErrors,
  normalizeUsers,
  toUserFormData,
  type UserApiErrors,
  type UserFormValues,
} from '@/components/users/user-form'
import type { UserRecord } from '@/components/users/types'
import EntityTables, { type EntityColumn } from '@/components/lookups/EntityTable'
import Modal from '@/components/ui/Modal'
import AdminToast, {
  createAdminToastFeedback,
  type AdminToastFeedback,
} from '@/components/ui/AdminToast'

const loadUserForm = () => import('@/components/users/UserForm')
const UserForm = dynamic(loadUserForm, {
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center" role="status" aria-label="Loading user editor">
      <LoaderCircle aria-hidden="true" className="animate-spin text-brass" size={22} />
    </div>
  ),
})

interface SaveUserArgs {
  values: UserFormValues
  userId?: number
}

function responseData(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  return (error as { response?: { data?: unknown } }).response?.data
}

function userSearchText(u: UserRecord) {
  return [u.username, u.email, u.first_name, u.last_name, ...u.group_names].join('\n')
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [saveErrors, setSaveErrors] = useState<UserApiErrors | null>(null)
  const [feedback, setFeedback] = useState<AdminToastFeedback | null>(null)

  const usersQuery = useQuery(usersQueryOptions)

  const closeEditor = () => {
    setModalOpen(false)
    setEditing(null)
    setSaveErrors(null)
  }

  const openCreate = () => {
    void loadUserForm()
    setFeedback(null)
    setSaveErrors(null)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (user: UserRecord) => {
    void loadUserForm()
    setFeedback(null)
    setSaveErrors(null)
    setEditing(user)
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: ({ values, userId }: SaveUserArgs) => {
      const data = toUserFormData(values)
      return userId ? api.patch(`/users/${userId}/`, data) : api.post('/users/', data)
    },
    onMutate: () => {
      setSaveErrors(null)
      setFeedback(null)
    },
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users })
      closeEditor()
      setFeedback(createAdminToastFeedback(
        variables.userId ? 'User updated successfully.' : 'User created successfully.',
      ))
    },
    onError: error => {
      setSaveErrors(normalizeUserApiErrors(responseData(error)))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (user: UserRecord) => api.delete(`/users/${user.id}/`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users })
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback('User deleted successfully.'))
    },
    onError: (error) => {
      const data = responseData(error)
      const detail = data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : 'The user could not be deleted.'
      setDeleteTarget(null)
      setFeedback(createAdminToastFeedback(detail, 'danger'))
    },
  })

  const columns: EntityColumn<UserRecord>[] = [
    {
      key: 'username',
      label: 'User',
      className: 'min-w-[220px]',
      sortVal: u => u.username,
      render: u => (
        <div className="flex items-center gap-2.5">
          <div className="w-[42px] h-[42px] rounded-full bg-border-soft text-text-faint flex items-center justify-center">
            <UserRound aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <div className="cell-primary">
              {u.username}
              {u.is_superuser ? (
                <ShieldCheck aria-hidden="true" size={13} className="ml-1.5 text-brass-dark inline" />
              ) : null}
            </div>
            <div className="cell-sub break-all">{u.email || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      className: 'min-w-[170px]',
      render: u => {
        const full = [u.first_name, u.last_name].filter(Boolean).join(' ')
        return <span className="text-text-soft">{full || '—'}</span>
      },
    },
    {
      key: 'group_names',
      label: 'Roles',
      className: 'min-w-[160px]',
      render: u => u.group_names.length === 0
        ? <span className="text-text-faint">—</span>
        : <span className="flex flex-wrap gap-1">{u.group_names.map(g => <span key={g} className="chip chip-gray">{g}</span>)}</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      className: 'min-w-[110px]',
      sortVal: u => (u.is_active ? 1 : 0),
      render: u => (
        <span className={`chip ${u.is_active ? 'chip-success' : 'chip-gray'}`}>
          {u.is_active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'last_login',
      label: 'Last login',
      className: 'min-w-[130px]',
      sortVal: u => u.last_login ?? '',
      render: u => <span className="cell-sub whitespace-nowrap">{formatDate(u.last_login)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-[118px]',
      render: u => (
        <div className="entity-row-actions">
          <button
            type="button"
            aria-label={`Edit ${u.username}`}
            title="Edit user"
            onMouseEnter={() => void loadUserForm()}
            onFocus={() => void loadUserForm()}
            onTouchStart={() => void loadUserForm()}
            onClick={event => {
              event.stopPropagation()
              openEdit(u)
            }}
            className="entity-row-action"
          >
            <Edit aria-hidden="true" size={14} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${u.username}`}
            title="Delete user"
            onClick={event => {
              event.stopPropagation()
              setFeedback(null)
              setDeleteTarget(u)
            }}
            className="entity-row-action entity-row-action-danger"
          >
            <Trash2 aria-hidden="true" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const users = normalizeUsers(usersQuery.data)

  return (
    <div>
      <div className="page-head">
        <div className="page-head-main">
          <div className="page-eyebrow">Team &amp; Access</div>
          <h1 className="page-title">Users</h1>
          <p className="page-desc">Manage every staff account that can sign in to the admin dashboard.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          onMouseEnter={() => void loadUserForm()}
          onFocus={() => void loadUserForm()}
          onTouchStart={() => void loadUserForm()}
          className="btn btn-brass"
        >
          <Plus aria-hidden="true" size={16} /> New User
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

      {usersQuery.isLoading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading users">
          <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
        </div>
      ) : usersQuery.isError ? (
        <div className="rounded-lg border border-danger-tint bg-danger-tint p-6 text-center text-danger" role="alert">
          <p className="text-[13px] font-semibold">Users could not be loaded.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => usersQuery.refetch()}>Retry</button>
        </div>
      ) : (
        <EntityTables
          columns={columns}
          data={users}
          entityLabel="Users"
          searchPlaceholder="Search users..."
          searchText={userSearchText}
          storageKey="signature-admin-users-views"
          selectedIds={new Set()}
          onSelectionChange={() => {}}
          onRequestBulkDelete={() => {}}
          emptyMessage="No users"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeEditor}
        title={editing ? 'Edit User' : 'New User'}
        description={editing ? 'Editing an existing staff account.' : 'Create a new staff account.'}
        size="lg"
        footer={(
          <>
            <button type="button" onClick={closeEditor} className="btn btn-ghost" disabled={saveMutation.isPending}>Cancel</button>
            <button type="submit" form="user-editor-form" className="btn btn-primary" disabled={saveMutation.isPending} aria-busy={saveMutation.isPending}>
              {saveMutation.isPending
                ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                : <Check aria-hidden="true" size={15} />}
              {saveMutation.isPending ? 'Saving...' : 'Save User'}
            </button>
          </>
        )}
      >
        <UserForm
          key={editing ? `edit-${editing.id}` : 'create'}
          initialUser={editing}
          apiErrors={saveErrors}
          onSubmit={values => saveMutation.mutate({ values, userId: editing?.id })}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete User?"
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
          Delete the account <strong>{deleteTarget?.username}</strong>? This action cannot be undone.
          {deleteTarget ? (
            <span className="block mt-2 text-text-faint">
              The user will no longer be able to sign in. Existing properties and content
              created by this user will remain unchanged.
            </span>
          ) : null}
        </p>
      </Modal>
    </div>
  )
}
