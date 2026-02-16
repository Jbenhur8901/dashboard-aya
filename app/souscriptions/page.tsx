'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Souscription, ProductType, SouscriptionStatus } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BarChart3, Eye, Search, Trash2, TrendingUp, Download } from 'lucide-react'
import { useTableSelection } from '@/hooks/use-table-selection'
import { useUpdateStatus } from '@/hooks/use-update-status'
import { useBulkUpdateStatus } from '@/hooks/use-bulk-update-status'
import { useDeleteItem } from '@/hooks/use-delete-item'
import { useBulkDelete } from '@/hooks/use-bulk-delete'
import { useIsAdmin } from '@/hooks/use-user-profile'
import { exportToXlsx } from '@/lib/export-xlsx'
import { TablePagination } from '@/components/ui/table-pagination'
import { useTablePagination } from '@/hooks/use-table-pagination'

const PRODUCT_COLORS: Record<ProductType, string> = {
  'NSIA AUTO': '#10B981',
  'NSIA VOYAGE': '#3B82F6',
  'NSIA MULTIRISQUE HABITATION': '#8B5CF6',
  'NSIA INDIVIDUEL ACCIDENTS': '#F59E0B',
}

const PRODUCT_LABELS: Record<ProductType, string> = {
  'NSIA AUTO': 'Auto',
  'NSIA VOYAGE': 'Voyage',
  'NSIA MULTIRISQUE HABITATION': 'MRH',
  'NSIA INDIVIDUEL ACCIDENTS': 'IAC',
}

const STATUS_VARIANTS: Record<SouscriptionStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  en_cours: 'default',
  valide: 'success',
  expirée: 'secondary',
  annulée: 'destructive',
  en_attente: 'warning',
}

const STATUS_LABELS: Record<SouscriptionStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validée',
  expirée: 'Expirée',
  annulée: 'Annulée',
  en_attente: 'En attente',
}

export default function SouscriptionsPage() {
  const [productFilter, setProductFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [codePromoFilter, setCodePromoFilter] = useState<'all' | 'with' | 'without'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSouscription, setSelectedSouscription] = useState<Souscription | null>(null)
  const [dialogStatus, setDialogStatus] = useState<string>('')

  const { data: souscriptions, isLoading } = useQuery({
    queryKey: ['souscriptions', productFilter, statusFilter, codePromoFilter, searchQuery],
    queryFn: async (): Promise<Souscription[]> => {
      let query = supabase
        .from('souscriptions')
        .select(`
          *,
          client:clients(*)
        `)
        .order('created_at', { ascending: false })

      if (productFilter !== 'all') {
        query = query.eq('producttype', productFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query

      let filtered = data || []

      if (searchQuery) {
        filtered = filtered.filter(s =>
          s.client &&
          (s.client.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.client.fullname?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }

      if (codePromoFilter === 'with') {
        filtered = filtered.filter((s) => {
          const code = s.codepromo?.trim()
          return !!code
        })
      }

      if (codePromoFilter === 'without') {
        filtered = filtered.filter((s) => {
          const code = s.codepromo?.trim()
          return !code
        })
      }

      return filtered
    },
  })

  const { data: transactionsValidees } = useQuery({
    queryKey: ['transactions-validees-total'],
    queryFn: async (): Promise<{ amount: number | null }[]> => {
      const { data } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'valide')

      return data || []
    },
  })

  const {
    currentPage,
    totalPages,
    startItem,
    endItem,
    totalItems,
    paginatedItems: paginatedSouscriptions,
    setCurrentPage,
  } = useTablePagination(souscriptions, [productFilter, statusFilter, codePromoFilter, searchQuery])

  // Multi-select state and hooks
  const {
    selectedIds,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
    allSelected,
    someSelected,
    hasSelection,
  } = useTableSelection({
    data: paginatedSouscriptions,
    getItemId: (item) => item.id,
  })

  // Mutations
  const updateStatusMutation = useUpdateStatus('souscriptions')
  const bulkUpdateMutation = useBulkUpdateStatus('souscriptions')
  const deleteMutation = useDeleteItem('souscriptions')
  const bulkDeleteMutation = useBulkDelete('souscriptions')

  // Permissions
  const { isAdmin, isAdminFin, isSuperAdmin, isUser } = useIsAdmin()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const validatedSouscriptions = (souscriptions || []).filter((item) => item.status === 'valide')
  const totalSouscriptions = validatedSouscriptions.length
  const totalRevenue = (transactionsValidees || []).reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Souscriptions</h1>
        <p className="subtitle">Gérez toutes vos souscriptions d&apos;assurance</p>
      </div>

      {/* Summary Cards */}
      {!isUser && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="animate-fade-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Souscriptions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSouscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Souscriptions validées dans la vue actuelle
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d&apos;affaire</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Somme des transactions validées
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type de produit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                <SelectItem value="NSIA AUTO">Auto</SelectItem>
                <SelectItem value="NSIA VOYAGE">Voyage</SelectItem>
                <SelectItem value="NSIA MULTIRISQUE HABITATION">MRH</SelectItem>
                <SelectItem value="NSIA INDIVIDUEL ACCIDENTS">IAC</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="valide">Validée</SelectItem>
                <SelectItem value="expirée">Expirée</SelectItem>
                <SelectItem value="annulée">Annulée</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={codePromoFilter} onValueChange={(value) => setCodePromoFilter(value as 'all' | 'with' | 'without')}>
              <SelectTrigger>
                <SelectValue placeholder="Code promo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="with">Avec code</SelectItem>
                <SelectItem value="without">Sans code</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={() => {
            exportToXlsx({
              filename: 'souscriptions',
              sheetName: 'Souscriptions',
              columns: [
                {
                  header: 'Client',
                  accessor: (row) =>
                    row.client?.username || row.client?.fullname || 'N/A',
                },
                {
                  header: 'Type de Produit',
                  accessor: (row) =>
                    row.producttype ? PRODUCT_LABELS[row.producttype as ProductType] : 'N/A',
                },
                {
                  header: 'Code promo',
                  accessor: (row) => row.codepromo?.trim() || '—',
                },
                {
                  header: 'Prime TTC',
                  accessor: (row) => Number(row.prime_ttc) || 0,
                },
                {
                  header: 'Statut',
                  accessor: (row) =>
                    row.status ? STATUS_LABELS[row.status as SouscriptionStatus] : 'N/A',
                },
                {
                  header: 'Date de Création',
                  accessor: (row) =>
                    format(new Date(row.created_at), 'dd MMM yyyy', { locale: fr }),
                },
              ],
              rows: souscriptions || [],
            })
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Table */}
      <Card className="animate-fade-up">
        {/* Bulk Actions Toolbar */}
        {hasSelection && (
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {selectedIds.size} élément(s) sélectionné(s)
            </div>
            <div className="flex gap-2">
              {(isAdmin || isAdminFin || isUser) && (
                <Select
                  onValueChange={(status) => {
                    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status })
                    clearSelection()
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Changer le statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="valide">Validée</SelectItem>
                    <SelectItem value="expirée">Expirée</SelectItem>
                    <SelectItem value="annulée">Annulée</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {isSuperAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Supprimer ${selectedIds.size} souscription(s) ?`)) {
                      bulkDeleteMutation.mutate(Array.from(selectedIds))
                      clearSelection()
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Sélectionner tout"
                  />
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type de Produit</TableHead>
                <TableHead>Prime TTC</TableHead>
                <TableHead>Code promo</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de Création</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : souscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Aucune souscription trouvée
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSouscriptions.map((souscription) => (
                  <TableRow key={souscription.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected(souscription.id)}
                        onCheckedChange={() => toggleSelection(souscription.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {souscription.client
                        ? (souscription.client.username || souscription.client.fullname || 'N/A')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {souscription.producttype && (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${PRODUCT_COLORS[souscription.producttype as ProductType]}20`,
                            color: PRODUCT_COLORS[souscription.producttype as ProductType],
                          }}
                        >
                          {PRODUCT_LABELS[souscription.producttype as ProductType]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{souscription.prime_ttc ? formatCurrency(Number(souscription.prime_ttc)) : 'N/A'}</TableCell>
                    <TableCell>{souscription.codepromo?.trim() || '—'}</TableCell>
                    <TableCell>
                      {souscription.status && (
                        <Badge variant={STATUS_VARIANTS[souscription.status as SouscriptionStatus]}>
                          {STATUS_LABELS[souscription.status as SouscriptionStatus]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(souscription.created_at), 'dd MMM yyyy', {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSouscription(souscription)
                          setDialogStatus(souscription.status || '')
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedSouscription}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSouscription(null)
            setDialogStatus('')
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la Souscription</DialogTitle>
            <DialogDescription>
              Informations détaillées sur la souscription
            </DialogDescription>
          </DialogHeader>
          {selectedSouscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client</p>
                  <p className="text-sm">
                    {selectedSouscription.client
                      ? (selectedSouscription.client.username || selectedSouscription.client.fullname || 'N/A')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type de Produit</p>
                  <p className="text-sm">
                    {selectedSouscription.producttype
                      ? PRODUCT_LABELS[selectedSouscription.producttype as ProductType]
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prime TTC</p>
                  <p className="text-sm">
                    {selectedSouscription.prime_ttc
                      ? formatCurrency(Number(selectedSouscription.prime_ttc))
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  {selectedSouscription.status && (
                    <Badge variant={STATUS_VARIANTS[selectedSouscription.status as SouscriptionStatus]}>
                      {STATUS_LABELS[selectedSouscription.status as SouscriptionStatus]}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label htmlFor="status-select">Changer le statut</Label>
                  <Select
                    value={dialogStatus}
                    onValueChange={setDialogStatus}
                    disabled={!(isAdmin || isAdminFin || isUser)}
                  >
                    <SelectTrigger id="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="valide">Validée</SelectItem>
                      <SelectItem value="expirée">Expirée</SelectItem>
                      <SelectItem value="annulée">Annulée</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between gap-2">
                  <div>
                    {isSuperAdmin && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Supprimer cette souscription ?')) {
                            deleteMutation.mutate(selectedSouscription.id)
                            setSelectedSouscription(null)
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (dialogStatus && dialogStatus !== selectedSouscription.status) {
                          updateStatusMutation.mutate({
                            id: selectedSouscription.id,
                            status: dialogStatus,
                          })
                          setSelectedSouscription(null)
                          setDialogStatus('')
                        }
                      }}
                      disabled={
                        !(isAdmin || isAdminFin || isUser) ||
                        !dialogStatus ||
                        dialogStatus === selectedSouscription.status
                      }
                    >
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSouscription(null)
                        setDialogStatus('')
                      }}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
