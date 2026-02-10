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
import { SouscriptionVoyage } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Plane, Search } from 'lucide-react'

export default function VoyagePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  type VoyageRow = SouscriptionVoyage & {
    code_agent?: string | null
    age?: number | null
    profil?: string | null
    region_de_voyage?: string | null
    duree_du_voyage?: string | null
    formule?: string | null
    moyen_de_payement?: string | null
    numero_de_telephone?: string | null
    date_de_validite?: string | null
    ville?: string | null
    adresse?: string | null
  }

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

  const { data: voyages, isLoading } = useQuery({
    queryKey: ['souscriptions-voyage', searchQuery, dateFrom, dateTo],
    queryFn: async (): Promise<VoyageRow[]> => {
      let query = supabase
        .from('souscription_voyage')
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
          s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.passport_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.numero_de_telephone?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      return filtered as VoyageRow[]
    },
  })

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(Number(value) || 0)
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
        <Plane className="h-8 w-8 text-primary" />
        <div>
          <h1 className="title-display">Assurance Voyage</h1>
          <p className="subtitle">Gerez les souscriptions NSIA Voyage</p>
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
                placeholder="Rechercher par nom, passeport ou telephone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateFromVoyage">Du</Label>
              <Input
                id="dateFromVoyage"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateToVoyage">Au</Label>
              <Input
                id="dateToVoyage"
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
                <TableHead>Mis à jour</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>N° passeport</TableHead>
                <TableHead>Nationalité</TableHead>
                <TableHead>Date de naissance</TableHead>
                <TableHead>Lieu de naissance</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Date d&apos;émission</TableHead>
                <TableHead>Date d&apos;expiration</TableHead>
                <TableHead>Lieu d&apos;émission</TableHead>
                <TableHead>Code pays</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Prime</TableHead>
                <TableHead>Couverture</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Code agent</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Région de voyage</TableHead>
                <TableHead>Durée du voyage</TableHead>
                <TableHead>Formule</TableHead>
                <TableHead>Moyen de paiement</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Date de validité</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Adresse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={28} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : voyages?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={28} className="text-center">
                    Aucune souscription voyage trouvee
                  </TableCell>
                </TableRow>
              ) : (
                voyages?.map((voyage) => (
                  <TableRow key={voyage.id}>
                    <TableCell>
                      {voyage.created_at
                        ? format(new Date(voyage.created_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {voyage.updated_at
                        ? format(new Date(voyage.updated_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{voyage.full_name || 'N/A'}</TableCell>
                    <TableCell className="font-mono">{voyage.passport_number || 'N/A'}</TableCell>
                    <TableCell>{voyage.nationality || 'N/A'}</TableCell>
                    <TableCell>{voyage.date_of_birth || 'N/A'}</TableCell>
                    <TableCell>{voyage.place_of_birth || 'N/A'}</TableCell>
                    <TableCell>{voyage.sex || 'N/A'}</TableCell>
                    <TableCell>{voyage.profession || 'N/A'}</TableCell>
                    <TableCell>{voyage.issue_date || 'N/A'}</TableCell>
                    <TableCell>{voyage.expiry_date || 'N/A'}</TableCell>
                    <TableCell>{voyage.place_of_issue || 'N/A'}</TableCell>
                    <TableCell>{voyage.country_code || 'N/A'}</TableCell>
                    <TableCell>{voyage.type || 'N/A'}</TableCell>
                    <TableCell>
                      {voyage.prime_ttc ? formatCurrency(voyage.prime_ttc) : 'N/A'}
                    </TableCell>
                    <TableCell>{voyage.coverage || 'N/A'}</TableCell>
                    <TableCell>
                      {voyage.documenturl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewUrl(voyage.documenturl || null)}
                        >
                          Ouvrir
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{voyage.code_agent || 'N/A'}</TableCell>
                    <TableCell>{voyage.age ?? 'N/A'}</TableCell>
                    <TableCell>{voyage.profil || 'N/A'}</TableCell>
                    <TableCell>{voyage.region_de_voyage || 'N/A'}</TableCell>
                    <TableCell>{voyage.duree_du_voyage || 'N/A'}</TableCell>
                    <TableCell>{voyage.formule || 'N/A'}</TableCell>
                    <TableCell>{voyage.moyen_de_payement || 'N/A'}</TableCell>
                    <TableCell>{voyage.numero_de_telephone || 'N/A'}</TableCell>
                    <TableCell>{voyage.date_de_validite || 'N/A'}</TableCell>
                    <TableCell>{voyage.ville || 'N/A'}</TableCell>
                    <TableCell>{voyage.adresse || 'N/A'}</TableCell>
                  </TableRow>
                ))
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
                  Telecharger
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
