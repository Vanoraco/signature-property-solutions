import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AgentsPage from '@/app/agents/page'
import api from '@/lib/api'
import { fetchCollection } from '@/lib/api-collection'
import type { AgentRecord } from './types'

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/api-collection', () => ({
  fetchCollection: vi.fn(),
}))

const agents: AgentRecord[] = [
  {
    id: 7,
    name: 'Marta Alemu',
    image: null,
    phone_number: '+251 911 000 111',
    office_phone: '',
    email: 'marta@example.com',
    facebook: '',
    instagram: '',
    linkden: '',
    listing_count: 2,
  },
  {
    id: 8,
    name: 'Daniel Bekele',
    image: null,
    phone_number: '+251 922 000 222',
    office_phone: '',
    email: 'daniel@example.com',
    facebook: '',
    instagram: '',
    linkden: 'https://linkedin.com/in/daniel-lookup',
    listing_count: 0,
  },
  {
    id: 9,
    name: 'Sara Tesfaye',
    image: null,
    phone_number: '+251 933 000 333',
    office_phone: '',
    email: 'sara@example.com',
    facebook: '',
    instagram: '',
    linkden: '',
    listing_count: 0,
  },
]

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AgentsPage />
    </QueryClientProvider>,
  )
  return { ...view, queryClient }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCollection).mockResolvedValue({ count: agents.length, results: agents })
  vi.mocked(api.post).mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockResolvedValue({ data: {} })
  vi.mocked(api.delete).mockResolvedValue({ data: {} })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:agent-photo') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})

describe('AgentsPage', () => {
  it('finds agents by social profile fields', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByRole('searchbox', { name: 'Search agents' }), 'daniel-lookup')

    expect(screen.getByText('Daniel Bekele')).toBeInTheDocument()
    expect(screen.queryByText('Marta Alemu')).not.toBeInTheDocument()
  })

  it('blocks deleting an agent that still owns listings', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Delete Marta Alemu' }))

    const dialog = screen.getByRole('dialog', { name: 'Agent Cannot Be Deleted' })
    expect(within(dialog).getByText(/assigned to 2 active listings/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('blocks bulk deletion when a selected agent has active listings', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Marta Alemu')
    await user.click(screen.getByRole('checkbox', { name: 'Select Marta Alemu' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Daniel Bekele' }))
    await user.click(screen.getByRole('button', { name: 'Delete Selected' }))

    const dialog = screen.getByRole('dialog', { name: 'Selected Agents Cannot Be Deleted' })
    expect(within(dialog).getByText(/one or more selected agents still have active listings/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Delete Selected' })).not.toBeInTheDocument()
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('creates an agent with a multipart image payload', async () => {
    const user = userEvent.setup()
    const photo = new File(['photo'], 'agent.png', { type: 'image/png' })
    const { queryClient } = renderPage()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(await screen.findByRole('button', { name: 'New Agent' }))
    await user.type(await screen.findByRole('textbox', { name: 'Full name' }), 'Sara Tesfaye')
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '+251 933 000 333')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'sara@example.com')
    await user.upload(screen.getByLabelText('Agent photo file'), photo)
    await user.click(screen.getByRole('button', { name: 'Save Agent' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    const [path, body] = vi.mocked(api.post).mock.calls[0]
    expect(path).toBe('/agents/')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('name')).toBe('Sara Tesfaye')
    expect((body as FormData).get('image')).toBe(photo)
    expect(await screen.findByRole('status')).toHaveTextContent('Agent created successfully.')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agents'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['property-form', 'agents'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['properties'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard', 'agents'] })
  })

  it('patches an existing agent from the edit dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Daniel Bekele' }))
    const nameInput = screen.getByRole('textbox', { name: 'Full name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'Daniel Bekele Jr')
    await user.click(screen.getByRole('button', { name: 'Save Agent' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    const [path, body] = vi.mocked(api.patch).mock.calls[0]
    expect(path).toBe('/agents/8/')
    expect((body as FormData).get('name')).toBe('Daniel Bekele Jr')
  })

  it('invalidates agent-dependent caches after deleting one agent', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderPage()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(await screen.findByRole('button', { name: 'Delete Daniel Bekele' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Agent' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Agent deleted successfully.')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agents'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['property-form', 'agents'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['properties'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard', 'agents'] })
  })

  it('reports exact partial bulk-delete results, refetches, and clears stale selection', async () => {
    const user = userEvent.setup()
    vi.mocked(api.delete)
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new Error('Delete failed'))
    const { queryClient } = renderPage()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await screen.findByText('Daniel Bekele')
    await user.click(screen.getByRole('checkbox', { name: 'Select Daniel Bekele' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Sara Tesfaye' }))
    await user.click(screen.getByRole('button', { name: 'Delete Selected' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Selected Agents' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete Selected' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('1 agent was deleted; 1 could not be deleted.')
    await waitFor(() => expect(fetchCollection).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Delete Selected Agents' })).not.toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['property-form', 'agents'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['properties'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard', 'agents'] })
  })
})
