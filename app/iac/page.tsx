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
import { SouscriptionIac } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Search } from 'lucide-react'

export default function IacPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  type IacRow = SouscriptionIac & {
    code_agent?: string | null
    moyen_de_payement?: string | null
    ville?: string | null
    adresse?: string | null
    datedevalidite?: string | null
    effectiftotal?: number | null
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

  const { data: iacs, isLoading } = useQuery({
    queryKey: ['souscriptions-iac', searchQuery, dateFrom, dateTo],
    queryFn: async (): Promise<IacRow[]> => {
      let query = supabase
        .from('souscription_iac')
        .select(`
          *,
          documenturl:"documentUrl",
          typedocument:"typeDocument",
          statutpro:"statutPro",
          secteuractivite:"secteurActivite",
          lieutravail:"lieuTravail",
          datedevalidite:"dateDeValidite",
          effectiftotal:"EffectifTotal"
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
          s.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.code_agent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.ville?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      return filtered as IacRow[]
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
      <div>
        <h1 className="title-display">Assurance IAC</h1>
        <p className="subtitle">Gerez les souscriptions NSIA IAC</p>
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
                placeholder="Rechercher par nom, code agent ou ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateFromIac">Du</Label>
              <Input
                id="dateFromIac"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateToIac">Au</Label>
              <Input
                id="dateToIac"
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
                <TableHead>Prime</TableHead>
                <TableHead>Type document</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Couverture</TableHead>
                <TableHead>Statut pro</TableHead>
                <TableHead>Secteur d&apos;activité</TableHead>
                <TableHead>Lieu de travail</TableHead>
                <TableHead>Code agent</TableHead>
                <TableHead>Moyen de paiement</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Date de validité</TableHead>
                <TableHead>Effectif total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : iacs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center">
                    Aucune souscription IAC trouvee
                  </TableCell>
                </TableRow>
              ) : (
                iacs?.map((iac) => (
                  <TableRow key={iac.id}>
                    <TableCell>
                      {iac.created_at
                        ? format(new Date(iac.created_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {iac.updated_at
                        ? format(new Date(iac.updated_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {iac.prime_ttc ? formatCurrency(iac.prime_ttc) : 'N/A'}
                    </TableCell>
                    <TableCell>{iac.typedocument || 'N/A'}</TableCell>
                    <TableCell>
                      {iac.documenturl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewUrl(iac.documenturl || null)}
                        >
                          Ouvrir
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{iac.fullname || 'N/A'}</TableCell>
                    <TableCell>{iac.coverage || 'N/A'}</TableCell>
                    <TableCell>{iac.statutpro || 'N/A'}</TableCell>
                    <TableCell>{iac.secteuractivite || 'N/A'}</TableCell>
                    <TableCell>{iac.lieutravail || 'N/A'}</TableCell>
                    <TableCell>{iac.code_agent || 'N/A'}</TableCell>
                    <TableCell>{iac.moyen_de_payement || 'N/A'}</TableCell>
                    <TableCell>{iac.ville || 'N/A'}</TableCell>
                    <TableCell>{iac.adresse || 'N/A'}</TableCell>
                    <TableCell>{iac.datedevalidite || 'N/A'}</TableCell>
                    <TableCell>{iac.effectiftotal ?? 'N/A'}</TableCell>
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
