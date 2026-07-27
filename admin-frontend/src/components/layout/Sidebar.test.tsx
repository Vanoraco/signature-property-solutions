import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar'

const mocks = vi.hoisted(() => ({
  dataPrefetch: vi.fn(),
  apiGet: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/properties',
}))

vi.mock('next/link', () => ({
  default: ({ children, prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => (
    <a {...props} data-next-prefetch={String(prefetch)}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ fill, priority, unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean
    priority?: boolean
    unoptimized?: boolean
  }) => {
    void fill
    void priority
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

vi.mock('@/lib/admin-queries', () => ({
  prefetchAdminRouteData: mocks.dataPrefetch,
}))

vi.mock('@/lib/api', () => ({
  default: { get: mocks.apiGet },
}))

function renderSidebar(onNavigate = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <Sidebar
        collapsed={false}
        mobileOpen={false}
        onToggleCollapsed={vi.fn()}
        onNavigate={onNavigate}
      />
    </QueryClientProvider>,
  )
  return queryClient
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.apiGet.mockResolvedValue({ data: [] })
})

describe('Sidebar route data prefetch', () => {
  it('prefetches route data on hover, focus, and touch', () => {
    const queryClient = renderSidebar()

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Categories' }))
    fireEvent.focus(screen.getByRole('link', { name: 'Facilities' }))
    fireEvent.touchStart(screen.getByRole('link', { name: 'Agents' }))

    expect(mocks.dataPrefetch).toHaveBeenNthCalledWith(1, queryClient, '/categories')
    expect(mocks.dataPrefetch).toHaveBeenNthCalledWith(2, queryClient, '/facilities')
    expect(mocks.dataPrefetch).toHaveBeenNthCalledWith(3, queryClient, '/agents')
  })

  it('disables Next RSC prefetch and still navigates on click', () => {
    const onNavigate = vi.fn()
    renderSidebar(onNavigate)
    const categories = screen.getByRole('link', { name: 'Categories' })

    fireEvent.mouseEnter(categories)
    fireEvent.focus(categories)
    fireEvent.click(categories)

    expect(mocks.dataPrefetch).toHaveBeenCalledTimes(1)
    expect(categories).toHaveAttribute('data-next-prefetch', 'false')
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('keeps logout out of the sidebar', () => {
    renderSidebar()

    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('uses the uploaded site logo when available', async () => {
    mocks.apiGet.mockResolvedValue({
      data: [{ id: 1, image: null, logo: '/images/site-logo/custom.png', slogon: '', title: '', video: null }],
    })
    renderSidebar()

    await waitFor(() => {
      const images = document.querySelectorAll('.sidebar-brand img')
      expect(images).toHaveLength(2)
      expect(images[0]).toHaveAttribute('src', '/images/site-logo/custom.png')
      expect(images[1]).toHaveAttribute('src', '/images/site-logo/custom.png')
    })
  })
})
