import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PropertyMediaFields from './PropertyMediaFields'

vi.mock('next/image', () => ({
  default: ({ fill, unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    void fill
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe('PropertyMediaFields', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:property-preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('shows an existing image and reports a replacement file', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PropertyMediaFields
        existing={{ main_image: '/media/products/current.jpg' }}
        files={{}}
        errors={{}}
        onChange={onChange}
      />,
    )

    expect(screen.getByAltText('Main image preview')).toHaveAttribute('src', '/media/products/current.jpg')
    const file = new File(['image'], 'replacement.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Main image file'), file)

    expect(onChange).toHaveBeenCalledWith('main_image', file)
    expect(screen.getByText('replacement.png')).toBeInTheDocument()
    expect(screen.getByAltText('Main image preview')).toHaveAttribute('src', 'blob:property-preview')
  })
})
