import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/api'
import MediaPickerDialog, { type MediaAsset } from './MediaLibrary'

vi.mock('@/lib/api', () => ({ default: { get: vi.fn() } }))
vi.mock('next/image', () => ({
  default: ({ fill, unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    void fill
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

const asset: MediaAsset = {
  path: 'products/villa.jpg',
  name: 'villa.jpg',
  url: 'http://localhost:8000/images/products/villa.jpg',
  size: 2048,
  modified_at: '2026-07-14T12:00:00Z',
}

describe('MediaPickerDialog', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('downloads the selected asset as a File and returns it to the form', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { count: 1, results: [asset] } })
      .mockResolvedValueOnce({ data: new Blob(['image-bytes'], { type: 'image/jpeg' }) })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MediaPickerDialog open onClose={onClose} onSelect={onSelect} />
      </QueryClientProvider>,
    )

    await user.click(await screen.findByRole('button', { name: /villa\.jpg/i }))
    await user.click(screen.getByRole('button', { name: 'Use Image' }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
    const [file, selectedAsset] = onSelect.mock.calls[0] as [File, MediaAsset]
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('villa.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(selectedAsset).toEqual(asset)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
