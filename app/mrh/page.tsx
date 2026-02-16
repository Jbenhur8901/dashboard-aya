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
import { SouscriptionMrh } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Search } from 'lucide-react'
import { exportToXlsx } from '@/lib/export-xlsx'
import { TablePagination } from '@/components/ui/table-pagination'
import { useTablePagination } from '@/hooks/use-table-pagination'

export default function MrhPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  type MrhRow = SouscriptionMrh & {
    date_de_validite?: string | null
    code_agent?: string | null
    moyen_de_payement?: string | null
    adresse?: string | null
    contact?: string | null
    ville?: string | null
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

  const { data: mrhs, isLoading } = useQuery({
    queryKey: ['souscriptions-mrh', searchQuery, dateFrom, dateTo],
    queryFn: async (): Promise<MrhRow[]> => {
      let query = supabase
        .from('souscription_mrh')
        .select(`
          *,
          documenturl:"documentUrl",
          forfaitmrh:"forfaitMrh",
          typedocument:"typeDocument"
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
          s.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.ville?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      return filtered as MrhRow[]
    },
  })

  const {
    currentPage,
    totalPages,
    startItem,
    endItem,
    totalItems,
    paginatedItems: paginatedMrhs,
    setCurrentPage,
  } = useTablePagination(mrhs, [searchQuery, dateFrom, dateTo])

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
        <h1 className="title-display">Assurance MRH</h1>
        <p className="subtitle">Gerez les souscriptions NSIA MRH</p>
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
                placeholder="Rechercher par nom, contact ou ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateFromMrh">Du</Label>
              <Input
                id="dateFromMrh"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateToMrh">Au</Label>
              <Input
                id="dateToMrh"
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
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={() => {
            exportToXlsx({
              filename: 'souscriptions-mrh',
              sheetName: 'MRH',
              columns: [
                { header: 'Nom', accessor: (row: MrhRow) => row.fullname || 'N/A' },
                { header: 'Contact', accessor: (row: MrhRow) => row.contact || 'N/A' },
                { header: 'Ville', accessor: (row: MrhRow) => row.ville || 'N/A' },
                { header: 'Forfait', accessor: (row: MrhRow) => row.forfaitmrh || 'N/A' },
                {
                  header: 'Date',
                  accessor: (row: MrhRow) =>
                    row.created_at
                      ? format(new Date(row.created_at), 'dd MMM yyyy', { locale: fr })
                      : 'N/A',
                },
              ],
              rows: mrhs || [],
            })
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voir document</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Mis à jour</TableHead>
                <TableHead>Forfait MRH</TableHead>
                <TableHead>Type document</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Couverture</TableHead>
                <TableHead>Date de validité</TableHead>
                <TableHead>Code agent</TableHead>
                <TableHead>Moyen de paiement</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Ville</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : mrhs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center">
                    Aucune souscription MRH trouvee
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMrhs.map((mrh) => (
                  <TableRow key={mrh.id}>
                    <TableCell>
                      {mrh.documenturl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewUrl(mrh.documenturl || null)}
                        >
                          Ouvrir
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {mrh.created_at
                        ? format(new Date(mrh.created_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {mrh.updated_at
                        ? format(new Date(mrh.updated_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{mrh.forfaitmrh || 'N/A'}</TableCell>
                    <TableCell>{mrh.typedocument || 'N/A'}</TableCell>
                    <TableCell>{mrh.fullname || 'N/A'}</TableCell>
                    <TableCell>{mrh.coverage || 'N/A'}</TableCell>
                    <TableCell>{mrh.date_de_validite || 'N/A'}</TableCell>
                    <TableCell>{mrh.code_agent || 'N/A'}</TableCell>
                    <TableCell>{mrh.moyen_de_payement || 'N/A'}</TableCell>
                    <TableCell>{mrh.adresse || 'N/A'}</TableCell>
                    <TableCell>{mrh.contact || 'N/A'}</TableCell>
                    <TableCell>{mrh.ville || 'N/A'}</TableCell>
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
