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
import { Souscription, ProductType, SouscriptionStatus } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Eye, Search } from 'lucide-react'

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
  expiree: 'secondary',
  annulee: 'destructive',
  en_attente: 'warning',
}

const STATUS_LABELS: Record<SouscriptionStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validée',
  expiree: 'Expirée',
  annulee: 'Annulée',
  en_attente: 'En attente',
}

export default function SouscriptionsPage() {
  const [productFilter, setProductFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSouscription, setSelectedSouscription] = useState<Souscription | null>(null)

  const { data: souscriptions, isLoading } = useQuery({
    queryKey: ['souscriptions', productFilter, statusFilter, searchQuery],
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

      return filtered
    },
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Souscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Gérez toutes vos souscriptions d&apos;assurance
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
                <SelectItem value="expiree">Expirée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
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
                <TableHead>Client</TableHead>
                <TableHead>Type de Produit</TableHead>
                <TableHead>Prime TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de Création</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : souscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Aucune souscription trouvée
                  </TableCell>
                </TableRow>
              ) : (
                souscriptions?.map((souscription) => (
                  <TableRow key={souscription.id}>
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
                        onClick={() => setSelectedSouscription(souscription)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSouscription} onOpenChange={(open) => !open && setSelectedSouscription(null)}>
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

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
