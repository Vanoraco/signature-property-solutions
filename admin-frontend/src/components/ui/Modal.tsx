'use client'
import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'lg' | 'xl'
}

const modalWidths = {
  default: 'max-w-[640px]',
  lg: 'max-w-[840px]',
  xl: 'max-w-[960px]',
} as const

export default function Modal({ open, onClose, title, description, children, footer, size = 'default' }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center ${styles.overlay}`} onClick={onClose}>
      <div
        className={`bg-card rounded-[14px] w-full ${modalWidths[size]} max-h-[88vh] flex flex-col shadow-lg animate-in`}
        style={{ animation: 'modalIn 0.18s cubic-bezier(0.2,0.8,0.3,1)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className={`border-b border-border-soft flex items-center justify-between ${styles.header}`}>
          <div>
            <h3 id={titleId} className="font-display text-lg font-semibold text-ink">{title}</h3>
            {description && <p id={descriptionId} className="text-[12px] text-text-faint mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-text-soft hover:bg-canvas"
            aria-label="Close modal"
            title="Close"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <div className={`overflow-y-auto flex-1 ${styles.body}`}>{children}</div>
        {footer && (
          <div className={`border-t border-border-soft flex justify-end gap-2.5 ${styles.footer}`}>{footer}</div>
        )}
      </div>
      <style jsx>{`@keyframes modalIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}
