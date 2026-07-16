import { z } from 'zod'

const optionalText = z.string().trim().max(2000, 'Use at most 2000 characters.')
const optionalLongText = z.string().max(200_000, 'Content is too long.')

export const homeFormSchema = z.object({
  slogon: optionalText,
  title: optionalText,
  image: z.custom<File | null>(
    value => value === null || (typeof File !== 'undefined' && value instanceof File),
    'Select a valid image file.',
  ).refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
    .refine(value => value === null || value.size <= 10 * 1024 * 1024, 'Images must be 10 MB or smaller.'),
})

export type HomeFormValues = z.infer<typeof homeFormSchema>
export type HomeFieldName = keyof HomeFormValues

const homeScalarFields: Array<Exclude<HomeFieldName, 'image'>> = ['slogon', 'title']

export function homeToFormValues(record?: { slogon: string; title: string } | null): HomeFormValues {
  return {
    slogon: record?.slogon ?? '',
    title: record?.title ?? '',
    image: null,
  }
}

export function toHomeFormData(values: HomeFormValues) {
  const data = new FormData()
  homeScalarFields.forEach(field => data.append(field, values[field]))
  if (values.image && typeof File !== 'undefined' && values.image instanceof File) {
    data.append('image', values.image)
  }
  return data
}

export const aboutFormSchema = z.object({
  hading: optionalText,
  title: optionalText,
  aboutus: optionalLongText,
  vision: optionalLongText,
  mission: optionalLongText,
  value: optionalLongText,
  why_choose_us_header: optionalText,
  tytle: optionalText,
  description: optionalLongText,
  ceo_name: optionalText,
  ceo_position: optionalText,
  ceo_description: optionalLongText,
  ceo_facebook: optionalText,
  ceo_twitter: optionalText,
  ceo_linkden: optionalText,
})

export type AboutFormValues = z.infer<typeof aboutFormSchema>
export type AboutFieldName = keyof AboutFormValues

const aboutScalarFields: AboutFieldName[] = [
  'hading', 'title', 'aboutus', 'vision', 'mission', 'value',
  'why_choose_us_header', 'tytle', 'description',
  'ceo_name', 'ceo_position', 'ceo_description',
  'ceo_facebook', 'ceo_twitter', 'ceo_linkden',
]

export function aboutToFormValues(
  record?: Partial<Record<AboutFieldName, string>> | null,
): AboutFormValues {
  const values: Record<AboutFieldName, string> = {
    hading: '', title: '', aboutus: '', vision: '', mission: '', value: '',
    why_choose_us_header: '', tytle: '', description: '',
    ceo_name: '', ceo_position: '', ceo_description: '',
    ceo_facebook: '', ceo_twitter: '', ceo_linkden: '',
  }
  if (record) {
    aboutScalarFields.forEach(field => {
      const value = record[field]
      if (typeof value === 'string') values[field] = value
    })
  }
  return values
}

export function toAboutFormData(values: AboutFormValues) {
  const data = new FormData()
  aboutScalarFields.forEach(field => data.append(field, values[field]))
  return data
}

export const contactFormSchema = z.object({
  phone_number: z.string().trim().max(600, 'Use at most 600 characters.'),
  office_phone: optionalText,
  email: z.string().trim().max(600, 'Use at most 600 characters.'),
  website: optionalText,
  address: optionalText,
  google_map: optionalText,
  facebook: optionalText,
  instagram: optionalText,
  linkden: optionalText,
})

export type ContactFormValues = z.infer<typeof contactFormSchema>
export type ContactFieldName = keyof ContactFormValues

const contactScalarFields: ContactFieldName[] = [
  'phone_number', 'office_phone', 'email', 'website', 'address',
  'google_map', 'facebook', 'instagram', 'linkden',
]

export function contactToFormValues(
  record?: Partial<Record<ContactFieldName, string>> | null,
): ContactFormValues {
  const values: Record<ContactFieldName, string> = {
    phone_number: '', office_phone: '', email: '', website: '', address: '',
    google_map: '', facebook: '', instagram: '', linkden: '',
  }
  if (record) {
    contactScalarFields.forEach(field => {
      const value = record[field]
      if (typeof value === 'string') values[field] = value
    })
  }
  return values
}

export function toContactFormData(values: ContactFormValues) {
  const data = new FormData()
  contactScalarFields.forEach(field => data.append(field, values[field]))
  return data
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

export interface ContentApiErrors {
  fields: Record<string, string>
  form?: string
}

export function normalizeContentApiErrors(
  data: unknown,
  fieldSet: Set<string>,
): ContentApiErrors {
  const result: ContentApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the content service. Try again.'
    return result
  }
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (fieldSet.has(key)) {
      result.fields[key] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })
  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The content could not be saved. Review the form and try again.'
  }
  return result
}
