import { z } from 'zod'
import type { ApiCollection } from '@/lib/api-collection'
import type { ServiceRecord } from '@/components/dashboard/types'

export const MAX_SERVICE_IMAGE_SIZE = 10 * 1024 * 1024

const isFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

const imageSchema = z
  .custom<File | null>(value => value === null || isFile(value), 'Select a valid image file.')
  .refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
  .refine(value => value === null || value.size <= MAX_SERVICE_IMAGE_SIZE, 'Images must be 10 MB or smaller.')

export const serviceFormSchema = z.object({
  service_name: z.string().trim().min(2, 'Enter a service name.').max(600, 'Use at most 600 characters.'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.'),
  short_discriptions: z.string().trim().min(5, 'Enter a short description.').max(4000, 'Use at most 4000 characters.'),
  Discription: z.string().trim().min(5, 'Enter a full description.').max(200_000, 'Content is too long.'),
  icon: imageSchema,
  image: imageSchema,
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>
export type ServiceFieldName = keyof ServiceFormValues

const scalarFields: Array<Exclude<ServiceFieldName, 'icon' | 'image'>> = [
  'service_name', 'slug', 'short_discriptions', 'Discription',
]

export type ServiceCollection = ApiCollection<ServiceRecord>

export function slugifyServiceName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function serviceToFormValues(record?: ServiceRecord | null): ServiceFormValues {
  return {
    service_name: record?.service_name ?? '',
    slug: record?.slug ?? '',
    short_discriptions: record?.short_discriptions ?? '',
    Discription: record?.Discription ?? '',
    icon: null,
    image: null,
  }
}

export function toServiceFormData(values: ServiceFormValues) {
  const data = new FormData()
  scalarFields.forEach(field => data.append(field, values[field]))
  if (isFile(values.icon)) data.append('icon', values.icon)
  if (isFile(values.image)) data.append('image', values.image)
  return data
}

export function normalizeServices(data: ServiceCollection | undefined): ServiceRecord[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

const serviceFields = new Set<ServiceFieldName>([...scalarFields, 'icon', 'image'])

export interface ServiceApiErrors {
  fields: Partial<Record<ServiceFieldName, string>>
  form?: string
}

export function normalizeServiceApiErrors(data: unknown): ServiceApiErrors {
  const result: ServiceApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the service API. Try again.'
    return result
  }

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (serviceFields.has(key as ServiceFieldName)) {
      result.fields[key as ServiceFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })

  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The service could not be saved. Review the form and try again.'
  }
  return result
}
