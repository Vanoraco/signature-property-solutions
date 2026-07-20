'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, FileText, Building2, Megaphone, Inbox,
  Shield, ImageIcon, ChevronLeft, ChevronRight, ChevronDown, LogOut
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { prefetchAdminRouteData } from '@/lib/admin-queries'

type AdminNavLink = {
  type: 'link'
  href: string
  label: string
  icon: LucideIcon
}

type AdminNavGroup = {
  type: 'group'
  label: string
  icon: LucideIcon
  items: ReadonlyArray<{ href: string; label: string }>
}

export type AdminNavItem = AdminNavLink | AdminNavGroup

export const ADMIN_NAV: ReadonlyArray<AdminNavItem> = [
  { type: 'link', href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'group', label: 'Content', icon: FileText, items: [
    { href: '/content/home', label: 'Home Page' },
    { href: '/content/about', label: 'About Page' },
    { href: '/content/contact', label: 'Contact Page' },
  ] },
  { type: 'group', label: 'Properties', icon: Building2, items: [
    { href: '/properties', label: 'All Properties' },
    { href: '/categories', label: 'Categories' },
    { href: '/facilities', label: 'Facilities' },
    { href: '/agents', label: 'Agents' },
  ] },
  { type: 'group', label: 'Marketing', icon: Megaphone, items: [
    { href: '/services', label: 'Services' },
    { href: '/testimonials', label: 'Testimonials' },
    { href: '/form-builder', label: 'Form Builder' },
  ] },
  { type: 'group', label: 'Leads', icon: Inbox, items: [
    { href: '/requests', label: 'Property Requests' },
    { href: '/search', label: 'Search Analytics' },
  ] },
  { type: 'group', label: 'Team & Access', icon: Shield, items: [
    { href: '/users', label: 'Users' },
    { href: '/roles', label: 'Roles & Permissions' },
    { href: '/activity', label: 'Activity Log' },
  ] },
  // { type: 'link', href: '/leaderboard', label: 'Agent Leaderboard', icon: Trophy },
  { type: 'link', href: '/media', label: 'Media Library', icon: ImageIcon },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapsed: () => void
  onNavigate: () => void
}

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapsed, onNavigate }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Properties: true })
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { logout } = useAuth()
  const visuallyCollapsed = collapsed && !mobileOpen

  const preloadRoute = useCallback((href: string) => {
    router.prefetch(href)
    void prefetchAdminRouteData(queryClient, href)
  }, [queryClient, router])

  const handleLogout = () => {
    onNavigate()
    logout()
  }

  return (
    <aside id="sidebar" className={`sidebar ${visuallyCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-controls="sidebar"
        aria-expanded={!collapsed}
        onClick={onToggleCollapsed}
        className="sidebar-toggle"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <Link
        href="/"
        onClick={onNavigate}
        onMouseEnter={() => preloadRoute('/')}
        onFocus={() => preloadRoute('/')}
        onTouchStart={() => preloadRoute('/')}
        className="sidebar-brand"
        aria-label="Signature Property Solutions admin"
      >
        <span className="sidebar-logo-full" aria-hidden="true">
          <Image src="/headerlogo.png" alt="" fill sizes="220px" className="sidebar-logo-image" priority />
        </span>
        <span className="sidebar-logo-compact" aria-hidden="true">
          <Image src="/favicon.png" alt="" fill sizes="42px" className="sidebar-favicon-image" priority />
        </span>
      </Link>

      <nav className="nav" aria-label="Admin navigation">
        {ADMIN_NAV.map((item) => {
          if (item.type === 'link') {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                onMouseEnter={() => preloadRoute(item.href)}
                onFocus={() => preloadRoute(item.href)}
                onTouchStart={() => preloadRoute(item.href)}
                className={`nav-link ${active ? 'active' : ''}`}
                title={visuallyCollapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <span className="nav-icon"><Icon size={17} strokeWidth={1.9} /></span>
                <span className="nav-label">{item.label}</span>
              </Link>
            )
          }

          const Icon = item.icon
          const open = openGroups[item.label]
          const groupActive = item.items.some((child) => isActive(pathname, child.href))
          return (
            <div key={item.label} className={`nav-group ${open ? 'open' : ''} ${groupActive ? 'active' : ''}`}>
              <button
                type="button"
                onClick={() => setOpenGroups(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                className="nav-group-head"
                title={visuallyCollapsed ? item.label : undefined}
                aria-expanded={open}
              >
                <span className="nav-icon"><Icon size={17} strokeWidth={1.9} /></span>
                <span className="nav-label">{item.label}</span>
                <ChevronDown size={14} className="nav-caret" />
              </button>
              <div className="nav-children">
                {item.items.map(child => {
                  const active = isActive(pathname, child.href)
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      onMouseEnter={() => preloadRoute(child.href)}
                      onFocus={() => preloadRoute(child.href)}
                      onTouchStart={() => preloadRoute(child.href)}
                      className={`nav-child ${active ? 'active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span className="nav-child-dot" />
                      <span className="nav-label">{child.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="nav-logout-wrap">
          <button
            type="button"
            onClick={handleLogout}
            className="nav-link sidebar-logout"
            aria-label="Log out"
            title={visuallyCollapsed ? 'Log out' : undefined}
          >
            <span className="nav-icon"><LogOut size={17} strokeWidth={1.9} /></span>
            <span className="nav-label">Log out</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}
