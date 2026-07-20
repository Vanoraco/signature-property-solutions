import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './page'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      username: 'achi.admin',
      email: 'admin@signaturepropertysolutions.com',
      is_staff: true,
      is_superuser: true,
    },
    logout: mocks.logout,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfilePage', () => {
  it('renders account details and logs out from the profile surface', () => {
    render(<ProfilePage />)

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getAllByText('achi.admin')).not.toHaveLength(0)
    expect(screen.getAllByText('Super administrator')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(mocks.logout).toHaveBeenCalledTimes(1)
  })
})
