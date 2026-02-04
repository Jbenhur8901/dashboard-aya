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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
 
import { SouscriptionAuto } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Search, Car, Download } from 'lucide-react'

export default function AutoPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: autos, isLoading } = useQuery({
    queryKey: ['souscriptions-auto', searchQuery],
    queryFn: async (): Promise<SouscriptionAuto[]> => {
      let query = supabase
        .from('souscription_auto')
        .select(`
          *,
          documenturl:"documentUrl"
        `)
        .order('created_at', { ascending: false })

      const { data } = await query

      let filtered = data || []

      if (searchQuery) {
        filtered = filtered.filter(s =>
          s.immatriculation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.phone?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      return filtered as SouscriptionAuto[]
    },
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleDownload = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Car className="h-8 w-8 text-primary" />
        <div>
          <h1 className="title-display">Assurance Auto</h1>
          <p className="subtitle">Gérez les souscriptions NSIA Auto</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client ou immatriculation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

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
      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>created_at</TableHead>
                <TableHead>fullname</TableHead>
                <TableHead>immatriculation</TableHead>
                <TableHead>power</TableHead>
                <TableHead>seat_number</TableHead>
                <TableHead>fuel_type</TableHead>
                <TableHead>brand</TableHead>
                <TableHead>chassis_number</TableHead>
                <TableHead>phone</TableHead>
                <TableHead>model</TableHead>
                <TableHead>address</TableHead>
                <TableHead>profession</TableHead>
                <TableHead>prime_ttc</TableHead>
                <TableHead>coverage</TableHead>
                <TableHead>documentUrl</TableHead>
                <TableHead>updated_at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={19} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : autos?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} className="text-center">
                    Aucune souscription auto trouvee
                  </TableCell>
                </TableRow>
              ) : (
                autos?.map((auto) => {
                  return (
                    <TableRow key={auto.id}>
                      <TableCell>
                        {auto.created_at
                          ? format(new Date(auto.created_at), 'dd MMM yyyy', { locale: fr })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{auto.fullname || 'N/A'}</TableCell>
                      <TableCell className="font-mono">{auto.immatriculation || 'N/A'}</TableCell>
                      <TableCell>{auto.power || 'N/A'}</TableCell>
                      <TableCell>{auto.seat_number ?? 'N/A'}</TableCell>
                      <TableCell>{auto.fuel_type || 'N/A'}</TableCell>
                      <TableCell>{auto.brand || 'N/A'}</TableCell>
                      <TableCell className="font-mono">{auto.chassis_number || 'N/A'}</TableCell>
                      <TableCell>{auto.phone || 'N/A'}</TableCell>
                      <TableCell>{auto.model || 'N/A'}</TableCell>
                      <TableCell>{auto.address || 'N/A'}</TableCell>
                      <TableCell>{auto.profession || 'N/A'}</TableCell>
                      <TableCell>
                        {auto.prime_ttc !== null && auto.prime_ttc !== undefined
                          ? formatCurrency(Number(auto.prime_ttc))
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{auto.coverage || 'N/A'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {auto.documenturl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewUrl(auto.documenturl || null)}
                          >
                            Ouvrir
                          </Button>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {auto.updated_at
                          ? format(new Date(auto.updated_at), 'dd MMM yyyy', { locale: fr })
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Document</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => handleDownload(previewUrl)}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </div>
              <div className="h-[70vh] w-full">
                <iframe
                  title="Document"
                  src={previewUrl}
                  className="h-full w-full rounded border"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
