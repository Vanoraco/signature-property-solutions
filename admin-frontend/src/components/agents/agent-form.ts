import { z } from 'zod'
import type { AgentCollection, AgentRecord } from './types'

export const MAX_AGENT_IMAGE_SIZE = 10 * 1024 * 1024

const isFile = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File

const imageSchema = z
  .custom<File | null>(value => value === null || isFile(value), 'Select a valid image file.')
  .refine(value => value === null || value.type.startsWith('image/'), 'Select an image file.')
  .refine(value => value === null || value.size <= MAX_AGENT_IMAGE_SIZE, 'Images must be 10 MB or smaller.')

const optionalText = z.string().trim().max(600, 'Use at most 600 characters.')

export const agentFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the agent\'s full name.').max(600, 'Use at most 600 characters.'),
  image: imageSchema,
  phone_number: z.string().trim().min(1, 'Enter a phone number.').max(600, 'Use at most 600 characters.'),
  office_phone: optionalText,
  email: z.string().trim().min(1, 'Enter an email address.').email('Enter a valid email address.').max(600, 'Use at most 600 characters.'),
  facebook: optionalText,
  instagram: optionalText,
  linkden: optionalText,
})

export type AgentFormValues = z.infer<typeof agentFormSchema>
export type AgentFieldName = keyof AgentFormValues

const scalarFields: Array<Exclude<AgentFieldName, 'image'>> = [
  'name',
  'phone_number',
  'office_phone',
  'email',
  'facebook',
  'instagram',
  'linkden',
]

export function agentToFormValues(agent?: AgentRecord | null): AgentFormValues {
  return {
    name: agent?.name ?? '',
    image: null,
    phone_number: agent?.phone_number ?? '',
    office_phone: agent?.office_phone ?? '',
    email: agent?.email ?? '',
    facebook: agent?.facebook ?? '',
    instagram: agent?.instagram ?? '',
    linkden: agent?.linkden ?? '',
  }
}

export function toAgentFormData(values: AgentFormValues) {
  const data = new FormData()
  scalarFields.forEach(field => data.append(field, values[field]))
  if (isFile(values.image)) data.append('image', values.image)
  return data
}

export function normalizeAgents(data: AgentCollection | undefined): AgentRecord[] {
  if (!data) return []
  return Array.isArray(data) ? data : data.results
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join(' ')
  return undefined
}

const agentFields = new Set<AgentFieldName>(['name', 'image', ...scalarFields.slice(1)])

export interface AgentApiErrors {
  fields: Partial<Record<AgentFieldName, string>>
  form?: string
}

export function normalizeAgentApiErrors(data: unknown): AgentApiErrors {
  const result: AgentApiErrors = { fields: {} }
  if (!data || typeof data !== 'object') {
    result.form = 'Unable to connect to the agent service. Try again.'
    return result
  }

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    const message = errorMessage(value)
    if (!message) return
    if (agentFields.has(key as AgentFieldName)) {
      result.fields[key as AgentFieldName] = message
    } else if (key === 'non_field_errors' || key === 'detail') {
      result.form = message
    }
  })

  if (!result.form && Object.keys(result.fields).length === 0) {
    result.form = 'The agent could not be saved. Review the form and try again.'
  }
  return result
}
