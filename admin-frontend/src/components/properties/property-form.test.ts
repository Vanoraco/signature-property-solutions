import { describe, expect, it } from 'vitest'
import {
  emptyPropertyFormValues,
  MAX_PROPERTY_IMAGE_SIZE,
  normalizeApiErrors,
  normalizeResults,
  propertyFormSchema,
  propertyToFormValues,
  slugifyPropertyTitle,
  toPropertyFormData,
} from './property-form'
import type { PropertyRecord } from './types'

const property: PropertyRecord = {
  id: 7,
  property_id: 'SPS-007',
  property_title: 'Bole Garden Apartment',
  slug: 'bole-garden-apartment',
  price: '8,500,000 ETB',
  price_amount: 8500000,
  price_currency: 'ETB',
  property_types: 2,
  category_name: 'Apartment',
  category_slug: 'apartment',
  agent: 4,
  agent_name: 'Marta Alemu',
  facilitie: [1, 3],
  facilitie_names: ['Parking', 'Security'],
  property_location: 'Bole',
  property_size: 160,
  property_area: 180,
  property_status: 'For Sale',
  property_floor: 6,
  bedrooms: '3',
  bathrooms: '2',
  furnished: 'Furnished',
  property_short_discription: 'Quiet three-bedroom apartment.',
  main_image: '/media/products/main.jpg',
  slide_1: '/media/products/slide-1.jpg',
  slide_2: null,
  slide_3: null,
  slide_4: null,
  slide_5: null,
  slide_6: null,
  video_link: 'https://example.com/tour',
  last_update: '2026-07-12T08:00:00Z',
}

describe('property form contracts', () => {
  it('slugifies a property title', () => {
    expect(slugifyPropertyTitle('  Bole Garden Apartment  ')).toBe('bole-garden-apartment')
  })

  it('maps an API property to editable string values', () => {
    const values = propertyToFormValues(property)
    expect(values.property_types).toBe('2')
    expect(values.agent).toBe('4')
    expect(values.facilitie).toEqual(['1', '3'])
    expect(values.property_size).toBe('160')
    expect(values.main_image).toBeNull()
  })

  it('accepts a complete valid property', () => {
    const result = propertyFormSchema.safeParse({
      ...emptyPropertyFormValues,
      property_title: 'Bole Garden Apartment',
      slug: 'bole-garden-apartment',
      price: '8,500,000 ETB',
      property_types: '2',
      property_location: 'Bole',
      facilitie: ['1'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid required and numeric values', () => {
    const result = propertyFormSchema.safeParse({
      ...emptyPropertyFormValues,
      property_title: '',
      slug: 'Invalid Slug',
      price: '',
      property_types: '',
      property_location: '',
      property_size: '-1',
      facilitie: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid video URLs, non-images, and oversized images', () => {
    const nonImage = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const oversized = new File(
      [new Uint8Array(MAX_PROPERTY_IMAGE_SIZE + 1)],
      'oversized.png',
      { type: 'image/png' },
    )
    const result = propertyFormSchema.safeParse({
      ...emptyPropertyFormValues,
      property_title: 'Bole Garden Apartment',
      slug: 'bole-garden-apartment',
      price: '8,500,000 ETB',
      property_types: '2',
      property_location: 'Bole',
      facilitie: ['1'],
      video_link: 'ftp://example.com/tour',
      main_image: nonImage,
      slide_1: oversized,
    })
    expect(result.success).toBe(false)
  })

  it('builds repeated facility entries and appends only new files', () => {
    const mainImage = new File(['image'], 'main.png', { type: 'image/png' })
    const data = toPropertyFormData({
      ...propertyToFormValues(property),
      agent: '',
      video_link: '',
      main_image: mainImage,
    })
    expect(data.getAll('facilitie')).toEqual(['1', '3'])
    expect(data.get('agent')).toBe('')
    expect(data.get('video_link')).toBe('')
    expect(data.get('main_image')).toBe(mainImage)
    expect(data.has('slide_1')).toBe(false)
  })

  it('normalizes paginated and plain lookup responses', () => {
    expect(normalizeResults([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(normalizeResults({ results: [{ id: 2 }] })).toEqual([{ id: 2 }])
  })

  it('normalizes Django field and form errors', () => {
    expect(normalizeApiErrors({
      slug: ['This field must be unique.'],
      non_field_errors: ['Unable to save property.'],
    })).toEqual({
      fields: { slug: 'This field must be unique.' },
      form: 'Unable to save property.',
    })
  })
})
