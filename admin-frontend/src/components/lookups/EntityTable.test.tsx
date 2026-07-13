import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import EntityTable, { type EntityColumn } from './EntityTable'

interface RecordRow {
  id: number
  name: string
}

const columns: EntityColumn<RecordRow>[] = [
  { key: 'name', label: 'Name', sortVal: row => row.name },
  { key: 'actions', label: 'Actions', render: () => 'None' },
]

it('operates sortable column buttons from the keyboard and exposes sort direction', async () => {
  const user = userEvent.setup()
  render(
    <EntityTable
      columns={columns}
      data={[{ id: 1, name: 'Zulu' }, { id: 2, name: 'Alpha' }]}
      entityLabel="Records"
      searchPlaceholder="Search records..."
      searchText={row => row.name}
      storageKey="entity-table-accessibility-test"
      selectedIds={new Set()}
      onSelectionChange={vi.fn()}
      onRequestBulkDelete={vi.fn()}
    />,
  )

  const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
  const sortButton = within(nameHeader).getByRole('button', { name: 'Name' })
  const actionsHeader = screen.getByRole('columnheader', { name: 'Actions' })

  expect(nameHeader).toHaveAttribute('aria-sort', 'none')
  expect(actionsHeader).not.toHaveAttribute('aria-sort')
  expect(within(actionsHeader).queryByRole('button')).not.toBeInTheDocument()

  sortButton.focus()
  await user.keyboard('{Enter}')

  expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
  expect(within(screen.getAllByRole('row')[1]).getByText('Alpha')).toBeInTheDocument()

  await user.keyboard(' ')

  expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
  expect(within(screen.getAllByRole('row')[1]).getByText('Zulu')).toBeInTheDocument()
})
