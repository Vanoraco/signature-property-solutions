'use client'
import { usePathname } from 'next/navigation'
import { Search, Bell, Sun, Moon, Menu } from 'lucide-react'
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

export default function Topbar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [group, title] = PAGE_TITLES[pathname] || ['', 'Dashboard']

  return (
    <header className="h-16 bg-card border-b border-border flex items-center gap-4 px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 text-[13px] text-text-faint">
        <span>{group}</span>
        <span className="text-[10px]">›</span>
        <span className="text-text-main font-semibold">{title}</span>
      </div>

      <div className="flex items-center gap-3.5 ml-auto">
        <div className="flex items-center gap-2 bg-canvas border border-border rounded-lg px-3 py-2 max-w-[420px] text-text-faint">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none flex-1 text-[13.5px] text-text-main placeholder:text-text-faint"
          />
        </div>

        <button onClick={toggleTheme} className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main transition-colors">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main transition-colors relative">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[9.5px] font-bold rounded-full flex items-center justify-center border border-card">3</span>
        </button>
      </div>
    </header>
  )
}
