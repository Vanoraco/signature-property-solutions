'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'lg'
}

export default function Modal({ open, onClose, title, description, children, footer, size = 'default' }: ModalProps) {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div
        className={`bg-card rounded-[14px] w-full ${size === 'lg' ? 'max-w-[840px]' : 'max-w-[640px]'} max-h-[88vh] flex flex-col shadow-lg animate-in`}
        style={{ animation: 'modalIn 0.18s cubic-bezier(0.2,0.8,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4.5 border-b border-border-soft flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            {description && <p className="text-[12px] text-text-faint mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-text-soft hover:bg-canvas">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border-soft flex justify-end gap-2.5">{footer}</div>
        )}
      </div>
      <style jsx>{`@keyframes modalIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}
