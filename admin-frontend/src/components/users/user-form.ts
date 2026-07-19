import { z } from 'zod'
import type { ApiCollection } from '@/lib/api-collection'
import type { UserRecord } from './types'

const optionalText = z.string().trim().max(150, 'Use at most 150 characters.')

export const userFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(150, 'Use at most 150 characters.')
    .regex(/^[A-Za-z0-9_@.\-+]+$/, 'Letters, digits, and @/./+/-/_ only.'),
  email: z.string().trim().max(254, 'Use at most 254 characters.').email('Enter a valid email address.').or(z.literal('')),
  first_name: optionalText,
  last_name: optionalText,
  is_staff: z.boolean(),
  is_active: z.boolean(),
  is_superuser: z.boolean(),
  password: z.string().max(128, 'Use at most 128 characters.'),
  groups: z.array(z.number()),
})

export type UserFormValues = z.infer<typeof userFormSchema>
export type UserFieldName = keyof UserFormValues

const scalarFields: Array<Exclude<UserFieldName, 'groups'>> = [
  'username', 'email', 'first_name', 'last_name',
  'is_staff', 'is_active', 'is_superuser', 'password',
]

export type UserCollection = ApiCollection<UserRecord>

export function userToFormValues(record?: UserRecord | null): UserFormValues {
  return {
    username: record?.username ?? '',
    email: record?.email ?? '',
    first_name: record?.first_name ?? '',
    last_name: record?.last_name ?? '',
    is_staff: record ? record.is_staff : true,
    is_active: record ? record.is_active : true,
    is_superuser: record ? record.is_superuser : false,
    password: '',
    groups: record?.groups ?? [],
  }
}

export function toUserFormData(values: UserFormValues) {
  const data = new FormData()
  scalarFields.forEach(field => {
    const value = values[field]
    if (field === 'is_staff' || field === 'is_active' || field === 'is_superuser') {
      data.append(field, value ? 'true' : 'false')
    } else {
      data.append(field, String(value))
    }
  })
  values.groups.forEach(id => data.append('groups', String(id)))
  return data
}

export function normalizeUsers(data: UserCollection | undefined): UserRecord[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

const userFields = new Set<UserFieldName>([...scalarFields, 'groups'])

export interface UserApiErrors {
  fields: Partial<Record<UserFieldName, string>>
  form?: string
}

export function normalizeUserApiErrors(data: unknown): UserApiErrors {
  const result: UserApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the user service. Try again.'
    return result
  }
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (userFields.has(key as UserFieldName)) {
      result.fields[key as UserFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })
  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The user could not be saved. Review the form and try again.'
  }
  return result
}
