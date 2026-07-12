import { z } from 'zod'
import type { ApiCollection, PropertyMediaField, PropertyRecord } from './types'
import { PROPERTY_MEDIA_FIELDS } from './types'

export const MAX_PROPERTY_IMAGE_SIZE = 10 * 1024 * 1024

const isFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

const imageFileSchema = z
  .custom<File | null>(value => value === null || isFile(value), 'Select a valid image file.')
  .refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
  .refine(value => value === null || value.size <= MAX_PROPERTY_IMAGE_SIZE, 'Images must be 10 MB or smaller.')

const nonNegativeInteger = z
  .string()
  .regex(/^\d+$/, 'Enter a non-negative whole number.')
  .refine(value => Number.isSafeInteger(Number(value)), 'Enter a valid whole number.')

const optionalHttpUrl = z.string().refine(value => {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}, 'Enter a valid HTTP or HTTPS URL.')

export const propertyFormSchema = z.object({
  property_id: z.string().max(20, 'Use at most 20 characters.'),
  property_title: z.string().trim().min(2, 'Enter a property title.').max(600),
  slug: z.string().trim().min(1, 'Enter a slug.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.'),
  price: z.string().trim().min(1, 'Enter a price.').max(100),
  property_types: z.string().min(1, 'Select a category.'),
  agent: z.string(),
  facilitie: z.array(z.string()).min(1, 'Select at least one facility.'),
  property_location: z.string().trim().min(1, 'Enter a location.').max(100),
  property_size: nonNegativeInteger,
  property_area: nonNegativeInteger,
  property_status: z.enum(['For Sale', 'For Rent']),
  property_floor: nonNegativeInteger,
  bedrooms: z.string().max(100),
  bathrooms: z.string().max(100),
  furnished: z.string().max(100),
  property_short_discription: z.string(),
  main_image: imageFileSchema,
  slide_1: imageFileSchema,
  slide_2: imageFileSchema,
  slide_3: imageFileSchema,
  slide_4: imageFileSchema,
  slide_5: imageFileSchema,
  slide_6: imageFileSchema,
  video_link: optionalHttpUrl,
})

export type PropertyFormValues = z.infer<typeof propertyFormSchema>
export type PropertyFieldName = keyof PropertyFormValues

export const emptyPropertyFormValues: PropertyFormValues = {
  property_id: '',
  property_title: '',
  slug: '',
  price: '',
  property_types: '',
  agent: '',
  facilitie: [],
  property_location: '',
  property_size: '0',
  property_area: '0',
  property_status: 'For Sale',
  property_floor: '0',
  bedrooms: '',
  bathrooms: '',
  furnished: '',
  property_short_discription: '',
  main_image: null,
  slide_1: null,
  slide_2: null,
  slide_3: null,
  slide_4: null,
  slide_5: null,
  slide_6: null,
  video_link: '',
}

export const PROPERTY_FIELD_TABS: Record<PropertyFieldName, 'basic' | 'location' | 'amenities' | 'media'> = {
  property_id: 'basic',
  property_title: 'basic',
  slug: 'basic',
  property_status: 'basic',
  property_types: 'basic',
  agent: 'basic',
  property_short_discription: 'basic',
  price: 'location',
  property_location: 'location',
  property_size: 'location',
  property_area: 'location',
  property_floor: 'location',
  bedrooms: 'location',
  bathrooms: 'location',
  furnished: 'location',
  facilitie: 'amenities',
  main_image: 'media',
  slide_1: 'media',
  slide_2: 'media',
  slide_3: 'media',
  slide_4: 'media',
  slide_5: 'media',
  slide_6: 'media',
  video_link: 'media',
}

export function slugifyPropertyTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function propertyToFormValues(property?: PropertyRecord | null): PropertyFormValues {
  if (!property) return { ...emptyPropertyFormValues, facilitie: [] }

  return {
    property_id: property.property_id ?? '',
    property_title: property.property_title,
    slug: property.slug,
    price: property.price,
    property_types: String(property.property_types),
    agent: property.agent === null ? '' : String(property.agent),
    facilitie: property.facilitie.map(String),
    property_location: property.property_location,
    property_size: String(property.property_size ?? 0),
    property_area: String(property.property_area ?? 0),
    property_status: property.property_status,
    property_floor: String(property.property_floor ?? 0),
    bedrooms: property.bedrooms ?? '',
    bathrooms: property.bathrooms ?? '',
    furnished: property.furnished ?? '',
    property_short_discription: property.property_short_discription ?? '',
    main_image: null,
    slide_1: null,
    slide_2: null,
    slide_3: null,
    slide_4: null,
    slide_5: null,
    slide_6: null,
    video_link: property.video_link ?? '',
  }
}

const scalarFields: PropertyFieldName[] = [
  'property_id',
  'property_title',
  'slug',
  'price',
  'property_types',
  'agent',
  'property_location',
  'property_size',
  'property_area',
  'property_status',
  'property_floor',
  'bedrooms',
  'bathrooms',
  'furnished',
  'property_short_discription',
  'video_link',
]

export function toPropertyFormData(values: PropertyFormValues) {
  const data = new FormData()
  scalarFields.forEach(field => data.append(field, String(values[field])))
  values.facilitie.forEach(id => data.append('facilitie', id))
  PROPERTY_MEDIA_FIELDS.forEach(field => {
    const file = values[field]
    if (isFile(file)) data.append(field, file)
  })
  return data
}

export function normalizeResults<T>(data: ApiCollection<T> | undefined): T[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

const propertyFields = new Set<PropertyFieldName>([
  ...scalarFields,
  'facilitie',
  ...PROPERTY_MEDIA_FIELDS,
])

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

export interface NormalizedApiErrors {
  fields: Partial<Record<PropertyFieldName, string>>
  form?: string
}

export function normalizeApiErrors(data: unknown): NormalizedApiErrors {
  const result: NormalizedApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the property service. Try again.'
    return result
  }

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (propertyFields.has(key as PropertyFieldName)) {
      result.fields[key as PropertyFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })

  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The property could not be saved. Review the form and try again.'
  }
  return result
}

export function existingPropertyMedia(
  property?: PropertyRecord | null,
): Partial<Record<PropertyMediaField, string | null>> {
  if (!property) return {}
  return Object.fromEntries(PROPERTY_MEDIA_FIELDS.map(field => [field, property[field]]))
}
