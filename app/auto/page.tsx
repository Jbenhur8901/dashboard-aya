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
import { Label } from '@/components/ui/label'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const toStartOfDayIso = (value: string) => {
    const d = new Date(value)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  const toEndOfDayIso = (value: string) => {
    const d = new Date(value)
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }

  const { data: autos, isLoading } = useQuery({
    queryKey: ['souscriptions-auto', searchQuery, dateFrom, dateTo],
    queryFn: async (): Promise<SouscriptionAuto[]> => {
      let query = supabase
        .from('souscription_auto')
        .select(`
          *,
          documenturl:"documentUrl"
        `)
        .order('created_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('created_at', toStartOfDayIso(dateFrom))
      }
      if (dateTo) {
        query = query.lte('created_at', toEndOfDayIso(dateTo))
      }

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
          <div className="grid gap-4 md:grid-cols-5 items-end">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client ou immatriculation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateFromAuto">Du</Label>
              <Input
                id="dateFromAuto"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateToAuto">Au</Label>
              <Input
                id="dateToAuto"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex md:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Créé le</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Puissance</TableHead>
                <TableHead>Places</TableHead>
                <TableHead>Carburant</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>N° châssis</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Prime</TableHead>
                <TableHead>Couverture</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Mis à jour</TableHead>
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
