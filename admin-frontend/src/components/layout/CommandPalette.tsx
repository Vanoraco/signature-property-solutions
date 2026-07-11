'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ADMIN_NAV } from '@/components/layout/Sidebar'

interface CommandItem {
  href: string
  label: string
  section: string
  icon: LucideIcon
}

const COMMAND_ITEMS: ReadonlyArray<CommandItem> = ADMIN_NAV.flatMap(item => {
  if (item.type === 'link') {
    return [{ href: item.href, label: item.label, section: 'Page', icon: item.icon }]
  }
  return item.items.map(child => ({
    href: child.href,
    label: child.label,
    section: 'Page',
    icon: item.icon,
  }))
})

interface CommandPaletteProps {
  onClose: () => void
}

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matches = normalized
      ? COMMAND_ITEMS.filter(item => (
        item.label.toLowerCase().includes(normalized)
        || item.href.toLowerCase().includes(normalized)
      ))
      : COMMAND_ITEMS
    return matches.slice(0, 6)
  }, [query])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const activeItem = document.getElementById(`command-item-${activeIndex}`)
    activeItem?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, query])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex(current => Math.min(current + 1, Math.max(results.length - 1, 0)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex(current => Math.max(current - 1, 0))
        return
      }
      if (event.key === 'Enter') {
        const item = results[activeIndex]
        if (!item) return
        event.preventDefault()
        onClose()
        router.push(item.href)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, onClose, results, router])

  const activate = (item: CommandItem) => {
    onClose()
    router.push(item.href)
  }

  return (
    <div
      className="overlay cmdk-overlay command-palette-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="cmdk-box command-palette" role="dialog" aria-modal="true" aria-label="Command search">
        <div className="cmdk-input-wrap">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search properties, agents, leads, pages..."
            autoComplete="off"
            aria-label="Search admin pages"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `command-item-${activeIndex}` : undefined}
          />
        </div>
        <div id="command-results" className="cmdk-results" role="listbox">
          {results.length ? (
            <>
              <div className="cmdk-group-label">Pages</div>
              {results.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    type="button"
                    id={`command-item-${index}`}
                    key={item.href}
                    className={`cmdk-item w-full border-0 bg-transparent text-left ${index === activeIndex ? 'active' : ''}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activate(item)}
                  >
                    <span className="cmdk-item-icon"><Icon size={15} /></span>
                    <span className="cmdk-item-copy">
                      <span className="cmdk-item-title block">{item.label}</span>
                      <span className="cmdk-item-sub block">{item.section}</span>
                    </span>
                  </button>
                )
              })}
            </>
          ) : (
            <div className="cmdk-empty">No matches. Try a different search.</div>
          )}
        </div>
        <div className="cmdk-foot" aria-hidden="true">
          <span>Up/Down navigate</span>
          <span>Enter select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  )
}
