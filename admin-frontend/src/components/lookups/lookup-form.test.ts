import { describe, expect, it } from 'vitest'
import {
  lookupToFormValues,
  normalizeLookupApiErrors,
  slugifyLookupName,
  toLookupFormData,
} from './lookup-form'
import type { CategoryRecord, FacilityRecord } from './types'

const category: CategoryRecord = {
  id: 4,
  catagorys: 'Office Space',
  slug: 'office-space',
  icon: '/images/office.png',
  property_count: 3,
}

const facility: FacilityRecord = {
  id: 9,
  facilities_name: 'Backup Generator',
  slug: 'backup-generator',
  property_count: 2,
}

describe('lookup form helpers', () => {
  it('normalizes names into URL-safe slugs', () => {
    expect(slugifyLookupName('  Café & Office Space  ')).toBe('cafe-office-space')
  })

  it('maps category and facility records into editable values', () => {
    expect(lookupToFormValues(category)).toEqual({ name: 'Office Space', slug: 'office-space', icon: null })
    expect(lookupToFormValues(facility)).toEqual({ name: 'Backup Generator', slug: 'backup-generator', icon: null })
  })

  it('builds multipart payloads with each backend model field', () => {
    const icon = new File(['icon'], 'office.png', { type: 'image/png' })
    const categoryData = toLookupFormData('categories', { name: 'Office Space', slug: 'office-space', icon })
    const facilityData = toLookupFormData('facilities', { name: 'Backup Generator', slug: 'backup-generator', icon: null })

    expect(categoryData.get('catagorys')).toBe('Office Space')
    expect(categoryData.get('slug')).toBe('office-space')
    expect(categoryData.get('icon')).toBe(icon)
    expect(facilityData.get('facilities_name')).toBe('Backup Generator')
    expect(facilityData.get('slug')).toBe('backup-generator')
    expect(facilityData.has('icon')).toBe(false)
  })

  it('maps backend field and form errors to the shared form', () => {
    expect(normalizeLookupApiErrors({ catagorys: ['This field is required.'], slug: ['Already exists.'] }, 'categories')).toEqual({
      fields: { name: 'This field is required.', slug: 'Already exists.' },
    })
    expect(normalizeLookupApiErrors({ detail: 'Unable to save.' }, 'facilities')).toEqual({
      fields: {},
      form: 'Unable to save.',
    })
  })
})
