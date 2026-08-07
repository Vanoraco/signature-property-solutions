'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface StatusOption {
  value: string
  label: string
  className: string
}

interface StatusMenuProps {
  value: string
  options: readonly StatusOption[]
  onChange: (value: string) => void
  disabled?: boolean
  align?: 'left' | 'right'
}

const MENU_WIDTH = 188

export default function StatusMenu({
  value,
  options,
  onChange,
  disabled,
  align = 'left',
}: StatusMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)

  const meta = options.find(option => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (triggerRef.current && triggerRef.current.contains(event.target as Node)) return
      if (event.target instanceof Element && event.target.closest('[data-status-menu]')) return
      setOpen(false)
      setAnchor(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setAnchor(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggleMenu = () => {
    if (disabled) return
    if (open) {
      setOpen(false)
      setAnchor(null)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    let left = align === 'right' ? rect.right - MENU_WIDTH : rect.left
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))
    setAnchor({ top: rect.bottom + 8, left })
    setOpen(true)
  }

  const choose = (option: StatusOption) => {
    setOpen(false)
    setAnchor(null)
    if (option.value !== value) onChange(option.value)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${meta.label}, change it`}
        className="inline-flex items-center gap-1 rounded-[10px] border border-transparent px-1 py-0.5 transition hover:border-brass/25 hover:bg-brass-tint disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`chip ${meta.className}`}>{meta.label}</span>
        <ChevronDown
          aria-hidden="true"
          size={13}
          className={`shrink-0 text-text-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && anchor
        ? createPortal(
            <div
              data-status-menu
              role="listbox"
              aria-label="Available statuses"
              style={{ position: 'fixed', top: anchor.top, left: anchor.left, width: MENU_WIDTH }}
              className="z-50 rounded-[10px] border border-brass/25 bg-canvas p-1.5 shadow-[0_12px_34px_rgba(20,10,2,0.18)]"
              onMouseDown={event => event.stopPropagation()}
            >
              {options.map(option => {
                const active = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(option)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition ${
                      active
                        ? 'bg-brass-tint text-brass-dark'
                        : 'text-text hover:bg-brass-tint/60'
                    }`}
                  >
                    <span className={`chip ${option.className}`}>{option.label}</span>
                    {active ? (
                      <Check aria-hidden="true" size={14} className="shrink-0 text-brass-dark" />
                    ) : null}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}