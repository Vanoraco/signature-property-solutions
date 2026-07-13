import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PropertyForm from './PropertyForm'
import type { PropertyRecord } from './types'

vi.mock('./PropertyMediaFields', () => ({
  default: () => <div>Media controls</div>,
}))

const baseProps = {
  initialProperty: null,
  categories: [{ id: 2, catagorys: 'Apartment' }],
  agents: [{ id: 4, name: 'Marta Alemu' }],
  facilities: [{ id: 1, facilities_name: 'Parking' }],
  lookupsLoading: false,
  lookupError: false,
  apiErrors: null,
  onRetryLookups: vi.fn(),
  onSubmit: vi.fn(),
}

describe('PropertyForm', () => {
  it('generates a slug from a new property title', async () => {
    const user = userEvent.setup()
    render(<PropertyForm {...baseProps} />)
    await user.type(screen.getByRole('textbox', { name: 'Property title' }), 'Bole Garden Apartment')
    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('bole-garden-apartment')
  })

  it('preserves the existing slug while editing', async () => {
    const user = userEvent.setup()
    const initialProperty = {
      id: 7,
      property_id: 'SPS-007',
      property_title: 'Original title',
      slug: 'keep-this-slug',
      price: '8,500,000 ETB',
      price_amount: 8500000,
      price_currency: 'ETB',
      property_types: 2,
      category_name: 'Apartment',
      category_slug: 'apartment',
      agent: 4,
      agent_name: 'Marta Alemu',
      facilitie: [1],
      facilitie_names: ['Parking'],
      property_location: 'Bole',
      property_size: 160,
      property_area: 180,
      property_status: 'For Sale',
      property_floor: 6,
      bedrooms: '3',
      bathrooms: '2',
      furnished: 'Furnished',
      property_short_discription: '',
      main_image: null,
      slide_1: null,
      slide_2: null,
      slide_3: null,
      slide_4: null,
      slide_5: null,
      slide_6: null,
      video_link: '',
      last_update: '2026-07-12T08:00:00Z',
    } satisfies PropertyRecord
    render(<PropertyForm {...baseProps} initialProperty={initialProperty} />)
    await user.clear(screen.getByRole('textbox', { name: 'Property title' }))
    await user.type(screen.getByRole('textbox', { name: 'Property title' }), 'Changed title')
    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('keep-this-slug')
  })

  it('returns to Basic Info when required basic fields are invalid', async () => {
    const user = userEvent.setup()
    render(
      <>
        <PropertyForm {...baseProps} />
        <button type="submit" form="property-editor-form">Validate property</button>
      </>,
    )
    await user.click(screen.getByRole('tab', { name: 'Media' }))
    await user.click(screen.getByRole('button', { name: 'Validate property' }))
    expect(await screen.findByText('Enter a property title.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Basic Info' })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Property title' })).toHaveFocus())
  })

  it('renders normalized server errors beside their fields', async () => {
    render(
      <PropertyForm
        {...baseProps}
        apiErrors={{ fields: { slug: 'This field must be unique.' }, form: 'Unable to save property.' }}
      />,
    )
    expect(await screen.findByText('This field must be unique.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save property.')
  })
})
