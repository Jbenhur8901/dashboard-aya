'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useIsAdmin } from '@/hooks/use-user-profile'
import { useToast } from '@/hooks/use-toast'
import { useAuditLog, AUDIT_ACTIONS } from '@/hooks/use-audit-log'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TablePagination } from '@/components/ui/table-pagination'
import { useTablePagination } from '@/hooks/use-table-pagination'

type UserRow = {
  id: string
  email: string
  username: string
  role: string | null
  approved: boolean
  disabled: boolean
  last_login_at: string | null
  mfa_enabled: boolean | null
  mfa_verified_at: string | null
  created_at: string
}

export default function UsersAdminPage() {
  const { isAdmin, isSuperAdmin, isLoading } = useIsAdmin()
  const { toast } = useToast()
  const { log } = useAuditLog()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<UserRow[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, role, approved, disabled, last_login_at, mfa_enabled, mfa_verified_at, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: isAdmin || isSuperAdmin,
  })

  const approveMutation = useMutation({
    mutationFn: async (payload: { id: string; approved: boolean }) => {
      const { data: currentUser } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('users')
        .update({
          approved: payload.approved,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.user?.id || null,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      log({
        action: AUDIT_ACTIONS.ADMIN_USER_APPROVE,
        table_name: 'users',
        record_id: payload.id,
        new_values: { approved: payload.approved },
      })
      toast({
        title: 'Mise à jour',
        description: 'Le statut d’approbation a été mis à jour',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour l’utilisateur',
        variant: 'destructive',
      })
    },
  })

  const disableMutation = useMutation({
    mutationFn: async (payload: { id: string; disabled: boolean }) => {
      const { data: currentUser } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('users')
        .update({
          disabled: payload.disabled,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.user?.id || null,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      log({
        action: AUDIT_ACTIONS.ADMIN_USER_DISABLE,
        table_name: 'users',
        record_id: payload.id,
        new_values: { disabled: payload.disabled },
      })
      toast({
        title: 'Mise à jour',
        description: 'Le statut du compte a été mis à jour',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour l’utilisateur',
        variant: 'destructive',
      })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { id: string; role: string }) => {
      const { data: currentUser } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('users')
        .update({
          role: payload.role,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.user?.id || null,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      log({
        action: AUDIT_ACTIONS.ADMIN_USER_ROLE_UPDATE,
        table_name: 'users',
        record_id: payload.id,
        new_values: { role: payload.role },
      })
      toast({
        title: 'Rôle mis à jour',
        description: 'Le rôle utilisateur a été modifié',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le rôle',
        variant: 'destructive',
      })
    },
  })

  const resetMfaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/admin/reset-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Reset MFA échoué')
      }

      const { data: currentUser } = await supabase.auth.getUser()
      await supabase
        .from('users')
        .update({
          mfa_enabled: false,
          mfa_verified_at: null,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.user?.id || null,
        })
        .eq('id', id)
    },
    onSuccess: (_, id) => {
      log({
        action: AUDIT_ACTIONS.ADMIN_USER_MFA_RESET,
        table_name: 'users',
        record_id: id,
        metadata: { reset_mfa: true },
      })
      toast({
        title: 'MFA réinitialisée',
        description: 'Les facteurs MFA ont été supprimés',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de réinitialiser MFA',
        variant: 'destructive',
      })
    },
  })

  const filteredUsers = useMemo(() => {
    const list = users || []
    return list.filter((u) => {
      const matchesSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())

      const matchesRole = roleFilter === 'all' || u.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && u.approved && !u.disabled) ||
        (statusFilter === 'pending' && !u.approved) ||
        (statusFilter === 'disabled' && u.disabled)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const {
    currentPage,
    totalPages,
    startItem,
    endItem,
    totalItems,
    paginatedItems: paginatedUsers,
    setCurrentPage,
  } = useTablePagination(filteredUsers, [search, roleFilter, statusFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accès refusé</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Utilisateurs</h1>
        <p className="subtitle">Gérez l’accès et la gouvernance des comptes</p>
      </div>

      <Card className="animate-fade-up">
        <CardContent className="py-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="Rechercher par email ou username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="admin_fin">Admin_Fin</SelectItem>
                <SelectItem value="superadmin">SuperAdmin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="disabled">Désactivés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Comptes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière Connexion</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Chargement...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Aucun utilisateur</TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>
                      {isSuperAdmin ? (
                        <Select
                          value={u.role || 'user'}
                          onValueChange={(value) => updateRoleMutation.mutate({ id: u.id, role: value })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="admin_fin">Admin_Fin</SelectItem>
                            <SelectItem value="superadmin">SuperAdmin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{u.role || '—'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.disabled ? (
                        <Badge variant="destructive">Désactivé</Badge>
                      ) : u.approved ? (
                        <Badge variant="default">Approuvé</Badge>
                      ) : (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell>
                      {u.mfa_enabled ? 'Actif' : 'Inactif'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate({ id: u.id, approved: !u.approved })}
                        >
                          {u.approved ? 'Retirer' : 'Approuver'}
                        </Button>
                        <Button
                          size="sm"
                          variant={u.disabled ? 'outline' : 'destructive'}
                          onClick={() => disableMutation.mutate({ id: u.id, disabled: !u.disabled })}
                        >
                          {u.disabled ? 'Activer' : 'Désactiver'}
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => resetMfaMutation.mutate(u.id)}
                          >
                            Reset MFA
                          </Button>
                        )}
                      </div>
                    </TableCell>
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
    </div>
  )
}
