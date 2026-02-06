'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type AuditLogRow = {
  id: string
  user_id: string | null
  action: string
  created_at: string
  user?: {
    full_name: string | null
    fonction: string | null
    departement: string | null
  }
}

export default function LogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async (): Promise<AuditLogRow[]> => {
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, created_at')
        .order('created_at', { ascending: false })

      const rows = (auditData as AuditLogRow[]) || []
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[]

      if (userIds.length === 0) return rows

      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, fonction, departement')
        .in('id', userIds)

      const usersMap = new Map(
        (usersData || []).map((u) => [u.id, {
          full_name: u.full_name,
          fonction: u.fonction,
          departement: u.departement,
        }])
      )

      return rows.map((row) => ({
        ...row,
        user: row.user_id ? usersMap.get(row.user_id) : undefined,
      }))
    },
  })

  const compiled = useMemo(() => {
    const map = new Map<string, {
      user_id: string | null
      full_name: string
      fonction: string
      departement: string
      total: number
      last_action_at: string | null
      action_counts: Map<string, number>
    }>()

    logs?.forEach((log) => {
      const key = log.user_id || 'unknown'
      const user = log.user
      if (!map.has(key)) {
        map.set(key, {
          user_id: log.user_id,
          full_name: user?.full_name || 'Utilisateur inconnu',
          fonction: user?.fonction || '—',
          departement: user?.departement || '—',
          total: 0,
          last_action_at: log.created_at || null,
          action_counts: new Map(),
        })
      }

      const entry = map.get(key)!
      entry.total += 1
      if (entry.last_action_at && log.created_at && log.created_at > entry.last_action_at) {
        entry.last_action_at = log.created_at
      }
      entry.action_counts.set(log.action, (entry.action_counts.get(log.action) || 0) + 1)
    })

    return Array.from(map.values()).map((item) => {
      const getCount = (action: string) => item.action_counts.get(action) || 0
      return {
        ...item,
        souscription_status_change: getCount('souscription.status_change'),
        admin_user_role_update: getCount('admin.user_role_update'),
        souscription_delete: getCount('souscription.delete'),
        code_agent_delete: getCount('code_agent.delete'),
        code_agent_update: getCount('code_agent.update'),
        code_agent_create: getCount('code_agent.create'),
      }
    })
  }, [logs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Logs</h1>
        <p className="subtitle">Récapitulatif des actions par utilisateur</p>
      </div>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Compilation des actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Changement statut souscription</TableHead>
                <TableHead>Mise à jour rôle utilisateur</TableHead>
                <TableHead>Suppression souscription</TableHead>
                <TableHead>Suppression code agent</TableHead>
                <TableHead>Mise à jour code agent</TableHead>
                <TableHead>Création code agent</TableHead>
                <TableHead>Dernière action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Chargement...</TableCell>
                </TableRow>
              ) : compiled.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Aucun log</TableCell>
                </TableRow>
              ) : (
                compiled.map((row) => (
                  <TableRow key={row.user_id || row.full_name}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.fonction}</TableCell>
                    <TableCell>{row.departement}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.total}</Badge>
                    </TableCell>
                    <TableCell>{row.souscription_status_change}</TableCell>
                    <TableCell>{row.admin_user_role_update}</TableCell>
                    <TableCell>{row.souscription_delete}</TableCell>
                    <TableCell>{row.code_agent_delete}</TableCell>
                    <TableCell>{row.code_agent_update}</TableCell>
                    <TableCell>{row.code_agent_create}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.last_action_at
                        ? formatDistanceToNow(new Date(row.last_action_at), { addSuffix: true, locale: fr })
                        : '—'}
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
