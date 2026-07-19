import { queryOptions, type QueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { fetchCollection } from '@/lib/api-collection'
import type { AgentRecord } from '@/components/agents/types'
import type { PropertyRequest, Testimonial, ServiceRecord } from '@/components/dashboard/types'
import type { UserRecord, GroupRecord } from '@/components/users/types'
import type {
  CategoryRecord,
  FacilityRecord,
  LookupKind,
} from '@/components/lookups/types'
import type { PropertyRecord } from '@/components/properties/types'

export interface MediaAsset {
  path: string
  name: string
  url: string
  size: number
  modified_at: string
  /** 'image' or 'video'. Older responses may omit this; treat as 'image'. */
  kind?: string
}

export interface MediaAssetCollection {
  count: number
  results: MediaAsset[]
}

type LookupRecordByKind = {
  categories: CategoryRecord
  facilities: FacilityRecord
}

export const adminQueryKeys = {
  properties: ['properties'] as const,
  categories: ['categories'] as const,
  facilities: ['facilities'] as const,
  agents: ['agents'] as const,
  testimonials: ['testimonials'] as const,
  services: ['services'] as const,
  propertyRequests: ['property-requests'] as const,
  users: ['users'] as const,
  groups: ['groups'] as const,
  mediaAssets: ['media-assets'] as const,
  mediaAssetsVideo: ['media-assets', 'video'] as const,
  dashboardRequests: ['dashboard', 'requests'] as const,
  dashboardTestimonials: ['dashboard', 'testimonials'] as const,
}

export const propertiesQueryOptions = queryOptions({
  queryKey: adminQueryKeys.properties,
  queryFn: ({ signal }) => fetchCollection<PropertyRecord>('/properties/', signal),
})

export const agentsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.agents,
  queryFn: ({ signal }) => fetchCollection<AgentRecord>('/agents/', signal),
})

export function lookupQueryOptions<Kind extends LookupKind>(kind: Kind) {
  return queryOptions({
    queryKey: adminQueryKeys[kind],
    queryFn: ({ signal }) => fetchCollection<LookupRecordByKind[Kind]>(`/${kind}/`, signal),
  })
}

export const dashboardRequestsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.dashboardRequests,
  queryFn: ({ signal }) => fetchCollection<PropertyRequest>('/requests/?ordering=-created_at', signal),
})

export const testimonialsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.testimonials,
  queryFn: ({ signal }) => fetchCollection<Testimonial>('/testimonials/', signal),
})

export const servicesQueryOptions = queryOptions({
  queryKey: adminQueryKeys.services,
  queryFn: ({ signal }) => fetchCollection<ServiceRecord>('/services/', signal),
})

export const propertyRequestsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.propertyRequests,
  queryFn: ({ signal }) => fetchCollection<PropertyRequest>('/requests/?ordering=-created_at', signal),
})

export const usersQueryOptions = queryOptions({
  queryKey: adminQueryKeys.users,
  queryFn: ({ signal }) => fetchCollection<UserRecord>('/users/', signal),
})

export const groupsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.groups,
  queryFn: ({ signal }) => fetchCollection<GroupRecord>('/groups/', signal),
})

export const dashboardTestimonialsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.dashboardTestimonials,
  queryFn: ({ signal }) => fetchCollection<Testimonial>('/testimonials/', signal),
})

export const mediaAssetsQueryOptions = queryOptions({
  queryKey: adminQueryKeys.mediaAssets,
  queryFn: async ({ signal }) => {
    const response = await api.get<MediaAssetCollection>('/media-assets/', { signal })
    return response.data
  },
  staleTime: 60_000,
})

export const mediaAssetsVideoQueryOptions = queryOptions({
  queryKey: adminQueryKeys.mediaAssetsVideo,
  queryFn: async ({ signal }) => {
    const response = await api.get<MediaAssetCollection>('/media-assets/', {
      params: { kind: 'video' },
      signal,
    })
    return response.data
  },
  staleTime: 60_000,
})

export const ADMIN_PREFETCH_ROUTES = [
  '/',
  '/properties',
  '/categories',
  '/facilities',
  '/agents',
  '/media',
] as const

function routePath(href: string) {
  try {
    const pathname = new URL(href, 'http://admin.local').pathname
    return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  } catch {
    return href
  }
}

function prefetchDashboardQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.prefetchQuery(propertiesQueryOptions),
    queryClient.prefetchQuery(agentsQueryOptions),
    queryClient.prefetchQuery(dashboardRequestsQueryOptions),
    queryClient.prefetchQuery(dashboardTestimonialsQueryOptions),
  ])
}

function prefetchPropertyQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.prefetchQuery(propertiesQueryOptions),
    queryClient.prefetchQuery(lookupQueryOptions('categories')),
    queryClient.prefetchQuery(lookupQueryOptions('facilities')),
    queryClient.prefetchQuery(agentsQueryOptions),
  ])
}

export async function prefetchAdminRouteData(queryClient: QueryClient, href: string) {
  switch (routePath(href)) {
    case '/':
      await prefetchDashboardQueries(queryClient)
      break
    case '/properties':
      await prefetchPropertyQueries(queryClient)
      break
    case '/categories':
      await queryClient.prefetchQuery(lookupQueryOptions('categories'))
      break
    case '/facilities':
      await queryClient.prefetchQuery(lookupQueryOptions('facilities'))
      break
    case '/agents':
      await queryClient.prefetchQuery(agentsQueryOptions)
      break
    case '/media':
      await queryClient.prefetchQuery(mediaAssetsQueryOptions)
      break
  }
}

export async function warmAdminQueryCache(queryClient: QueryClient) {
  await Promise.allSettled([
    prefetchDashboardQueries(queryClient),
    queryClient.prefetchQuery(lookupQueryOptions('categories')),
    queryClient.prefetchQuery(lookupQueryOptions('facilities')),
    queryClient.prefetchQuery(mediaAssetsQueryOptions),
  ])
}
