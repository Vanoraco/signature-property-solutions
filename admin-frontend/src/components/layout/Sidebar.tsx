'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, FileText, Building2, Users, Megaphone, Inbox,
  Shield, Trophy, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown, LogOut,
  Tags, Star, Search, Circle
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

const NAV = [
  { type: 'section' as const, label: 'Overview' },
  { type: 'link' as const, href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'section' as const, label: 'Site content' },
  { type: 'group' as const, label: 'Content', icon: FileText, items: [
    { href: '/content/home', label: 'Home Page', icon: FileText },
    { href: '/content/about', label: 'About Page', icon: Circle },
    { href: '/content/contact', label: 'Contact Page', icon: Circle },
  ]},
  { type: 'group' as const, label: 'Properties', icon: Building2, items: [
    { href: '/properties', label: 'All Properties', icon: Building2 },
    { href: '/categories', label: 'Categories', icon: Tags },
    { href: '/facilities', label: 'Facilities', icon: Star },
    { href: '/agents', label: 'Agents', icon: Users },
  ]},
  { type: 'group' as const, label: 'Marketing', icon: Megaphone, items: [
    { href: '/services', label: 'Services', icon: Megaphone },
    { href: '/testimonials', label: 'Testimonials', icon: Star },
  ]},
  { type: 'section' as const, label: 'Operations' },
  { type: 'group' as const, label: 'Leads', icon: Inbox, items: [
    { href: '/requests', label: 'Property Requests', icon: Inbox },
    { href: '/search', label: 'Search Analytics', icon: Search },
  ]},
  { type: 'group' as const, label: 'Team & Access', icon: Shield, items: [
    { href: '/users', label: 'Users', icon: Users },
    { href: '/roles', label: 'Roles & Permissions', icon: Shield },
    { href: '/activity', label: 'Activity Log', icon: FileText },
  ]},
  { type: 'link' as const, href: '/leaderboard', label: 'Agent Leaderboard', icon: Trophy },
  { type: 'link' as const, href: '/media', label: 'Media Library', icon: ImageIcon },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Properties: true })
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-toggle"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <Link href="/" className="sidebar-brand sidebar-brand-logo-only" aria-label="Signature Property Solutions admin">
        <div className="brand-logo-wrap">
          <Image src="/headerlogo.png" alt="Signature Property Solutions" fill sizes="190px" className="brand-logo-img" priority />
        </div>
      </Link>

      <nav className="nav" aria-label="Admin navigation">
        {NAV.map((item) => {
          if (item.type === 'section') {
            return <div key={item.label} className="nav-group-title">{item.label}</div>
          }

          if (item.type === 'link') {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
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
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon"><Icon size={17} strokeWidth={1.9} /></span>
                <span className="nav-label">{item.label}</span>
                <ChevronDown size={14} className="nav-caret" />
              </button>
              <div className="nav-children">
                {item.items.map(child => {
                  const ChildIcon = child.icon
                  const active = isActive(pathname, child.href)
                  return (
                    <Link key={child.href} href={child.href} className={`nav-child ${active ? 'active' : ''}`}>
                      <span className="nav-child-dot" />
                      <span className="nav-child-icon"><ChildIcon size={13} strokeWidth={1.9} /></span>
                      <span className="nav-label">{child.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
        <div className="foot-text">
          <div className="foot-name">{user?.username || 'Admin'}</div>
          <div className="foot-role">Administrator</div>
        </div>
        <button type="button" onClick={logout} className="foot-logout" aria-label="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
