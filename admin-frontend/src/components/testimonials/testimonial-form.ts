import { z } from 'zod'
import type { Testimonial } from '@/components/dashboard/types'
import type { ApiCollection } from '@/lib/api-collection'

export const MAX_TESTIMONIAL_IMAGE_SIZE = 10 * 1024 * 1024

const isFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

const imageSchema = z
  .custom<File | null>(value => value === null || isFile(value), 'Select a valid image file.')
  .refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
  .refine(value => value === null || value.size <= MAX_TESTIMONIAL_IMAGE_SIZE, 'Images must be 10 MB or smaller.')

const optionalText = z.string().trim().max(600, 'Use at most 600 characters.')

export const testimonialFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the client\'s name.').max(200, 'Use at most 200 characters.'),
  role: optionalText,
  location: optionalText,
  quote: z.string().trim().min(5, 'Enter the testimonial quote.').max(4000, 'Use at most 4000 characters.'),
  rating: z.number().int().min(1, 'Pick a rating.').max(5, 'Rating must be between 1 and 5.'),
  is_published: z.boolean(),
  image: imageSchema,
})

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>
export type TestimonialFieldName = keyof TestimonialFormValues

const scalarFields: Array<Exclude<TestimonialFieldName, 'image'>> = [
  'name', 'role', 'location', 'quote', 'rating', 'is_published',
]

export type TestimonialCollection = ApiCollection<Testimonial>

export function testimonialToFormValues(record?: Testimonial | null): TestimonialFormValues {
  return {
    name: record?.name ?? '',
    role: record?.role ?? '',
    location: record?.location ?? '',
    quote: record?.quote ?? '',
    rating: record?.rating ?? 5,
    is_published: record ? record.is_published : true,
    image: null,
  }
}

export function toTestimonialFormData(values: TestimonialFormValues) {
  const data = new FormData()
  scalarFields.forEach(field => {
    const value = values[field]
    if (field === 'is_published') {
      data.append(field, value ? 'true' : 'false')
    } else {
      data.append(field, String(value))
    }
  })
  if (isFile(values.image)) data.append('image', values.image)
  return data
}

export function normalizeTestimonials(data: TestimonialCollection | undefined): Testimonial[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

const testimonialFields = new Set<TestimonialFieldName>(['name', 'role', 'location', 'quote', 'rating', 'is_published', 'image'])

export interface TestimonialApiErrors {
  fields: Partial<Record<TestimonialFieldName, string>>
  form?: string
}

export function normalizeTestimonialApiErrors(data: unknown): TestimonialApiErrors {
  const result: TestimonialApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the testimonial service. Try again.'
    return result
  }

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (testimonialFields.has(key as TestimonialFieldName)) {
      result.fields[key as TestimonialFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })

  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The testimonial could not be saved. Review the form and try again.'
  }
  return result
}
