'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Transaction, TransactionStatus, PaymentMethod } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Eye, Trash2 } from 'lucide-react'
import { useTableSelection } from '@/hooks/use-table-selection'
import { useUpdateStatus } from '@/hooks/use-update-status'
import { useBulkUpdateStatus } from '@/hooks/use-bulk-update-status'
import { useDeleteItem } from '@/hooks/use-delete-item'
import { useBulkDelete } from '@/hooks/use-bulk-delete'
import { useIsAdmin } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'

const STATUS_VARIANTS: Record<TransactionStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  en_cours: 'default',
  valide: 'success',
  expiree: 'secondary',
  annulee: 'destructive',
  en_attente: 'warning',
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validée',
  expiree: 'Expirée',
  annulee: 'Annulée',
  en_attente: 'En attente',
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MTN_MOBILE_MONEY: 'MTN Mobile Money',
  AIRTEL_MOBILE_MONEY: 'Airtel Mobile Money',
  PAY_ON_DELIVERY: 'Paiement à la livraison',
  PAY_ON_AGENCY: 'Paiement en agence',
}

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [dialogStatus, setDialogStatus] = useState<string>('')

  // Query for all transactions (for stats)
  const { data: allTransactions } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Query for filtered transactions (for table display)
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', statusFilter, methodFilter],
    queryFn: async (): Promise<Transaction[]> => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          souscription:souscriptions(
            *,
            client:clients(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter)
      }

      const { data } = await query
      return data || []
    },
  })

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
    data: transactions || [],
    getItemId: (item) => item.id,
  })

  // Mutations
  const updateStatusMutation = useUpdateStatus('transactions')
  const bulkUpdateMutation = useBulkUpdateStatus('transactions')
  const deleteMutation = useDeleteItem('transactions')
  const bulkDeleteMutation = useBulkDelete('transactions')

  // Permissions
  const { isAdmin, isAdminFin, isSuperAdmin } = useIsAdmin()

  // Pay transaction mutation
  const payTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'valide', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['all-transactions'] })
      toast({
        title: 'Paiement valide',
        description: 'La transaction a ete marquee comme payee',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de valider le paiement',
        variant: 'destructive',
      })
    },
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const totalAmount = allTransactions?.reduce((sum, t) => {
    if (t.status === 'valide' && t.amount) {
      return sum + t.amount
    }
    return sum
  }, 0) || 0

  const successCount = allTransactions?.filter(t => t.status === 'valide').length || 0
  const pendingCount = allTransactions?.filter(t => t.status === 'en_attente').length || 0
  const failedCount = allTransactions?.filter(t => t.status === 'annulee').length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Transactions</h1>
        <p className="subtitle">Suivez toutes vos transactions financières</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Encaissé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {successCount} transaction(s) réussie(s)
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Transaction(s) à traiter</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échouées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {failedCount}
            </div>
            <p className="text-xs text-muted-foreground">Transaction(s) échouée(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="valide">Validée</SelectItem>
                <SelectItem value="expiree">Expirée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Méthode de paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les méthodes</SelectItem>
                <SelectItem value="MTN_MOBILE_MONEY">MTN Mobile Money</SelectItem>
                <SelectItem value="AIRTEL_MOBILE_MONEY">Airtel Mobile Money</SelectItem>
                <SelectItem value="PAY_ON_DELIVERY">Paiement à la livraison</SelectItem>
                <SelectItem value="PAY_ON_AGENCY">Paiement en agence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="animate-fade-up">
        {/* Bulk Actions Toolbar */}
        {hasSelection && (
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {selectedIds.size} élément(s) sélectionné(s)
            </div>
            <div className="flex gap-2">
              {(isAdmin || isAdminFin) && (
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
                    <SelectItem value="expiree">Expirée</SelectItem>
                    <SelectItem value="annulee">Annulée</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {isSuperAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Supprimer ${selectedIds.size} transaction(s) ?`)) {
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
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode de Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
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
              ) : transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              ) : (
                transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected(transaction.id)}
                        onCheckedChange={() => toggleSelection(transaction.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.reference || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {transaction.souscription?.client
                        ? (transaction.souscription.client.username || transaction.souscription.client.fullname || 'N/A')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.amount ? formatCurrency(transaction.amount) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {transaction.payment_method && (
                        <Badge variant="outline">
                          {PAYMENT_METHOD_LABELS[transaction.payment_method as PaymentMethod]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.status && (
                        <Badge variant={STATUS_VARIANTS[transaction.status as TransactionStatus]}>
                          {STATUS_LABELS[transaction.status as TransactionStatus]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(transaction.created_at), 'dd MMM yyyy HH:mm', {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTransaction(transaction)
                            setDialogStatus(transaction.status || '')
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdminFin && transaction.status === 'en_attente' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Valider ce paiement ?')) {
                                payTransactionMutation.mutate(transaction.id)
                              }
                            }}
                            disabled={payTransactionMutation.isPending}
                          >
                            Payer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="font-bold">{formatCurrency(totalAmount)}</TableCell>
                <TableCell colSpan={4}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTransaction(null)
            setDialogStatus('')
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la Transaction</DialogTitle>
            <DialogDescription>
              Informations détaillées sur la transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Référence</p>
                  <p className="text-sm font-mono">
                    {selectedTransaction.reference || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client</p>
                  <p className="text-sm">
                    {selectedTransaction.souscription?.client
                      ? (selectedTransaction.souscription.client.username || selectedTransaction.souscription.client.fullname || 'N/A')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Montant</p>
                  <p className="text-sm font-medium">
                    {selectedTransaction.amount ? formatCurrency(selectedTransaction.amount) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Méthode de Paiement</p>
                  {selectedTransaction.payment_method && (
                    <Badge variant="outline">
                      {PAYMENT_METHOD_LABELS[selectedTransaction.payment_method as PaymentMethod]}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  {selectedTransaction.status && (
                    <Badge variant={STATUS_VARIANTS[selectedTransaction.status as TransactionStatus]}>
                      {STATUS_LABELS[selectedTransaction.status as TransactionStatus]}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm">
                    {format(new Date(selectedTransaction.created_at), 'dd MMM yyyy HH:mm', {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>

              {/* Actions Section */}
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label htmlFor="status-select">Changer le statut</Label>
                  <Select
                    value={dialogStatus}
                    onValueChange={setDialogStatus}
                    disabled={!(isAdmin || isAdminFin)}
                  >
                    <SelectTrigger id="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="valide">Validée</SelectItem>
                      <SelectItem value="expiree">Expirée</SelectItem>
                      <SelectItem value="annulee">Annulée</SelectItem>
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
                          if (confirm('Supprimer cette transaction ?')) {
                            deleteMutation.mutate(selectedTransaction.id)
                            setSelectedTransaction(null)
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
                        if (dialogStatus && dialogStatus !== selectedTransaction.status) {
                          updateStatusMutation.mutate({
                            id: selectedTransaction.id,
                            status: dialogStatus,
                          })
                          setSelectedTransaction(null)
                          setDialogStatus('')
                        }
                      }}
                      disabled={
                        !(isAdmin || isAdminFin) ||
                        !dialogStatus ||
                        dialogStatus === selectedTransaction.status
                      }
                    >
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTransaction(null)
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
