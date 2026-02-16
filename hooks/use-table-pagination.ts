import { useEffect, useMemo, useState } from 'react'

const DEFAULT_PAGE_SIZE = 10

export function useTablePagination<T>(items: T[] | undefined, resetDeps: unknown[] = []) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = DEFAULT_PAGE_SIZE

  const totalItems = items?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, resetDeps)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return (items || []).slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems)

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    startItem,
    endItem,
    setCurrentPage,
  }
}
