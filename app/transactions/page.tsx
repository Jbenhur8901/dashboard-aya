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
import { Transaction, TransactionStatus, PaymentMethod } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Suivez toutes vos transactions financières
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
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

        <Card>
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

        <Card>
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
      <Card>
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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode de Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              ) : (
                transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
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
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="font-bold">{formatCurrency(totalAmount)}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
