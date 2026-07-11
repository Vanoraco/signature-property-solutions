'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import CommandPalette from '@/components/layout/CommandPalette'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const isLogin = pathname === '/login'

  useEffect(() => {
    if (!isLogin && !loading && !user) router.replace('/login')
  }, [isLogin, loading, router, user])

  useEffect(() => {
    if (isLogin || !user) return
    const openCommandPalette = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', openCommandPalette)
    return () => window.removeEventListener('keydown', openCommandPalette)
  }, [isLogin, user])

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), [])

  if (isLogin) return children

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center" role="status" aria-label="Loading admin dashboard">
        <div className="w-8 h-8 border-3 border-border border-t-brass rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div id="app" className="admin-app">
      <button
        type="button"
        className={`mobile-overlay border-0 p-0 ${mobileOpen ? 'show' : ''}`}
        onClick={closeMobile}
        aria-label="Close navigation menu"
        tabIndex={mobileOpen ? 0 : -1}
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setSidebarCollapsed(collapsed => !collapsed)}
        onNavigate={closeMobile}
      />
      <div className="admin-main">
        <Topbar
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <main className="content">{children}</main>
      </div>
      {commandPaletteOpen ? <CommandPalette onClose={closeCommandPalette} /> : null}
    </div>
  )
}
