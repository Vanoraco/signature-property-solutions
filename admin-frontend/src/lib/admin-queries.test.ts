import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/api'
import { fetchCollection, type ApiCollection } from '@/lib/api-collection'
import {
  adminQueryKeys,
  prefetchAdminRouteData,
  warmAdminQueryCache,
  type MediaAssetCollection,
} from '@/lib/admin-queries'

vi.mock('@/lib/api', () => ({ default: { get: vi.fn() } }))
vi.mock('@/lib/api-collection', () => ({ fetchCollection: vi.fn() }))

const collections: Record<string, ApiCollection<unknown>> = {
  '/properties/': { count: 1, results: [{ id: 1, property_title: 'Garden Villa' }] },
  '/categories/': { count: 1, results: [{ id: 2, catagorys: 'Villa' }] },
  '/facilities/': { count: 1, results: [{ id: 3, facilities_name: 'Garden' }] },
  '/agents/': { count: 1, results: [{ id: 4, name: 'Admin Agent' }] },
  '/requests/?ordering=-created_at': { count: 1, results: [{ id: 5, is_reviewed: false }] },
  '/testimonials/': { count: 1, results: [{ id: 6, is_published: true }] },
}

const media: MediaAssetCollection = {
  count: 1,
  results: [{
    path: 'products/villa.jpg',
    name: 'villa.jpg',
    url: '/images/products/villa.jpg',
    size: 2048,
    modified_at: '2026-07-14T12:00:00Z',
  }],
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchCollection).mockImplementation(async path => {
    const response = collections[path]
    if (!response) throw new Error(`Unexpected collection path: ${path}`)
    return response as never
  })
  vi.mocked(api.get).mockResolvedValue({ data: media })
})

describe('admin route query prefetch', () => {
  it('fills the property route and editor lookup caches with canonical keys', async () => {
    const queryClient = createQueryClient()

    await prefetchAdminRouteData(queryClient, '/properties?source=sidebar')

    expect(vi.mocked(fetchCollection).mock.calls.map(([path]) => path)).toEqual([
      '/properties/',
      '/categories/',
      '/facilities/',
      '/agents/',
    ])
    expect(queryClient.getQueryData(adminQueryKeys.properties)).toEqual(collections['/properties/'])
    expect(queryClient.getQueryData(adminQueryKeys.categories)).toEqual(collections['/categories/'])
    expect(queryClient.getQueryData(adminQueryKeys.facilities)).toEqual(collections['/facilities/'])
    expect(queryClient.getQueryData(adminQueryKeys.agents)).toEqual(collections['/agents/'])
  })

  it('reuses property and agent route data when the dashboard is prefetched', async () => {
    const queryClient = createQueryClient()
    await prefetchAdminRouteData(queryClient, '/properties')
    vi.mocked(fetchCollection).mockClear()

    await prefetchAdminRouteData(queryClient, '/')

    expect(vi.mocked(fetchCollection).mock.calls.map(([path]) => path)).toEqual([
      '/requests/?ordering=-created_at',
      '/testimonials/',
    ])
    expect(queryClient.getQueryData(adminQueryKeys.dashboardRequests)).toEqual(
      collections['/requests/?ordering=-created_at'],
    )
    expect(queryClient.getQueryData(adminQueryKeys.dashboardTestimonials)).toEqual(
      collections['/testimonials/'],
    )
    expect(queryClient.getQueryState(['dashboard', 'properties'])).toBeUndefined()
    expect(queryClient.getQueryState(['dashboard', 'agents'])).toBeUndefined()
  })

  it('warms every implemented sidebar data source after authentication', async () => {
    const queryClient = createQueryClient()

    await warmAdminQueryCache(queryClient)

    expect(queryClient.getQueryData(adminQueryKeys.properties)).toEqual(collections['/properties/'])
    expect(queryClient.getQueryData(adminQueryKeys.categories)).toEqual(collections['/categories/'])
    expect(queryClient.getQueryData(adminQueryKeys.facilities)).toEqual(collections['/facilities/'])
    expect(queryClient.getQueryData(adminQueryKeys.agents)).toEqual(collections['/agents/'])
    expect(queryClient.getQueryData(adminQueryKeys.dashboardRequests)).toEqual(
      collections['/requests/?ordering=-created_at'],
    )
    expect(queryClient.getQueryData(adminQueryKeys.dashboardTestimonials)).toEqual(
      collections['/testimonials/'],
    )
    expect(queryClient.getQueryData(adminQueryKeys.mediaAssets)).toEqual(media)
  })
})
