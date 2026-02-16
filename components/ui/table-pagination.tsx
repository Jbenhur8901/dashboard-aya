import { Button } from '@/components/ui/button'

type TablePaginationProps = {
  currentPage: number
  totalPages: number
  startItem: number
  endItem: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function TablePagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPageChange,
}: TablePaginationProps) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {totalItems === 0
          ? 'Aucun résultat'
          : `${startItem}-${endItem} sur ${totalItems}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Précédent
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}
