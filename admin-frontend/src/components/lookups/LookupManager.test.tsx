import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/api'
import { fetchCollection } from '@/lib/api-collection'
import LookupManager from './LookupManager'
import type { CategoryRecord, FacilityRecord, LookupKind } from './types'

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

const categories: CategoryRecord[] = [
  { id: 4, catagorys: 'Apartment', slug: 'apartment', icon: null, property_count: 3 },
  { id: 5, catagorys: 'Warehouse', slug: 'warehouse', icon: null, property_count: 0 },
]

const facilities: FacilityRecord[] = [
  { id: 8, facilities_name: 'Backup Generator', slug: 'backup-generator', property_count: 2 },
]

function renderManager(kind: LookupKind) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LookupManager kind={kind} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCollection).mockImplementation(async path => {
    if (path.startsWith('/categories')) return { count: categories.length, results: categories }
    return { count: facilities.length, results: facilities }
  })
  vi.mocked(api.post).mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockResolvedValue({ data: {} })
  vi.mocked(api.delete).mockResolvedValue({ data: {} })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:category-icon') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})

describe('LookupManager', () => {
  it('uses the lookup name as the page heading', async () => {
    renderManager('categories')

    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument()
  })

  it('blocks deletion when a category still owns properties', async () => {
    const user = userEvent.setup()
    renderManager('categories')

    await user.click(await screen.findByRole('button', { name: 'Delete Apartment' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Apartment cannot be deleted while 3 properties use it.')
    expect(screen.queryByRole('dialog', { name: 'Delete Category?' })).not.toBeInTheDocument()
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('creates a category with its multipart icon payload', async () => {
    const user = userEvent.setup()
    const icon = new File(['icon'], 'penthouse.png', { type: 'image/png' })
    renderManager('categories')

    await user.click(await screen.findByRole('button', { name: 'New Category' }))
    await user.type(await screen.findByRole('textbox', { name: /Category Name/i }), 'Penthouse')
    await user.upload(screen.getByLabelText('Category icon file'), icon)
    await user.click(screen.getByRole('button', { name: 'Save Category' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    const [path, body] = vi.mocked(api.post).mock.calls[0]
    expect(path).toBe('/categories/')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('catagorys')).toBe('Penthouse')
    expect((body as FormData).get('slug')).toBe('penthouse')
    expect((body as FormData).get('icon')).toBe(icon)
    expect(await screen.findByRole('status')).toHaveTextContent('Category created successfully.')
  })

  it('allows deleting a facility without deleting its properties', async () => {
    const user = userEvent.setup()
    renderManager('facilities')

    await user.click(await screen.findByRole('button', { name: 'Delete Backup Generator' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Facility?' })
    expect(within(dialog).getByText(/Backup Generator.*permanently removed/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/facilities/8/'))
    expect(await screen.findByRole('status')).toHaveTextContent('Facility deleted successfully.')
  })

  it('blocks bulk deletion when the category selection includes a referenced record', async () => {
    const user = userEvent.setup()
    renderManager('categories')

    await screen.findByText('Apartment')
    await user.click(screen.getByRole('checkbox', { name: 'Select Apartment' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Warehouse' }))
    await user.click(screen.getByRole('button', { name: 'Delete Selected' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Apartment is still used by properties.')
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('reports partial bulk deletion and refreshes stale rows', async () => {
    const user = userEvent.setup()
    const bulkFacilities: FacilityRecord[] = [
      facilities[0],
      { id: 9, facilities_name: 'Roof Deck', slug: 'roof-deck', property_count: 0 },
    ]
    vi.mocked(fetchCollection).mockResolvedValue({ count: bulkFacilities.length, results: bulkFacilities })
    vi.mocked(api.delete)
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce({ response: { data: { detail: 'Roof Deck is locked.' } } })
    renderManager('facilities')

    await user.click(await screen.findByRole('checkbox', { name: 'Select Backup Generator' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Roof Deck' }))
    await user.click(screen.getByRole('button', { name: 'Delete Selected' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete 2 Facilities?' })).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('1 of 2 records deleted. 1 failed. Roof Deck is locked.')
    await waitFor(() => expect(fetchCollection).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
  })
})
