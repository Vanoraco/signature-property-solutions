import { z } from 'zod'
import type { CategoryRecord, FacilityRecord, LookupKind, LookupRecord } from './types'

export const MAX_LOOKUP_IMAGE_SIZE = 10 * 1024 * 1024

const isFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

const imageFileSchema = z
  .custom<File | null>(value => value === null || isFile(value), 'Select a valid image file.')
  .refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
  .refine(value => value === null || value.size <= MAX_LOOKUP_IMAGE_SIZE, 'Images must be 10 MB or smaller.')

export const lookupFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(600, 'Use at most 600 characters.'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.'),
  icon: imageFileSchema,
})

export type LookupFormValues = z.infer<typeof lookupFormSchema>
export type LookupFieldName = keyof LookupFormValues

export function slugifyLookupName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function lookupName(record: LookupRecord) {
  return 'catagorys' in record ? record.catagorys : record.facilities_name
}

export function lookupToFormValues(record?: LookupRecord | null): LookupFormValues {
  return {
    name: record ? lookupName(record) : '',
    slug: record?.slug ?? '',
    icon: null,
  }
}

export function toLookupFormData(kind: LookupKind, values: LookupFormValues) {
  const data = new FormData()
  data.append(kind === 'categories' ? 'catagorys' : 'facilities_name', values.name.trim())
  data.append('slug', values.slug.trim())
  if (isFile(values.icon)) data.append('icon', values.icon)
  return data
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

export interface LookupApiErrors {
  fields: Partial<Record<LookupFieldName, string>>
  form?: string
}

export function normalizeLookupApiErrors(data: unknown, kind: LookupKind): LookupApiErrors {
  const result: LookupApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the lookup service. Try again.'
    return result
  }

  const nameField = kind === 'categories' ? 'catagorys' : 'facilities_name'
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (key === nameField) result.fields.name = message
    else if (key === 'slug' || key === 'icon') result.fields[key] = message
    else if (key === 'detail' || key === 'non_field_errors') result.form = message
  })

  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The record could not be saved. Review the form and try again.'
  }
  return result
}

export function isCategory(record: LookupRecord): record is CategoryRecord {
  return 'catagorys' in record
}

export function isFacility(record: LookupRecord): record is FacilityRecord {
  return 'facilities_name' in record
}
