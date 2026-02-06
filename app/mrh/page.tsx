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
import { SouscriptionMrh } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Search } from 'lucide-react'

export default function MrhPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  type MrhRow = SouscriptionMrh & {
    date_de_validite?: string | null
    code_agent?: string | null
    moyen_de_payement?: string | null
    adresse?: string | null
    contact?: string | null
    ville?: string | null
  }

  const { data: mrhs, isLoading } = useQuery({
    queryKey: ['souscriptions-mrh', searchQuery],
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, contact ou ville..."
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
                <SelectItem value="valide">Validee</SelectItem>
                <SelectItem value="expirée">Expirée</SelectItem>
                <SelectItem value="annulée">Annulée</SelectItem>
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
                <TableHead>updated_at</TableHead>
                <TableHead>forfaitMrh</TableHead>
                <TableHead>typeDocument</TableHead>
                <TableHead>documentUrl</TableHead>
                <TableHead>fullname</TableHead>
                <TableHead>coverage</TableHead>
                <TableHead>date_de_validite</TableHead>
                <TableHead>code_agent</TableHead>
                <TableHead>moyen_de_payement</TableHead>
                <TableHead>adresse</TableHead>
                <TableHead>contact</TableHead>
                <TableHead>ville</TableHead>
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
                mrhs?.map((mrh) => (
                  <TableRow key={mrh.id}>
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
