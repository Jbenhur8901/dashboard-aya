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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Trash2, Shield, Globe } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useIsAdmin } from '@/hooks/use-user-profile'

interface IpWhitelist {
  id: string
  ip_address: string
  description: string | null
  is_global: boolean
  created_by: string | null
  created_at: string
}

export default function IpWhitelistPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    ip_address: '',
    description: '',
    is_global: false,
  })

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { isSuperAdmin, isLoading: isLoadingAdmin } = useIsAdmin()

  const { data: whitelist, isLoading } = useQuery({
    queryKey: ['ip-whitelist'],
    queryFn: async (): Promise<IpWhitelist[]> => {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Table might not exist yet
        console.error('IP whitelist error:', error)
        return []
      }
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Omit<IpWhitelist, 'id' | 'created_at' | 'created_by'>) => {
      const { data: user } = await supabase.auth.getUser()
      const { error } = await supabase.from('ip_whitelist').insert([
        {
          ...data,
          created_by: user.user?.id,
        },
      ])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] })
      toast({
        title: 'IP ajoutee',
        description: 'L\'adresse IP a ete ajoutee a la whitelist',
      })
      setIsDialogOpen(false)
      setFormData({ ip_address: '', description: '', is_global: false })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter l\'IP',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ip_whitelist').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-whitelist'] })
      toast({
        title: 'IP supprimee',
        description: 'L\'adresse IP a ete retiree de la whitelist',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'IP',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.ip_address) {
      toast({
        title: 'Champ manquant',
        description: 'Veuillez entrer une adresse IP',
        variant: 'destructive',
      })
      return
    }

    // Basic IP validation (IPv4)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
    if (!ipRegex.test(formData.ip_address)) {
      toast({
        title: 'Format invalide',
        description: 'Veuillez entrer une adresse IP valide (ex: 192.168.1.1 ou 192.168.1.0/24)',
        variant: 'destructive',
      })
      return
    }

    createMutation.mutate({
      ip_address: formData.ip_address,
      description: formData.description || null,
      is_global: formData.is_global,
    })
  }

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acces refuse</h2>
        <p className="text-muted-foreground">
          Seuls les super administrateurs peuvent acceder a cette page
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="title-display">Whitelist IP</h1>
          <p className="subtitle">Gérez les adresses IP autorisées à accéder à l&apos;application</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter IP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une adresse IP</DialogTitle>
              <DialogDescription>
                Ajoutez une adresse IP a la whitelist
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ip">Adresse IP</Label>
                <Input
                  id="ip"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="192.168.1.1 ou 192.168.1.0/24"
                />
                <p className="text-xs text-muted-foreground">
                  Vous pouvez entrer une IP unique ou un range CIDR
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Bureau principal, VPN, etc."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="global"
                  checked={formData.is_global}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_global: checked as boolean })
                  }
                />
                <Label htmlFor="global" className="text-sm">
                  IP globale (applicable a tous les utilisateurs)
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Securite IP
          </CardTitle>
          <CardDescription>
            La whitelist IP permet de restreindre l&apos;acces a l&apos;application uniquement aux adresses IP autorisees.
            Si la whitelist est vide, toutes les IPs sont autorisees.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adresse IP</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date d&apos;ajout</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : whitelist?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <div className="py-8 text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aucune IP dans la whitelist</p>
                      <p className="text-xs">Toutes les adresses IP sont autorisees</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                whitelist?.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono">
                      {ip.ip_address}
                    </TableCell>
                    <TableCell>
                      {ip.description || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {ip.is_global ? (
                        <Badge variant="default">Globale</Badge>
                      ) : (
                        <Badge variant="secondary">Specifique</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(ip.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Supprimer cette adresse IP ?')) {
                            deleteMutation.mutate(ip.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
