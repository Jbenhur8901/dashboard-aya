'use client'

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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Document } from '@/types/database.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, Eye, FileText } from 'lucide-react'

export default function DocumentsPage() {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<Document[]> => {
      const { data } = await supabase
        .from('documents')
        .select(`
          *,
          souscription:souscriptions(
            *,
            client:clients(*)
          )
        `)
        .order('created_at', { ascending: false })

      return data || []
    },
  })

  const getFileIcon = (type: string | null) => {
    if (!type) return '📎'
    if (type.includes('pdf')) return '📄'
    if (type.includes('image')) return '🖼️'
    if (type.includes('word') || type.includes('document')) return '📝'
    return '📎'
  }

  const handleDownload = (url: string, nom: string | null) => {
    const link = document.createElement('a')
    link.href = url
    link.download = nom || 'document'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreview = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Documents</h1>
        <p className="subtitle">Gérez tous les documents liés aux souscriptions</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="animate-fade-up">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{documents?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documents PDF</p>
                <p className="text-2xl font-bold">
                  {documents?.filter((d) => d.type?.includes('pdf')).length || 0}
                </p>
              </div>
              <span className="text-3xl">📄</span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Images</p>
                <p className="text-2xl font-bold">
                  {documents?.filter((d) => d.type?.includes('image')).length || 0}
                </p>
              </div>
              <span className="text-3xl">🖼️</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Nom du Document</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type de Produit</TableHead>
                <TableHead>Date d&apos;Ajout</TableHead>
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
              ) : documents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Aucun document trouvé
                  </TableCell>
                </TableRow>
              ) : (
                documents?.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <span className="text-2xl">{getFileIcon(document.type)}</span>
                    </TableCell>
                    <TableCell className="font-medium">{document.nom}</TableCell>
                    <TableCell>
                      {document.souscription?.client
                        ? document.souscription.client.fullname
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {document.souscription ? (
                        <Badge variant="outline" className="capitalize">
                          {document.souscription.producttype}
                        </Badge>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {document.created_at
                        ? format(new Date(document.created_at), 'dd MMM yyyy HH:mm', {
                            locale: fr,
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(document.document_url)}
                          title="Prévisualiser"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(document.document_url, document.nom)}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
