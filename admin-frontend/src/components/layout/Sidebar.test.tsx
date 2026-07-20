import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar'

const mocks = vi.hoisted(() => ({
  dataPrefetch: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/properties',
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean
    priority?: boolean
  }) => {
    void fill
    void priority
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ logout: mocks.logout }),
}))

vi.mock('@/lib/admin-queries', () => ({
  prefetchAdminRouteData: mocks.dataPrefetch,
}))

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <Sidebar
        collapsed={false}
        mobileOpen={false}
        onToggleCollapsed={vi.fn()}
        onNavigate={vi.fn()}
      />
    </QueryClientProvider>,
  )
  return queryClient
}

beforeEach(() => {
  vi.clearAllMocks()
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
})
