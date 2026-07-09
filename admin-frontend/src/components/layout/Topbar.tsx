'use client'
import { usePathname } from 'next/navigation'
import { Search, Bell, Sun, Moon, RefreshCw, ChevronRight } from 'lucide-react'
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
        <ChevronRight size={12} />
        <b className="text-text-main font-semibold">{title}</b>
      </div>

      <div className="flex items-center gap-3.5 ml-auto">
        <div className="flex items-center gap-2 bg-canvas border border-border rounded-lg px-3 py-2 w-[420px] max-w-[36vw] text-text-faint cursor-pointer">
          <Search size={15} />
          <input type="text" placeholder="Search anything…" readOnly className="bg-transparent border-none outline-none flex-1 text-[13.5px] text-text-main placeholder:text-text-faint cursor-pointer" />
          <span className="text-[10.5px] text-text-faint border border-border rounded-[5px] px-1.5 py-px">⌘K</span>
        </div>

        <button onClick={toggleTheme} title="Toggle dark mode" className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main transition-colors">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button title="Refresh" className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main transition-colors">
          <RefreshCw size={17} />
        </button>

        <button className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-text-soft hover:bg-canvas hover:text-text-main transition-colors relative">
          <Bell size={17} />
          <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-danger text-white text-[9.5px] font-bold rounded-full flex items-center justify-center px-1 border border-card">3</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-brass text-white flex items-center justify-center text-[13px] font-semibold">JD</div>
      </div>
    </header>
  )
}
