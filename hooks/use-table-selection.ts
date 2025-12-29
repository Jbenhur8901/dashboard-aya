import { useState } from 'react'

interface UseTableSelectionProps<T> {
  data: T[]
  getItemId: (item: T) => string
}

export function useTableSelection<T>({ data, getItemId }: UseTableSelectionProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === data.length && data.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(getItemId)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isSelected = (id: string) => selectedIds.has(id)

  const selectedItems = data.filter((item) => selectedIds.has(getItemId(item)))

  const allSelected = selectedIds.size === data.length && data.length > 0
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length
  const hasSelection = selectedIds.size > 0

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
    allSelected,
    someSelected,
    hasSelection,
  }
}
