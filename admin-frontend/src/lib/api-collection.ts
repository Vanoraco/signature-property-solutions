import api from '@/lib/api'

export interface PaginatedApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiCollection<T> {
  count: number
  results: T[]
}

function proxyPath(url: string) {
  try {
    const parsed = new URL(url, 'http://localhost')
    const apiIndex = parsed.pathname.indexOf('/api/')
    const pathname = apiIndex >= 0 ? parsed.pathname.slice(apiIndex + 4) : parsed.pathname
    return `${pathname.startsWith('/') ? pathname : `/${pathname}`}${parsed.search}`
  } catch {
    return url
  }
}

export async function fetchCollection<T>(path: string, signal?: AbortSignal): Promise<ApiCollection<T>> {
  const firstResponse = await api.get<PaginatedApiResponse<T> | T[]>(path, { signal })
  if (Array.isArray(firstResponse.data)) {
    return { count: firstResponse.data.length, results: firstResponse.data }
  }

  const results = [...firstResponse.data.results]
  const seenPages = new Set<string>()
  let next = firstResponse.data.next

  while (next) {
    const pagePath = proxyPath(next)
    if (seenPages.has(pagePath)) break
    seenPages.add(pagePath)

    const response = await api.get<PaginatedApiResponse<T> | T[]>(pagePath, { signal })
    if (Array.isArray(response.data)) {
      results.push(...response.data)
      break
    }
    results.push(...response.data.results)
    next = response.data.next
  }

  return { count: firstResponse.data.count, results }
}
