import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AgentForm from './AgentForm'
import type { AgentRecord } from './types'

const existingAgent: AgentRecord = {
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

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:agent-photo') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})

describe('AgentForm', () => {
  it('shows required-field errors before submitting an empty agent', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <>
        <AgentForm initialAgent={null} apiErrors={null} onSubmit={onSubmit} />
        <button type="submit" form="agent-editor-form">Validate agent</button>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Validate agent' }))

    expect(await screen.findByText("Enter the agent's full name.")).toBeInTheDocument()
    expect(screen.getByText('Enter a phone number.')).toBeInTheDocument()
    expect(screen.getByText('Enter an email address.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveAttribute('aria-describedby', 'agent-name-error')
    expect(screen.getByText("Enter the agent's full name.")).toHaveAttribute('id', 'agent-name-error')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('prefills the editable model fields for an existing agent', () => {
    render(<AgentForm initialAgent={existingAgent} apiErrors={null} onSubmit={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Marta Alemu')
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+251 911 000 111')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('marta@example.com')
    expect(screen.getByAltText('Agent photo preview')).toHaveAttribute('src', expect.stringContaining('marta.jpg'))
    expect(screen.getByLabelText('Agent photo file')).toHaveAttribute('aria-describedby', 'agent-image-hint')
    expect(screen.getByText('Current photo')).toHaveAttribute('id', 'agent-image-hint')
  })

  it('selects an image file and submits valid values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const photo = new File(['photo'], 'new-photo.png', { type: 'image/png' })
    render(
      <>
        <AgentForm initialAgent={existingAgent} apiErrors={null} onSubmit={onSubmit} />
        <button type="submit" form="agent-editor-form">Save test agent</button>
      </>,
    )

    await user.upload(screen.getByLabelText('Agent photo file'), photo)
    await user.click(screen.getByRole('button', { name: 'Save test agent' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Marta Alemu', image: photo })
  })

  it('renders normalized server errors beside their fields', async () => {
    render(
      <AgentForm
        initialAgent={existingAgent}
        apiErrors={{ fields: { email: 'An agent with this email already exists.' }, form: 'Unable to save agent.' }}
        onSubmit={vi.fn()}
      />,
    )

    expect(await screen.findByText('An agent with this email already exists.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save agent.')
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-describedby', 'agent-email-error')
    })
    expect(screen.getByText('An agent with this email already exists.')).toHaveAttribute('id', 'agent-email-error')
  })
})
