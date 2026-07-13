import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import Modal from './Modal'

function ModalHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open editor</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit record"
        footer={<button type="button">Save record</button>}
      >
        <label>
          Record name
          <input type="text" />
        </label>
      </Modal>
    </>
  )
}

it('moves focus into the dialog, traps Tab, and restores the opener on close', async () => {
  const user = userEvent.setup()
  render(<ModalHarness />)

  const opener = screen.getByRole('button', { name: 'Open editor' })
  await user.click(opener)

  const dialog = screen.getByRole('dialog', { name: 'Edit record' })
  expect(dialog).toHaveFocus()

  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'Save record' })).toHaveFocus()

  await user.tab()
  expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: 'Edit record' })).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})
