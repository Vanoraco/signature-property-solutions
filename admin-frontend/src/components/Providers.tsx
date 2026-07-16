'use client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import AdminShell from '@/components/layout/AdminShell'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Lookups (categories, facilities, agents), testimonials, dashboard
        // feeds, and property lists change rarely once warm, so hold them
        // fresh for 15 minutes instead of refetching on every page mount.
        staleTime: 15 * 60_000,
        gcTime: 30 * 60_000,
        retry: 1,
      },
    }
  }))
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AdminShell>{children}</AdminShell>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
