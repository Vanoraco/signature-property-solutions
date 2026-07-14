import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LookupForm from './LookupForm'
import type { CategoryRecord } from './types'

const category: CategoryRecord = {
  id: 4,
  catagorys: 'Office Space',
  slug: 'keep-office-url',
  icon: '/images/office.png',
  property_count: 3,
}

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:category-icon') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})

describe('LookupForm', () => {
  it('generates a slug while naming a new category', async () => {
    const user = userEvent.setup()
    render(<LookupForm kind="categories" initialRecord={null} apiErrors={null} onSubmit={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: /Category Name/i }), 'Luxury Apartment')

    expect(screen.getByRole('textbox', { name: /Slug/i })).toHaveValue('luxury-apartment')
  })

  it('preserves the existing slug while editing', async () => {
    const user = userEvent.setup()
    render(<LookupForm kind="categories" initialRecord={category} apiErrors={null} onSubmit={vi.fn()} />)

    const name = screen.getByRole('textbox', { name: /Category Name/i })
    await user.clear(name)
    await user.type(name, 'Renamed Office')

    expect(screen.getByRole('textbox', { name: /Slug/i })).toHaveValue('keep-office-url')
  })

  it('requires an icon for a new category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <>
        <LookupForm kind="categories" initialRecord={null} apiErrors={null} onSubmit={onSubmit} />
        <button type="submit" form="lookup-editor-form">Save category</button>
      </>,
    )

    await user.type(screen.getByRole('textbox', { name: /Category Name/i }), 'Apartment')
    await user.click(screen.getByRole('button', { name: 'Save category' }))

    expect(await screen.findByText('Select a category icon.')).toBeInTheDocument()
    expect(screen.getByLabelText('Category icon file')).toHaveAttribute(
      'aria-describedby',
      'lookup-icon-file-hint lookup-icon-requirement lookup-icon-error',
    )
    expect(screen.getByText('Select a category icon.')).toHaveAttribute('id', 'lookup-icon-error')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid category with its selected icon', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const icon = new File(['icon'], 'apartment.png', { type: 'image/png' })
    render(
      <>
        <LookupForm kind="categories" initialRecord={null} apiErrors={null} onSubmit={onSubmit} />
        <button type="submit" form="lookup-editor-form">Save category</button>
      </>,
    )

    await user.type(screen.getByRole('textbox', { name: /Category Name/i }), 'Apartment')
    await user.upload(screen.getByLabelText('Category icon file'), icon)
    await user.click(screen.getByRole('button', { name: 'Save category' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Apartment',
      slug: 'apartment',
      icon,
    })
  })

  it('associates server errors and hints, then clears only the edited field error', async () => {
    const user = userEvent.setup()
    render(
      <LookupForm
        kind="categories"
        initialRecord={category}
        apiErrors={{
          fields: {
            name: 'A category with this name already exists.',
            slug: 'A category with this slug already exists.',
          },
          form: 'Unable to save category.',
        }}
        onSubmit={vi.fn()}
      />,
    )

    const nameInput = screen.getByRole('textbox', { name: /Category Name/i })
    const slugInput = screen.getByRole('textbox', { name: /Slug/i })
    expect(nameInput).toHaveAttribute('aria-describedby', 'lookup-name-error')
    expect(slugInput).toHaveAttribute('aria-describedby', 'lookup-slug-hint lookup-slug-error')
    expect(screen.getByText('Used in the listing URL.')).toHaveAttribute('id', 'lookup-slug-hint')
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save category.')

    await user.clear(slugInput)
    await user.type(slugInput, 'updated-office-url')

    expect(screen.queryByText('A category with this slug already exists.')).not.toBeInTheDocument()
    expect(slugInput).toHaveAttribute('aria-describedby', 'lookup-slug-hint')
    expect(screen.getByText('A category with this name already exists.')).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('aria-describedby', 'lookup-name-error')
  })
})
