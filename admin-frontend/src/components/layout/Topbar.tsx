'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Search, Bell, Sun, Moon, RefreshCw, ChevronRight, ChevronDown,
  Menu, Inbox, UserRound, LogOut,
} from 'lucide-react'
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
  '/profile': ['Account', 'Profile'],
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

type OpenPanel = 'notifications' | 'account' | null

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
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const notificationWrapRef = useRef<HTMLDivElement>(null)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const accountWrapRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const previousPathnameRef = useRef(pathname)
  const [notifications, setNotifications] = useState<AdminNotification[]>(() =>
    SEEDED_NOTIFICATIONS.map(notification => ({ ...notification })),
  )
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [group, title] = getBreadcrumb(pathname)
  const notificationsOpen = openPanel === 'notifications'
  const accountOpen = openPanel === 'account'
  const unreadCount = notifications.filter(notification => !notification.read).length

  useEffect(() => {
    if (!openPanel) return

    const closeOnPointerDown = (event: PointerEvent) => {
      const openWrapper = openPanel === 'notifications'
        ? notificationWrapRef.current
        : accountWrapRef.current

      if (openWrapper && !openWrapper.contains(event.target as Node)) {
        setOpenPanel(null)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenPanel(null)
      if (openPanel === 'notifications') notificationButtonRef.current?.focus()
      if (openPanel === 'account') accountButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [openPanel])

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname
    const closeFrame = window.requestAnimationFrame(() => setOpenPanel(null))
    return () => window.cancelAnimationFrame(closeFrame)
  }, [pathname])

  const markAllRead = () => {
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
  }

  const openNotification = (notification: AdminNotification) => {
    setNotifications(current => current.map(item => (
      item.id === notification.id ? { ...item, read: true } : item
    )))
    setOpenPanel(null)
    router.push(notification.href)
  }

  const openProfile = () => {
    setOpenPanel(null)
    router.push('/profile')
  }

  const handleLogout = () => {
    setOpenPanel(null)
    logout()
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

        <div className="notif-wrap" ref={notificationWrapRef}>
          <button
            ref={notificationButtonRef}
            type="button"
            className="icon-btn notification-btn"
            title="Notifications"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notificationsOpen}
            aria-controls="notification-panel"
            onClick={() => setOpenPanel(current => current === 'notifications' ? null : 'notifications')}
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

        <div className="account-wrap" ref={accountWrapRef}>
          <button
            ref={accountButtonRef}
            type="button"
            className="account-trigger"
            aria-label={`${accountOpen ? 'Close' : 'Open'} account menu for ${user?.username || 'account'}`}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls="account-menu"
            onClick={() => setOpenPanel(current => current === 'account' ? null : 'account')}
          >
            <span className="avatar topbar-avatar" aria-hidden="true">
              {getInitials(user?.username)}
            </span>
            <ChevronDown size={14} className="account-chevron" aria-hidden="true" />
          </button>

          {accountOpen ? (
            <div id="account-menu" className="account-menu" role="menu" aria-label="Account menu">
              <div className="account-identity">
                <span className="avatar account-menu-avatar" aria-hidden="true">
                  {getInitials(user?.username)}
                </span>
                <span className="account-identity-copy">
                  <strong>{user?.username || 'Administrator'}</strong>
                  <span>{user?.email || 'No email provided'}</span>
                </span>
              </div>
              <div className="account-menu-actions">
                <button type="button" className="account-menu-item" role="menuitem" onClick={openProfile}>
                  <UserRound size={16} aria-hidden="true" />
                  <span>Profile</span>
                </button>
                <button type="button" className="account-menu-item account-menu-item-danger" role="menuitem" onClick={handleLogout}>
                  <LogOut size={16} aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
