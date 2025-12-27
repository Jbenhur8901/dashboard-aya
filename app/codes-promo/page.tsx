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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function CodesPromoPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    agent: '',
    type_reduction: 'pourcentage' as ReductionType,
    valeur: '',
    date_expiration: '',
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: codesPromo, isLoading } = useQuery({
    queryKey: ['codes-promo'],
    queryFn: async (): Promise<CodePromo[]> => {
      const { data } = await supabase
        .from('code_promo')
        .select('*')
        .order('created_at', { ascending: false })

      return data || []
    },
  })

  const createCodeMutation = useMutation({
    mutationFn: async (data: Omit<CodePromo, 'id' | 'created_at'>) => {
      const { error} = await supabase.from('code_promo').insert([data])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes-promo'] })
      toast({
        title: 'Code promo créé',
        description: 'Le code promo a été créé avec succès',
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
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création',
        variant: 'destructive',
      })
    },
  })

  const toggleCodeMutation = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase
        .from('codes_promo')
        .update({ actif })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes-promo'] })
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du code promo a été mis à jour',
      })
    },
  })

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
        description: 'La valeur doit être supérieure à 0',
        variant: 'destructive',
      })
      return
    }

    createCodeMutation.mutate({
      code: formData.code.toUpperCase(),
      Agent: formData.agent,
      Type_Reduction: formData.type_reduction,
      Valeur: valeur,
      Expiration: formData.date_expiration,
      Agent_ID: null,
    } as any)
  }

  const generateCode = () => {
    const code = `PROMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    setFormData({ ...formData, code })
  }

  const isExpired = (date: string) => isBefore(new Date(date), new Date())

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Codes Promo</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos codes promotionnels
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Code Promo</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau code promotionnel
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
                    placeholder="PROMO2024"
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
                  <Label htmlFor="type">Type de Réduction</Label>
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
                    Valeur (décimal)
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
                {createCodeMutation.isPending ? 'Création...' : 'Créer le Code'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Type de Réduction</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Date d&apos;Expiration</TableHead>
                <TableHead>Statut</TableHead>
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
              ) : codesPromo?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Aucun code promo trouvé
                  </TableCell>
                </TableRow>
              ) : (
                codesPromo?.map((code) => {
                  const expired = code.Expiration ? isExpired(code.Expiration) : false
                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-semibold">
                        {code.code || 'N/A'}
                      </TableCell>
                      <TableCell>{code.Agent || 'N/A'}</TableCell>
                      <TableCell className="capitalize">
                        {code.Type_Reduction?.replace('_', ' ') || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {code.Valeur !== null && code.Valeur !== undefined ? code.Valeur : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {code.Expiration
                          ? format(new Date(code.Expiration), 'dd MMM yyyy', {
                              locale: fr,
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="secondary">Expiré</Badge>
                        ) : (
                          <Badge variant="default">Actif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        -
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
