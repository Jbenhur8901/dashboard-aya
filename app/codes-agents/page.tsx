'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CodePromo, ReductionType } from '@/types/database.types'
import { format, isBefore } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useIsAdmin } from '@/hooks/use-user-profile'
import { useAuditLog, AUDIT_ACTIONS } from '@/hooks/use-audit-log'
import { exportToXlsx } from '@/lib/export-xlsx'
import { TablePagination } from '@/components/ui/table-pagination'
import { useTablePagination } from '@/hooks/use-table-pagination'

type CodePromoDbWrite = {
  code: string
  "Agent": string | null
  "Type_Reduction": string | null
  "Valeur": number | null
  "Expiration": string | null
}

export default function CodesAgentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<CodePromo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'inactif' | 'expire'>('all')
  const [formData, setFormData] = useState({
    code: '',
    agent: '',
    type_reduction: 'pourcentage' as ReductionType,
    valeur: '',
    date_expiration: '',
  })
  const [editFormData, setEditFormData] = useState({
    code: '',
    agent: '',
    type_reduction: 'pourcentage' as ReductionType,
    valeur: '',
    date_expiration: '',
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { log } = useAuditLog()
  const { isAdmin, isAdminFin, isSuperAdmin } = useIsAdmin()

  const { data: codesAgents, isLoading } = useQuery({
    queryKey: ['codes-agents'],
    queryFn: async (): Promise<CodePromo[]> => {
      const { data } = await supabase
        .from('code_promo')
        .select('id, created_at, updated_at, code, agent:"Agent", type_reduction:"Type_Reduction", valeur:"Valeur", expiration:"Expiration", actif')
        .order('created_at', { ascending: false })

      return data || []
    },
  })

  const createCodeMutation = useMutation({
    mutationFn: async (data: CodePromoDbWrite) => {
      const { error } = await supabase.from('code_promo').insert([data])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes-agents'] })
      log({
        action: AUDIT_ACTIONS.CODE_AGENT_CREATE,
        table_name: 'code_promo',
        new_values: {
          code: formData.code.toUpperCase(),
          agent: formData.agent,
          type_reduction: formData.type_reduction,
          valeur: formData.valeur,
          expiration: formData.date_expiration,
        },
      })
      toast({
        title: 'Code agent cree',
        description: 'Le code agent a ete cree avec succes',
      })
      setIsDialogOpen(false)
      setFormData({
        code: '',
        agent: '',
        type_reduction: 'pourcentage',
        valeur: '',
        date_expiration: '',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la creation',
        variant: 'destructive',
      })
    },
  })

  const updateCodeMutation = useMutation({
    mutationFn: async (data: { id: number; data: Partial<CodePromoDbWrite> }) => {
      const { id, data: updateData } = data
      const { error } = await supabase
        .from('code_promo')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes-agents'] })
      if (editingCode) {
        log({
          action: AUDIT_ACTIONS.CODE_AGENT_UPDATE,
          table_name: 'code_promo',
          record_id: String(editingCode.id),
          new_values: {
            code: editFormData.code.toUpperCase(),
            agent: editFormData.agent,
            type_reduction: editFormData.type_reduction,
            valeur: editFormData.valeur,
            expiration: editFormData.date_expiration,
          },
        })
      }
      toast({
        title: 'Code mis a jour',
        description: 'Le code agent a ete mis a jour avec succes',
      })
      setIsEditDialogOpen(false)
      setEditingCode(null)
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre a jour le code',
        variant: 'destructive',
      })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (data: { id: number; actif: boolean }) => {
      const { error } = await supabase
        .from('code_promo')
        .update({ actif: data.actif, updated_at: new Date().toISOString() })
        .eq('id', data.id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['codes-agents'] })
      log({
        action: AUDIT_ACTIONS.CODE_AGENT_UPDATE,
        table_name: 'code_promo',
        record_id: String(variables.id),
        new_values: { actif: variables.actif },
      })
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du code agent a été mis à jour',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      })
    },
  })

  const deleteCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('code_promo')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['codes-agents'] })
      log({
        action: AUDIT_ACTIONS.CODE_AGENT_DELETE,
        table_name: 'code_promo',
        record_id: String(id),
      })
      toast({
        title: 'Code supprimé',
        description: 'Le code agent a été supprimé',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le code',
        variant: 'destructive',
      })
    },
  })

  const handleDelete = (code: CodePromo) => {
    if (!isSuperAdmin) return
    const ok = window.confirm(`Supprimer le code ${code.code} ? Cette action est irreversible.`)
    if (!ok) return
    deleteCodeMutation.mutate(code.id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code || !formData.agent || !formData.valeur || !formData.date_expiration) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      })
      return
    }

    const valeur = parseFloat(formData.valeur)
    if (valeur <= 0) {
      toast({
        title: 'Valeur invalide',
        description: 'La valeur doit etre superieure a 0',
        variant: 'destructive',
      })
      return
    }

    createCodeMutation.mutate({
      code: formData.code.toUpperCase(),
      "Agent": formData.agent,
      "Type_Reduction": formData.type_reduction,
      "Valeur": valeur,
      "Expiration": formData.date_expiration,
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingCode) return

    if (!editFormData.code || !editFormData.agent || !editFormData.valeur || !editFormData.date_expiration) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      })
      return
    }

    const valeur = parseFloat(editFormData.valeur)
    if (valeur <= 0) {
      toast({
        title: 'Valeur invalide',
        description: 'La valeur doit etre superieure a 0',
        variant: 'destructive',
      })
      return
    }

    updateCodeMutation.mutate({
      id: editingCode.id,
      data: {
        code: editFormData.code.toUpperCase(),
        "Agent": editFormData.agent,
        "Type_Reduction": editFormData.type_reduction,
        "Valeur": valeur,
        "Expiration": editFormData.date_expiration,
      },
    })
  }

  const openEditDialog = (code: CodePromo) => {
    setEditingCode(code)
    setEditFormData({
      code: code.code || '',
      agent: code.agent || '',
      type_reduction: (code.type_reduction as ReductionType) || 'pourcentage',
      valeur: code.valeur?.toString() || '',
      date_expiration: code.expiration || '',
    })
    setIsEditDialogOpen(true)
  }

  const generateCode = () => {
    const code = `AGENT${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    setFormData({ ...formData, code })
  }

  const isExpired = (date: string) => isBefore(new Date(date), new Date())

  const filteredCodes = (codesAgents || []).filter((code) => {
    const matchesSearch =
      !searchQuery ||
      code.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.agent?.toLowerCase().includes(searchQuery.toLowerCase())

    const expired = code.expiration ? isExpired(code.expiration) : false
    const actif = code.actif !== false

    let matchesStatus = true
    if (statusFilter === 'actif') {
      matchesStatus = actif && !expired
    } else if (statusFilter === 'inactif') {
      matchesStatus = !actif
    } else if (statusFilter === 'expire') {
      matchesStatus = expired
    }

    return matchesSearch && matchesStatus
  })

  const {
    currentPage,
    totalPages,
    startItem,
    endItem,
    totalItems,
    paginatedItems: paginatedCodes,
    setCurrentPage,
  } = useTablePagination(filteredCodes, [searchQuery, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="title-display">Codes Agents</h1>
          <p className="subtitle">Gérez les codes de vos agents commerciaux</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportToXlsx({
                filename: 'codes-agents',
                sheetName: 'Codes Agents',
                columns: [
                  { header: 'Code', accessor: (row) => row.code || '—' },
                  { header: 'Agent', accessor: (row) => row.agent || '—' },
                  { header: 'Type de Reduction', accessor: (row) => row.type_reduction || '—' },
                  { header: 'Valeur', accessor: (row) => row.valeur ?? '—' },
                  {
                    header: 'Date d\'Expiration',
                    accessor: (row) =>
                      row.expiration
                        ? format(new Date(row.expiration), 'dd MMM yyyy', { locale: fr })
                        : '—',
                  },
                  {
                    header: 'Statut',
                    accessor: (row) => {
                      const expired = row.expiration ? isExpired(row.expiration) : false
                      const actif = row.actif !== false
                      if (!actif) return 'Inactif'
                      return expired ? 'Expiré' : 'Actif'
                    },
                  },
                  { header: 'Actif', accessor: (row) => (row.actif !== false ? 'Oui' : 'Non') },
                ],
                rows: filteredCodes,
              })
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!(isAdmin || isSuperAdmin)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Code
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Code Agent</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau code pour un agent
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="AGENT2024"
                    className="uppercase"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Générer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent">Agent</Label>
                <Input
                  id="agent"
                  value={formData.agent}
                  onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                  placeholder="Nom de l'agent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type de Reduction</Label>
                  <Select
                    value={formData.type_reduction}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type_reduction: value as ReductionType })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pourcentage">Pourcentage</SelectItem>
                      <SelectItem value="montant_fixe">Montant Fixe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valeur">
                    Valeur (decimal)
                  </Label>
                  <Input
                    id="valeur"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.valeur}
                    onChange={(e) => setFormData({ ...formData, valeur: e.target.value })}
                    placeholder="0.1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Date d&apos;Expiration</Label>
                <Input
                  id="expiration"
                  type="date"
                  value={formData.date_expiration}
                  onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createCodeMutation.isPending}>
                {createCodeMutation.isPending ? 'Creation...' : 'Creer le Code'}
              </Button>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Code Agent</DialogTitle>
            <DialogDescription>
              Modifiez les informations du code agent
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                placeholder="AGENT2024"
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-agent">Agent</Label>
              <Input
                id="edit-agent"
                value={editFormData.agent}
                onChange={(e) => setEditFormData({ ...editFormData, agent: e.target.value })}
                placeholder="Nom de l'agent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type de Reduction</Label>
                <Select
                  value={editFormData.type_reduction}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, type_reduction: value as ReductionType })
                  }
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pourcentage">Pourcentage</SelectItem>
                    <SelectItem value="montant_fixe">Montant Fixe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-valeur">
                  Valeur (decimal)
                </Label>
                <Input
                  id="edit-valeur"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.valeur}
                  onChange={(e) => setEditFormData({ ...editFormData, valeur: e.target.value })}
                  placeholder="0.1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-expiration">Date d&apos;Expiration</Label>
              <Input
                id="edit-expiration"
                type="date"
                value={editFormData.date_expiration}
                onChange={(e) => setEditFormData({ ...editFormData, date_expiration: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full" disabled={updateCodeMutation.isPending}>
              {updateCodeMutation.isPending ? 'Mise a jour...' : 'Mettre a jour'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card className="animate-fade-up">
        <CardContent className="py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Input
                placeholder="Rechercher par code ou agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actifs</SelectItem>
                <SelectItem value="inactif">Inactifs</SelectItem>
                <SelectItem value="expire">Expirés</SelectItem>
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
                <TableHead>Code</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Type de Reduction</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Date d&apos;Expiration</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Aucun code agent trouve
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCodes.map((code) => {
                  const expired = code.expiration ? isExpired(code.expiration) : false
                  const actif = code.actif !== false
                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-semibold">
                        {code.code || 'N/A'}
                      </TableCell>
                      <TableCell>{code.agent || 'N/A'}</TableCell>
                      <TableCell className="capitalize">
                        {code.type_reduction?.replace('_', ' ') || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {code.valeur !== null && code.valeur !== undefined ? code.valeur : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {code.expiration
                          ? format(new Date(code.expiration), 'dd MMM yyyy', {
                              locale: fr,
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="secondary">Expire</Badge>
                        ) : actif ? (
                          <Badge variant="default">Actif</Badge>
                        ) : (
                          <Badge variant="outline">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!(isAdmin || isAdminFin)}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: code.id,
                              actif: !actif,
                            })
                          }
                        >
                          {actif ? 'Désactiver' : 'Activer'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(code)}
                          disabled={!(isAdmin || isAdminFin)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(code)}
                          disabled={!isSuperAdmin}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
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
    </div>
  )
}
