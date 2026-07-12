import { describe, expect, it } from 'vitest'

describe('frontend test harness', () => {
  it('provides a browser-like document', () => {
    const element = document.createElement('div')
    element.textContent = 'Signature admin'
    expect(element).toHaveTextContent('Signature admin')
  })
})
