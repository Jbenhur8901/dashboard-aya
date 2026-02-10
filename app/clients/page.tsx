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
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Client, Souscription } from '@/types/database.types'
import { Search, Eye, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', searchQuery],
    queryFn: async (): Promise<(Client & { souscription_count: number })[]> => {
      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      const { data } = await query

      let filtered = data || []

      if (searchQuery) {
        filtered = filtered.filter(
          (c) =>
            (c.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.whatsappnumber?.includes(searchQuery))
        )
      }

      // Fetch subscription count for each client
      const clientsWithCount = await Promise.all(
        filtered.map(async (client) => {
          const { count } = await supabase
            .from('souscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)

          return {
            ...client,
            souscription_count: count || 0,
          }
        })
      )

      return clientsWithCount
    },
  })

  const { data: clientSouscriptions, isLoading: souscriptionsLoading } = useQuery({
    queryKey: ['client-souscriptions', selectedClient?.id],
    queryFn: async (): Promise<Souscription[]> => {
      if (!selectedClient) return []

      const { data } = await supabase
        .from('souscriptions')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false })

      return data || []
    },
    enabled: !!selectedClient,
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
        <h1 className="title-display">Clients</h1>
        <p className="subtitle">Gérez votre portefeuille clients</p>
      </div>

      {/* Search */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou numéro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom Complet</TableHead>
                <TableHead>Téléphone WhatsApp</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Souscriptions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : clients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Aucun client trouvé
                  </TableCell>
                </TableRow>
              ) : (
                clients?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.username || client.fullname || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {client.whatsappnumber || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{client.profession || 'N/A'}</TableCell>
                    <TableCell>{client.city || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.status || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.souscription_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedClient(client)}
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

      {/* Client History Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Historique - {selectedClient?.fullname}
            </DialogTitle>
            <DialogDescription>
              Toutes les souscriptions de ce client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client Info */}
            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{selectedClient?.whatsappnumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profession</p>
                  <p className="font-medium">{selectedClient?.profession}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ville</p>
                  <p className="font-medium">{selectedClient?.city}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <Badge variant="outline">{selectedClient?.status}</Badge>
                </div>
              </div>
            </div>

            {/* Souscriptions History */}
            <div>
              <h4 className="mb-4 font-semibold">Souscriptions ({clientSouscriptions?.length || 0})</h4>
              {souscriptionsLoading ? (
                <p className="text-center text-sm text-muted-foreground">Chargement...</p>
              ) : clientSouscriptions?.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Aucune souscription</p>
              ) : (
                <div className="space-y-2">
                  {clientSouscriptions?.map((souscription) => (
                    <div
                      key={souscription.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium capitalize">{souscription.producttype}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(souscription.created_at), 'dd MMM yyyy', {
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(souscription.prime_ttc || 0)}</p>
                        <Badge
                          variant={
                            souscription.status === 'validee'
                              ? 'success'
                              : souscription.status === 'en_attente'
                              ? 'warning'
                              : 'default'
                          }
                          className="text-xs"
                        >
                          {souscription.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
