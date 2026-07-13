import { describe, expect, it } from 'vitest'
import {
  agentToFormValues,
  normalizeAgentApiErrors,
  normalizeAgents,
  toAgentFormData,
  type AgentFormValues,
} from './agent-form'
import type { AgentRecord } from './types'

const agent: AgentRecord = {
  id: 7,
  name: 'Marta Alemu',
  image: '/images/marta.jpg',
  phone_number: '+251 911 000 111',
  office_phone: '+251 115 000 111',
  email: 'marta@example.com',
  facebook: 'marta.alemu',
  instagram: '@marta',
  linkden: 'linkedin.com/in/marta',
  listing_count: 2,
}

describe('agent form helpers', () => {
  it('maps an existing agent without treating its current image as a new upload', () => {
    expect(agentToFormValues(agent)).toEqual({
      name: 'Marta Alemu',
      image: null,
      phone_number: '+251 911 000 111',
      office_phone: '+251 115 000 111',
      email: 'marta@example.com',
      facebook: 'marta.alemu',
      instagram: '@marta',
      linkden: 'linkedin.com/in/marta',
    })
  })

  it('serializes every supported model field and the selected photo', () => {
    const image = new File(['photo'], 'marta.jpg', { type: 'image/jpeg' })
    const values: AgentFormValues = { ...agentToFormValues(agent), image }
    const data = toAgentFormData(values)

    expect(data.get('name')).toBe('Marta Alemu')
    expect(data.get('phone_number')).toBe('+251 911 000 111')
    expect(data.get('office_phone')).toBe('+251 115 000 111')
    expect(data.get('email')).toBe('marta@example.com')
    expect(data.get('facebook')).toBe('marta.alemu')
    expect(data.get('instagram')).toBe('@marta')
    expect(data.get('linkden')).toBe('linkedin.com/in/marta')
    expect(data.get('image')).toBe(image)
    expect(Array.from(data.keys()).sort()).toEqual([
      'email',
      'facebook',
      'image',
      'instagram',
      'linkden',
      'name',
      'office_phone',
      'phone_number',
    ])
  })

  it('normalizes paginated results and field-level API errors', () => {
    expect(normalizeAgents({ results: [agent] })).toEqual([agent])
    expect(normalizeAgentApiErrors({ email: ['Enter a valid email address.'] })).toEqual({
      fields: { email: 'Enter a valid email address.' },
    })
  })
})
