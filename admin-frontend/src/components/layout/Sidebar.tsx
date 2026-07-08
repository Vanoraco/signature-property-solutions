'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Home, FileText, Phone, Building2, Tags, Compass,
  Users, Megaphone, Star, Inbox, Search, Shield, Trophy, Image,
  ChevronRight, ChevronLeft, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

const NAV = [
  { type: 'link' as const, href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'group' as const, label: 'Content', icon: FileText, items: [
    { href: '/content/home', label: 'Home Page' },
    { href: '/content/about', label: 'About Page' },
    { href: '/content/contact', label: 'Contact Page' },
  ]},
  { type: 'group' as const, label: 'Properties', icon: Building2, items: [
    { href: '/properties', label: 'All Properties' },
    { href: '/categories', label: 'Categories' },
    { href: '/facilities', label: 'Facilities' },
    { href: '/agents', label: 'Agents' },
  ]},
  { type: 'group' as const, label: 'Marketing', icon: Megaphone, items: [
    { href: '/services', label: 'Services' },
    { href: '/testimonials', label: 'Testimonials' },
  ]},
  { type: 'group' as const, label: 'Leads', icon: Inbox, items: [
    { href: '/requests', label: 'Property Requests' },
    { href: '/search', label: 'Search Analytics' },
  ]},
  { type: 'group' as const, label: 'Team & Access', icon: Shield, items: [
    { href: '/users', label: 'Users' },
    { href: '/roles', label: 'Roles & Permissions' },
    { href: '/activity', label: 'Activity Log' },
  ]},
  { type: 'link' as const, href: '/leaderboard', label: 'Agent Leaderboard', icon: Trophy },
  { type: 'link' as const, href: '/media', label: 'Media Library', icon: Image },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Properties: true })
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className={`${collapsed ? 'w-[76px]' : 'w-[264px]'} flex-shrink-0 bg-gradient-to-b from-ink to-ink-2 text-white flex flex-col transition-all duration-200 relative z-20`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-brass text-ink flex items-center justify-center z-50 border-2 border-ink shadow-sm"
      >
        {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>

      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 overflow-hidden whitespace-nowrap">
        <div className="w-[34px] h-[34px] flex-shrink-0 border border-brass rounded-lg flex items-center justify-center text-brass font-display font-bold italic text-lg bg-gradient-to-br from-brass/15 to-transparent relative">
          <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-brass" />
          S
        </div>
        {!collapsed && (
          <div>
            <div className="font-display font-semibold text-[18px] leading-tight">Signature</div>
            <div className="text-[9.5px] text-silver tracking-[2px] uppercase mt-0.5">Property Solutions</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((item) => {
          if (item.type === 'link') {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium mb-0.5 transition-all relative ${
                  active
                    ? 'bg-brass/15 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-brass rounded-sm" />}
                <Icon size={17} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          }

          const open = openGroups[item.label]
          const Icon = item.icon
          return (
            <div key={item.label} className="mb-0.5">
              <button
                onClick={() => toggleGroup(item.label)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all"
              >
                <Icon size={17} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && (
                  <ChevronDown size={14} className={`text-white/40 transition-transform ${open ? '' : '-rotate-90'}`} />
                )}
              </button>
              {!collapsed && (
                <div className={`overflow-hidden transition-all ${open ? 'max-h-[400px]' : 'max-h-0'}`}>
                  {item.items.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex items-center gap-2.5 pl-10 pr-3 py-2 rounded-lg text-[13.2px] relative ${
                        pathname === child.href
                          ? 'text-white bg-brass/15'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {pathname === child.href && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-brass rounded-sm" />}
                      <div className="w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="px-5 py-3.5 border-t border-white/10 flex items-center gap-2.5 overflow-hidden whitespace-nowrap">
        <div className="w-8 h-8 rounded-full bg-brass text-white flex items-center justify-center text-[13px] font-semibold flex-shrink-0">
          {user?.username?.[0]?.toUpperCase() || 'A'}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{user?.username || 'Admin'}</div>
            <div className="text-[11.5px] text-white/45">Administrator</div>
          </div>
        )}
        {!collapsed && (
          <button onClick={logout} className="text-white/40 hover:text-white transition-colors">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
