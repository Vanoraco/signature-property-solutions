'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Bell, Sun, Moon, RefreshCw, ChevronRight, Menu, Inbox } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'

const PAGE_TITLES: Record<string, [string, string]> = {
  '/': ['Overview', 'Dashboard'],
  '/properties': ['Properties', 'All Properties'],
  '/categories': ['Properties', 'Categories'],
  '/facilities': ['Properties', 'Facilities'],
  '/agents': ['Properties', 'Agents'],
  '/services': ['Marketing', 'Services'],
  '/testimonials': ['Marketing', 'Testimonials'],
  '/form-builder': ['Marketing', 'Form Builder'],
  '/requests': ['Leads', 'Property Requests'],
  '/search': ['Leads', 'Search Analytics'],
  '/users': ['Team & Access', 'Users'],
  '/roles': ['Team & Access', 'Roles & Permissions'],
  '/activity': ['Team & Access', 'Activity Log'],
  '/leaderboard': ['Performance', 'Agent Leaderboard'],
  '/media': ['Library', 'Media Library'],
  '/content/home': ['Content', 'Home Page'],
  '/content/about': ['Content', 'About Page'],
  '/content/contact': ['Content', 'Contact Page'],
}

const PAGE_ROUTES = Object.keys(PAGE_TITLES)
  .filter(route => route !== '/')
  .sort((a, b) => b.length - a.length)

interface AdminNotification {
  id: number
  title: string
  message: string
  time: string
  href: string
  read: boolean
}

const SEEDED_NOTIFICATIONS: ReadonlyArray<AdminNotification> = [
  {
    id: 1,
    title: 'New property request',
    message: 'Nathnael Solomon is looking for a Penthouse in Bole Atlas.',
    time: '12m ago',
    href: '/requests',
    read: false,
  },
  {
    id: 2,
    title: 'New property request',
    message: 'Sara Ahmed inquired about Office space in Bole.',
    time: '1h ago',
    href: '/requests',
    read: false,
  },
]

interface TopbarProps {
  onOpenMobileMenu: () => void
  onOpenCommandPalette: () => void
}

function getBreadcrumb(pathname: string): [string, string] {
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact
  const parent = PAGE_ROUTES.find(route => pathname.startsWith(`${route}/`))
  return parent ? PAGE_TITLES[parent] : ['', 'Dashboard']
}

function getInitials(value?: string) {
  if (!value) return 'A'
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean)
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A'
}

export default function Topbar({ onOpenMobileMenu, onOpenCommandPalette }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState<AdminNotification[]>(() =>
    SEEDED_NOTIFICATIONS.map(notification => ({ ...notification })),
  )
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [group, title] = getBreadcrumb(pathname)
  const unreadCount = notifications.filter(notification => !notification.read).length

  useEffect(() => {
    if (!notificationsOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [notificationsOpen])

  const markAllRead = () => {
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
  }

  const openNotification = (notification: AdminNotification) => {
    setNotifications(current => current.map(item => (
      item.id === notification.id ? { ...item, read: true } : item
    )))
    setNotificationsOpen(false)
    router.push(notification.href)
  }

  const refreshData = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries()
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <header className="topbar">
      <button type="button" className="icon-btn mobile-menu-btn" onClick={onOpenMobileMenu} aria-label="Open navigation menu">
        <Menu size={18} />
      </button>

      <div className="breadcrumb">
        <span>{group}</span>
        <ChevronRight size={12} />
        <b>{title}</b>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-search" onClick={onOpenCommandPalette} aria-label="Open command search">
          <Search size={15} />
          <span className="topbar-search-text">Search anything...</span>
          <kbd className="topbar-shortcut">⌘K</kbd>
        </button>

        <div className="notif-wrap">
          {notificationsOpen ? (
            <button type="button" className="click-catch border-0 p-0" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" />
          ) : null}
          <button
            type="button"
            className="icon-btn notification-btn"
            title="Notifications"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notificationsOpen}
            aria-controls="notification-panel"
            onClick={() => setNotificationsOpen(open => !open)}
          >
            <Bell size={17} />
            {unreadCount ? <span className="badge-count">{unreadCount}</span> : null}
          </button>

          {notificationsOpen ? (
            <div id="notification-panel" className="notif-panel notification-panel" role="dialog" aria-label="Notifications">
              <div className="notif-head">
                <h4>Notifications</h4>
                <button type="button" className="notif-mark-all border-0 bg-transparent" onClick={markAllRead} disabled={!unreadCount}>Mark all read</button>
              </div>
              {notifications.map(notification => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notif-item w-full border-0 text-left ${notification.read ? '' : 'unread'}`}
                  onClick={() => openNotification(notification)}
                >
                  {!notification.read ? <span className="notif-unread-dot" /> : null}
                  <span className="notif-icon"><Inbox size={14} /></span>
                  <span className="notif-copy flex min-w-0 flex-1 flex-col">
                    <span className="notif-title block">{notification.title}</span>
                    <span className="notif-msg block">{notification.message}</span>
                    <span className="notif-time block">{notification.time}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button type="button" onClick={toggleTheme} title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} className="icon-btn theme-toggle-btn">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button type="button" onClick={() => void refreshData()} disabled={refreshing} title="Refresh data" className="icon-btn refresh-btn" aria-busy={refreshing}>
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : undefined} />
        </button>

        <div className="avatar topbar-avatar" title={user?.email || user?.username || 'Account'} aria-label={user?.username || 'Account'}>
          {getInitials(user?.username)}
        </div>
      </div>
    </header>
  )
}
