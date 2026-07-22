import { z } from 'zod'
import type { AboutRecord, ServicesPageRecord } from './types'

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
  video: z.custom<File | null>(
    value => value === null || (typeof File !== 'undefined' && value instanceof File),
    'Select a valid video file.',
  ).refine(value => value === null || value.type.startsWith('video/'), 'Select a video file.')
    .refine(value => value === null || value.size <= 200 * 1024 * 1024, 'Videos must be 200 MB or smaller.'),
})

export type HomeFormValues = z.infer<typeof homeFormSchema>
export type HomeFieldName = keyof HomeFormValues

const homeScalarFields: Array<Exclude<HomeFieldName, 'image' | 'video'>> = ['slogon', 'title']

export function homeToFormValues(record?: { slogon: string; title: string } | null): HomeFormValues {
  return {
    slogon: record?.slogon ?? '',
    title: record?.title ?? '',
    image: null,
    video: null,
  }
}

export function toHomeFormData(values: HomeFormValues) {
  const data = new FormData()
  homeScalarFields.forEach(field => data.append(field, values[field]))
  if (values.image && typeof File !== 'undefined' && values.image instanceof File) {
    data.append('image', values.image)
  }
  if (values.video && typeof File !== 'undefined' && values.video instanceof File) {
    data.append('video', values.video)
  }
  return data
}

const nullableId = z.number().int().positive().nullable()
const stableKey = z.string().trim().max(100, 'Use at most 100 characters.').refine(
  value => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
  'Use lowercase letters, numbers, and hyphens.',
)
const requiredItemText = z.string().trim().min(1, 'Text is required.').max(200_000, 'Content is too long.')

export const orderedTextSchema = z.object({
  id: nullableId,
  key: stableKey,
  text: requiredItemText,
})

export const aboutValueItemSchema = orderedTextSchema.extend({
  key: stableKey,
  tag: z.string().trim().min(1, 'Label is required.').max(200, 'Use at most 200 characters.'),
})

export const aboutWhyItemSchema = orderedTextSchema.extend({
  key: stableKey,
  title: z.string().trim().min(1, 'Title is required.').max(600, 'Use at most 600 characters.'),
})

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
  hero_lead: optionalLongText,
  commitment_promise: optionalText,
  commitment: optionalLongText,
  hero_eyebrow: optionalText,
  hero_title: optionalText,
  vision_statement: optionalLongText,
  mission_statement: optionalLongText,
  why_choose_title: optionalText,
  intro_paragraphs: z.array(orderedTextSchema),
  value_items: z.array(aboutValueItemSchema),
  why_items: z.array(aboutWhyItemSchema),
  commitment_paragraphs: z.array(orderedTextSchema),
})

export type AboutFormValues = z.infer<typeof aboutFormSchema>
export type AboutFieldName = keyof AboutFormValues

export const aboutScalarFields = [
  'hading', 'title', 'aboutus', 'vision', 'mission', 'value',
  'why_choose_us_header', 'tytle', 'description',
  'ceo_name', 'ceo_position', 'ceo_description',
  'ceo_facebook', 'ceo_twitter', 'ceo_linkden',
  'hero_lead', 'commitment_promise', 'commitment',
  'hero_eyebrow', 'hero_title', 'vision_statement', 'mission_statement',
  'why_choose_title',
] as const satisfies readonly AboutFieldName[]

type AboutScalarField = (typeof aboutScalarFields)[number]

export function aboutToFormValues(
  record?: Partial<AboutRecord> | null,
): AboutFormValues {
  const values: AboutFormValues = {
    hading: '', title: '', aboutus: '', vision: '', mission: '', value: '',
    why_choose_us_header: '', tytle: '', description: '',
    ceo_name: '', ceo_position: '', ceo_description: '',
    ceo_facebook: '', ceo_twitter: '', ceo_linkden: '',
    hero_lead: '', commitment_promise: '', commitment: '',
    hero_eyebrow: '', hero_title: '', vision_statement: '', mission_statement: '',
    why_choose_title: '',
    intro_paragraphs: [], value_items: [], why_items: [], commitment_paragraphs: [],
  }
  if (record) {
    aboutScalarFields.forEach(field => {
      const value = record[field]
      if (typeof value === 'string') values[field] = value
    })
    values.intro_paragraphs = (record.intro_paragraphs ?? []).map(item => ({
      id: item.id ?? null,
      key: item.key ?? '',
      text: item.text ?? '',
    }))
    values.value_items = (record.value_items ?? []).map(item => ({
      id: item.id ?? null,
      key: item.key ?? '',
      tag: item.tag ?? '',
      text: item.text ?? '',
    }))
    values.why_items = (record.why_items ?? []).map(item => ({
      id: item.id ?? null,
      key: item.key ?? '',
      title: item.title ?? '',
      text: item.text ?? '',
    }))
    values.commitment_paragraphs = (record.commitment_paragraphs ?? []).map(item => ({
      id: item.id ?? null,
      key: item.key ?? '',
      text: item.text ?? '',
    }))
  }
  return values
}

export const ABOUT_IMAGE_FIELDS = [
  'image',
  'aboutus_image',
  'vision_image',
  'mission_image',
  'value_image',
  'ceo_image',
] as const

export type AboutImageField = (typeof ABOUT_IMAGE_FIELDS)[number]

export function toAboutImageFormData(
  images?: Partial<Record<AboutImageField, File | null>>,
  clearImages?: readonly AboutImageField[],
) {
  const data = new FormData()
  if (images) {
    ABOUT_IMAGE_FIELDS.forEach(field => {
      const file = images[field]
      if (file && typeof File !== 'undefined' && file instanceof File) {
        data.append(field, file)
      }
    })
  }
  if (clearImages && clearImages.length > 0) {
    clearImages.forEach(name => data.append('clear_images', name))
  }
  return data
}

function slugifyKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function assignStableKeys<T extends { key: string }>(
  items: T[],
  source: (item: T) => string,
  fallbackPrefix: string,
  requiredPrefix = '',
) {
  const normalizeKey = (value: string) => {
    const slug = slugifyKey(value)
    if (!slug) return ''
    const ownedKey = requiredPrefix && !slug.startsWith(requiredPrefix)
      ? `${requiredPrefix}${slug}`
      : slug
    return ownedKey.slice(0, 100).replace(/-+$/, '')
  }
  const used = new Set(items.map(item => normalizeKey(item.key)).filter(Boolean))
  return items.map((item, index) => {
    const existing = normalizeKey(item.key)
    if (existing) return { ...item, key: existing }

    const fallback = `${fallbackPrefix}-${index + 1}`
    const root = normalizeKey(source(item)) || normalizeKey(fallback)
    let candidate = root
    let suffix = 2
    while (used.has(candidate)) {
      const ending = `-${suffix}`
      candidate = `${root.slice(0, 100 - ending.length)}${ending}`
      suffix += 1
    }
    used.add(candidate)
    return { ...item, key: candidate }
  })
}

function orderedText(item: { id: number | null; key: string; text: string }, order: number) {
  return { id: item.id, key: item.key, text: item.text, order }
}

export function toAboutPayload(values: AboutFormValues) {
  const scalars = aboutScalarFields.reduce<Record<AboutScalarField, string>>((payload, field) => {
    payload[field] = values[field]
    return payload
  }, {} as Record<AboutScalarField, string>)
  const introParagraphs = assignStableKeys(values.intro_paragraphs, item => item.text, 'intro')
  const valueItems = assignStableKeys(values.value_items, item => item.tag, 'value')
  const whyItems = assignStableKeys(values.why_items, item => item.title, 'reason')
  const commitmentParagraphs = assignStableKeys(
    values.commitment_paragraphs,
    item => item.text,
    'commitment',
  )

  return {
    ...scalars,
    intro_paragraphs: introParagraphs.map(orderedText),
    value_items: valueItems.map((item, order) => ({
      id: item.id,
      key: item.key,
      tag: item.tag,
      text: item.text,
      order,
    })),
    why_items: whyItems.map((item, order) => ({
      id: item.id,
      key: item.key,
      title: item.title,
      text: item.text,
      order,
    })),
    commitment_paragraphs: commitmentParagraphs.map(orderedText),
  }
}

export const servicesPageItemSchema = z.object({
  id: nullableId,
  key: stableKey,
  title: z.string().trim().min(1, 'Title is required.').max(600, 'Use at most 600 characters.'),
  text: z.string().max(2000, 'Use at most 2000 characters.'),
})

export const servicesPageTagItemSchema = z.object({
  id: nullableId,
  key: stableKey,
  text: z.string().trim().min(1, 'Tag text is required.').max(600, 'Use at most 600 characters.'),
})

export const servicesPageTagGroupSchema = z.object({
  id: nullableId,
  key: stableKey,
  title: z.string().trim().min(1, 'Group title is required.').max(200, 'Use at most 200 characters.'),
  items: z.array(servicesPageTagItemSchema),
})

export const servicesPageServiceSchema = z.object({
  id: nullableId,
  key: stableKey,
  tag: z.string().trim().min(1, 'Category label is required.').max(200, 'Use at most 200 characters.'),
  title: z.string().trim().min(1, 'Service title is required.').max(600, 'Use at most 600 characters.'),
  tagline: z.string().trim().max(600, 'Use at most 600 characters.'),
  paragraphs: z.array(orderedTextSchema),
  tag_groups: z.array(servicesPageTagGroupSchema),
})

export const servicesPageFormSchema = z.object({
  hero_eyebrow: optionalText,
  hero_title: optionalText,
  hero_lead: optionalLongText,
  intro: optionalLongText,
  why_choose_title: optionalText,
  process_title: optionalText,
  why_items: z.array(servicesPageItemSchema),
  process_steps: z.array(servicesPageItemSchema),
  service_items: z.array(servicesPageServiceSchema),
})

export type ServicesPageItemValues = z.infer<typeof servicesPageItemSchema>
export type ServicesPageTagItemValues = z.infer<typeof servicesPageTagItemSchema>
export type ServicesPageTagGroupValues = z.infer<typeof servicesPageTagGroupSchema>
export type ServicesPageServiceValues = z.infer<typeof servicesPageServiceSchema>
export type ServicesPageFormValues = z.infer<typeof servicesPageFormSchema>
export type ServicesPageFieldName = keyof ServicesPageFormValues

export const servicesPageScalarFields = [
  'hero_eyebrow', 'hero_title', 'hero_lead', 'intro',
  'why_choose_title', 'process_title',
] as const

export function servicesPageToFormValues(
  record?: Partial<ServicesPageRecord> | null,
): ServicesPageFormValues {
  const toItems = (
    items?: Array<{ id: number; key: string; title: string; text: string }>,
  ): ServicesPageItemValues[] =>
    (items ?? []).map(item => ({
      id: item.id,
      key: item.key ?? '',
      title: item.title ?? '',
      text: item.text ?? '',
    }))

  return {
    hero_eyebrow: record?.hero_eyebrow ?? '',
    hero_title: record?.hero_title ?? '',
    hero_lead: record?.hero_lead ?? '',
    intro: record?.intro ?? '',
    why_choose_title: record?.why_choose_title ?? '',
    process_title: record?.process_title ?? '',
    why_items: toItems(record?.why_items),
    process_steps: toItems(record?.process_steps),
    service_items: (record?.service_items ?? []).map(service => ({
      id: service.id ?? null,
      key: service.key ?? '',
      tag: service.tag ?? '',
      title: service.title ?? '',
      tagline: service.tagline ?? '',
      paragraphs: (service.paragraphs ?? []).map(item => ({
        id: item.id ?? null,
        key: item.key ?? '',
        text: item.text ?? '',
      })),
      tag_groups: (service.tag_groups ?? []).map(group => ({
        id: group.id ?? null,
        key: group.key ?? '',
        title: group.title ?? '',
        items: (group.items ?? []).map(item => ({
          id: item.id ?? null,
          key: item.key ?? '',
          text: item.text ?? '',
        })),
      })),
    })),
  }
}

export function toServicesPagePayload(values: ServicesPageFormValues) {
  const toItem = (item: ServicesPageItemValues, order: number) => ({
    id: item.id,
    key: item.key,
    title: item.title,
    text: item.text,
    order,
  })
  const whyItems = assignStableKeys(
    values.why_items,
    item => item.title,
    'reason',
    'reference-',
  )
  const processSteps = assignStableKeys(
    values.process_steps,
    item => item.title,
    'step',
    'reference-',
  )
  const serviceItems = assignStableKeys(values.service_items, item => item.title || item.tag, 'service')
  return {
    hero_eyebrow: values.hero_eyebrow,
    hero_title: values.hero_title,
    hero_lead: values.hero_lead,
    intro: values.intro,
    why_choose_title: values.why_choose_title,
    process_title: values.process_title,
    why_items: whyItems.map(toItem),
    process_steps: processSteps.map(toItem),
    service_items: serviceItems.map((service, order) => {
      const paragraphs = assignStableKeys(service.paragraphs, item => item.text, 'paragraph')
      const groups = assignStableKeys(service.tag_groups, group => group.title, 'group')
      return {
        id: service.id,
        key: service.key,
        tag: service.tag,
        title: service.title,
        tagline: service.tagline,
        order,
        paragraphs: paragraphs.map(orderedText),
        tag_groups: groups.map((group, groupOrder) => ({
          id: group.id,
          key: group.key,
          title: group.title,
          order: groupOrder,
          items: assignStableKeys(group.items, item => item.text, 'tag').map(orderedText),
        })),
      }
    }),
  }
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
