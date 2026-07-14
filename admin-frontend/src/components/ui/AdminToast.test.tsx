import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminToast from './AdminToast'

afterEach(() => {
  vi.useRealTimers()
})

describe('AdminToast', () => {
  it('renders semantic status and supports manual dismissal', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <AdminToast
        eventId={1}
        tone="success"
        message="Category updated successfully."
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Update complete')
    expect(screen.getByRole('status')).toHaveTextContent('Category updated successfully.')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    act(() => vi.advanceTimersByTime(180))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('uses an alert role and pauses automatic dismissal while hovered', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <AdminToast
        eventId={1}
        tone="danger"
        message="The record could not be deleted."
        onDismiss={onDismiss}
      />,
    )

    const toast = screen.getByRole('alert')
    fireEvent.mouseEnter(toast)
    act(() => vi.advanceTimersByTime(7000))
    expect(onDismiss).not.toHaveBeenCalled()

    fireEvent.mouseLeave(toast)
    act(() => vi.advanceTimersByTime(6000 + 180))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('restarts dismissal for repeated events and cancels the previous exit', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const { rerender } = render(
      <AdminToast
        eventId={1}
        tone="success"
        message="Form changes saved"
        onDismiss={onDismiss}
        durationMs={1000}
      />,
    )

    act(() => vi.advanceTimersByTime(1000))
    rerender(
      <AdminToast
        eventId={2}
        tone="success"
        message="Form changes saved"
        onDismiss={onDismiss}
        durationMs={1000}
      />,
    )
    act(() => vi.advanceTimersByTime(180))
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1000 + 180))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
