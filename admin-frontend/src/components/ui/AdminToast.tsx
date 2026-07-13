'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import styles from './AdminToast.module.css'

export type AdminToastTone = 'success' | 'danger'

export interface AdminToastFeedback {
  id: number
  message: string
  tone: AdminToastTone
}

interface AdminToastProps {
  eventId: number
  message: string
  tone: AdminToastTone
  onDismiss: () => void
  durationMs?: number
}

const EXIT_DURATION_MS = 180
let nextToastId = 0

export function createAdminToastFeedback(
  message: string,
  tone: AdminToastTone = 'success',
): AdminToastFeedback {
  nextToastId += 1
  return { id: nextToastId, message, tone }
}

type AdminToastInstanceProps = Omit<AdminToastProps, 'eventId'>

function AdminToastInstance({ message, tone, onDismiss, durationMs }: AdminToastInstanceProps) {
  const [paused, setPaused] = useState(false)
  const [closing, setClosing] = useState(false)
  const dismissRef = useRef(onDismiss)
  const closingRef = useRef(false)
  const exitTimerRef = useRef<number | null>(null)
  const timeout = durationMs ?? (tone === 'danger' ? 6000 : 3800)

  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  const requestDismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    exitTimerRef.current = window.setTimeout(() => dismissRef.current(), EXIT_DURATION_MS)
  }, [])

  useEffect(() => {
    if (paused || closing) return
    const timer = window.setTimeout(requestDismiss, timeout)
    return () => window.clearTimeout(timer)
  }, [closing, message, paused, requestDismiss, timeout, tone])

  useEffect(() => () => {
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current)
  }, [])

  const title = tone === 'success' ? 'Update complete' : 'Action required'

  return (
    <div className={styles.viewport}>
      <div
        role={tone === 'danger' ? 'alert' : 'status'}
        aria-atomic="true"
        className={styles.toast}
        data-tone={tone}
        data-closing={closing}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
        }}
      >
        <span className={styles.icon} aria-hidden="true">
          {tone === 'success' ? <Check size={16} strokeWidth={2.2} /> : <AlertTriangle size={16} strokeWidth={2} />}
        </span>
        <div className={styles.copy}>
          <div className={styles.title}>{title}</div>
          <div className={styles.message}>
            <span className="sr-only">{tone === 'success' ? 'Success: ' : 'Error: '}</span>
            {message}
          </div>
        </div>
        <button
          type="button"
          className={styles.dismiss}
          onClick={requestDismiss}
          aria-label="Dismiss notification"
          title="Dismiss notification"
        >
          <X aria-hidden="true" size={15} />
        </button>
      </div>
    </div>
  )
}

export default function AdminToast({ eventId, ...props }: AdminToastProps) {
  return <AdminToastInstance key={eventId} {...props} />
}
