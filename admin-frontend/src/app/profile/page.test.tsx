import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProfilePage from './page'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      username: 'achi.admin',
      email: 'admin@signaturepropertysolutions.com',
      is_staff: true,
      is_superuser: true,
    },
  }),
}))

describe('ProfilePage', () => {
  it('renders the themed account dossier without a duplicate logout action', () => {
    render(<ProfilePage />)

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getAllByText('achi.admin')).not.toHaveLength(0)
    expect(screen.getAllByText('Super administrator')).not.toHaveLength(0)
    expect(screen.getByText('Protected admin workspace')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })
})
