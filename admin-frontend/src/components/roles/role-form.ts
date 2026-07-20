import { z } from 'zod'
import type { ApiCollection } from '@/lib/api-collection'
import type { GroupRecord } from '@/components/users/types'

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter a role name.')
    .max(150, 'Use at most 150 characters.')
    .regex(/^[A-Za-z0-9 _\-]+$/, 'Letters, digits, spaces, underscores, and hyphens only.'),
  permissions: z.array(z.number()),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>
export type RoleFieldName = keyof RoleFormValues

export type RoleCollection = ApiCollection<GroupRecord>

export function roleToFormValues(record?: GroupRecord | null): RoleFormValues {
  return {
    name: record?.name ?? '',
    permissions: record?.permissions ?? [],
  }
}

export function toRoleFormData(values: RoleFormValues) {
  const data = new FormData()
  data.append('name', values.name.trim())
  values.permissions.forEach(id => data.append('permissions', String(id)))
  return data
}

export function normalizeRoles(data: RoleCollection | undefined): GroupRecord[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

const roleFields = new Set<RoleFieldName>(['name', 'permissions'])

export interface RoleApiErrors {
  fields: Partial<Record<RoleFieldName, string>>
  form?: string
}

export function normalizeRoleApiErrors(data: unknown): RoleApiErrors {
  const result: RoleApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the roles service. Try again.'
    return result
  }
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (roleFields.has(key as RoleFieldName)) {
      result.fields[key as RoleFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })
  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The role could not be saved. Review the form and try again.'
  }
  return result
}

/** Convert a snake_case codename like "add_group" to "Add Group". */
export function humanizeCodename(codename: string): string {
  return codename
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Group a flat permission list by model name. */
export function groupPermissionsByModel(permissions: { id: number; name: string; codename: string; model: string; app_label: string }[]) {
  const groups: Record<string, { app_label: string; model: string; permissions: typeof permissions }> = {}
  for (const p of permissions) {
    const key = `${p.app_label}.${p.model}`
    if (!groups[key]) {
      groups[key] = { app_label: p.app_label, model: p.model, permissions: [] }
    }
    groups[key].permissions.push(p)
  }
  return Object.entries(groups).map(([key, value]) => ({ key, ...value }))
}
