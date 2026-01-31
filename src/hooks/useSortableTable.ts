import { useState } from 'react'

export function useSortableTable<T extends string>(initialColumn: T) {
  const [sortColumn, setSortColumn] = useState<T>(initialColumn)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: T) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  return { sortColumn, sortDirection, handleSort }
}
