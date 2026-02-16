'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { exportToXlsx } from '@/lib/export-xlsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'
import { TablePagination } from '@/components/ui/table-pagination'
import { useTablePagination } from '@/hooks/use-table-pagination'

const SYSTEM_USER_ID = 'e8aaa1ee-9f75-4219-81a2-10b261c6bb46'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

type AuditLogRow = {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_values: JsonValue | null
  new_values: JsonValue | null
  metadata: JsonValue | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    full_name: string | null
    fonction: string | null
    departement: string | null
    email?: string | null
  }
}

export default function LogsPage() {
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null)
  const [filterAgent, setFilterAgent] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterTable, setFilterTable] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const formatLabel = (value: string | null | undefined) => value || '—'

  const tableLabels: Record<string, string> = {
    users: 'Utilisateurs',
    clients: 'Clients',
    souscriptions: 'Souscriptions',
    transactions: 'Transactions',
    documents: 'Documents',
    code_promo: 'Codes promo',
    payment_transactions: 'Transactions de paiement',
    audit_logs: 'Journal des actions',
    ip_whitelist: 'Liste IP autorisées',
    api_keys: 'Clés API',
    souscription_auto: 'Souscriptions Auto',
    souscription_voyage: 'Souscriptions Voyage',
    souscription_mrh: 'Souscriptions MRH',
    souscription_iac: 'Souscriptions IAC',
    souscription_easysante: 'Souscriptions Easy Santé',
  }

  const actionLabels: Record<string, string> = {
    INSERT: 'Création',
    UPDATE: 'Modification',
    DELETE: 'Suppression',
    'souscription.status_change': 'Changement de statut de souscription',
    'admin.user_role_update': 'Modification du rôle utilisateur',
    'souscription.delete': 'Suppression de souscription',
    'code_agent.delete': 'Suppression de code agent',
    'code_agent.update': 'Mise à jour de code agent',
    'code_agent.create': 'Création de code agent',
  }

  const fieldLabels: Record<string, string> = {
    full_name: 'Nom complet',
    last_name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    whatsappnumber: 'WhatsApp',
    status: 'Statut',
    role: 'Rôle',
    approved: 'Approuvé',
    disabled: 'Désactivé',
    city: 'Ville',
    address: 'Adresse',
    profession: 'Profession',
    amount: 'Montant',
    prime_ttc: 'Prime TTC',
    producttype: 'Type de produit',
    codepromo: 'Code promo',
    source: 'Source',
    created_at: 'Créé le',
    updated_at: 'Mis à jour le',
  }

  const toDisplay = (value: JsonValue) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const buildChanges = (oldValues: JsonValue | null, newValues: JsonValue | null) => {
    if (!oldValues && !newValues) return []
    const oldObj = (oldValues && typeof oldValues === 'object' && !Array.isArray(oldValues)) ? oldValues as Record<string, JsonValue> : {}
    const newObj = (newValues && typeof newValues === 'object' && !Array.isArray(newValues)) ? newValues as Record<string, JsonValue> : {}
    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
    return keys.map((key) => ({
      field: fieldLabels[key] || key,
      before: toDisplay(oldObj[key]),
      after: toDisplay(newObj[key]),
    }))
  }

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async (): Promise<AuditLogRow[]> => {
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, table_name, record_id, old_values, new_values, metadata, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })

      const rows = (auditData as AuditLogRow[]) || []
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[]

      if (userIds.length === 0) return rows

      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, fonction, departement, email')
        .in('id', userIds)

      const usersMap = new Map(
        (usersData || []).map((u) => [u.id, {
          full_name: u.full_name,
          fonction: u.fonction,
          departement: u.departement,
          email: u.email,
        }])
      )

      return rows.map((row) => ({
        ...row,
        user: row.user_id ? usersMap.get(row.user_id) : undefined,
      }))
    },
  })

  const availableActions = useMemo(() => {
    const actions = Array.from(new Set((logs || []).map((l) => l.action))).sort()
    return actions
  }, [logs])

  const availableTables = useMemo(() => {
    const tables = Array.from(new Set((logs || []).map((l) => l.table_name).filter(Boolean))) as string[]
    return tables.sort()
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (!logs) return []

    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null
    const agentQuery = filterAgent.trim().toLowerCase()

    return logs.filter((log) => {
      if (fromDate && log.created_at && new Date(log.created_at) < fromDate) return false
      if (toDate && log.created_at && new Date(log.created_at) > toDate) return false

      if (filterAction !== 'all' && log.action !== filterAction) return false
      if (filterTable !== 'all' && log.table_name !== filterTable) return false

      if (agentQuery) {
        const isSystem = log.user_id === SYSTEM_USER_ID
        const agentName = isSystem
          ? 'système'
          : (log.user?.full_name || log.user?.email || 'utilisateur inconnu').toLowerCase()
        if (!agentName.includes(agentQuery)) return false
      }

      return true
    })
  }, [logs, dateFrom, dateTo, filterAgent, filterAction, filterTable])

  const {
    currentPage,
    totalPages,
    startItem,
    endItem,
    totalItems,
    paginatedItems: paginatedLogs,
    setCurrentPage,
  } = useTablePagination(filteredLogs, [filterAgent, filterAction, filterTable, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Logs</h1>
        <p className="subtitle">Récapitulatif des actions par utilisateur</p>
      </div>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Historique détaillé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Input
                placeholder="Nom ou email"
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFilterAgent('')
                  setFilterAction('all')
                  setFilterTable('all')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {availableActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {actionLabels[action] || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les tables</SelectItem>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {tableLabels[table] || table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                exportToXlsx({
                  filename: 'logs',
                  sheetName: 'Logs',
                  columns: [
                    {
                      header: 'Date',
                      accessor: (row) =>
                        format(new Date(row.created_at), 'dd MMM yyyy HH:mm', { locale: fr }),
                    },
                    {
                      header: 'Agent',
                      accessor: (row) =>
                        row.user_id === SYSTEM_USER_ID
                          ? 'Système'
                          : row.user?.full_name || row.user?.email || 'Utilisateur inconnu',
                    },
                    {
                      header: 'Action',
                      accessor: (row) => actionLabels[row.action] || row.action,
                    },
                    {
                      header: 'Table',
                      accessor: (row) =>
                        row.table_name ? (tableLabels[row.table_name] || row.table_name) : '—',
                    },
                    { header: 'Record', accessor: (row) => row.record_id || '—' },
                    { header: 'IP', accessor: (row) => row.ip_address || '—' },
                  ],
                  rows: filteredLogs,
                })
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>

          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Chargement...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Aucun log</TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => {
                  const isSystem = log.user_id === SYSTEM_USER_ID
                  const agentName = isSystem
                    ? 'Système'
                    : log.user?.full_name || log.user?.email || 'Utilisateur inconnu'
                  const actionLabel = actionLabels[log.action] || log.action
                  const tableLabel = log.table_name ? (tableLabels[log.table_name] || log.table_name) : '—'
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.created_at
                          ? format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: fr })
                          : '—'}
                      </TableCell>
                      <TableCell className="font-medium">{agentName}</TableCell>
                      <TableCell>{actionLabel}</TableCell>
                      <TableCell>{tableLabel}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.record_id ? log.record_id.slice(0, 8) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.ip_address || '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          </div>
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

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l’action</DialogTitle>
            <DialogDescription>
              {selectedLog?.action ? (actionLabels[selectedLog.action] || selectedLog.action) : '—'}
              {' — '}
              {selectedLog?.table_name ? (tableLabels[selectedLog.table_name] || selectedLog.table_name) : '—'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Agent</p>
                <p className="font-medium">
                  {selectedLog?.user_id === SYSTEM_USER_ID
                    ? 'Système'
                    : selectedLog?.user?.full_name || selectedLog?.user?.email || 'Utilisateur inconnu'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {selectedLog?.created_at
                    ? format(new Date(selectedLog.created_at), 'dd MMM yyyy HH:mm', { locale: fr })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Section</p>
                <p className="font-medium">
                  {selectedLog?.table_name ? (tableLabels[selectedLog.table_name] || selectedLog.table_name) : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Référence</p>
                <p className="font-medium">{formatLabel(selectedLog?.record_id)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IP</p>
                <p className="font-medium">{formatLabel(selectedLog?.ip_address)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User agent</p>
                <p className="font-medium">{formatLabel(selectedLog?.user_agent)}</p>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 text-muted-foreground">Résumé compréhensible</p>
              <p>
                {(() => {
                  if (!selectedLog) return '—'
                  const actionLabel = actionLabels[selectedLog.action] || selectedLog.action
                  const tableLabel = selectedLog.table_name
                    ? (tableLabels[selectedLog.table_name] || selectedLog.table_name)
                    : 'une section'
                  const agentName = selectedLog.user_id === SYSTEM_USER_ID
                    ? 'le système'
                    : selectedLog.user?.full_name || selectedLog.user?.email || 'un utilisateur'
                  return `${actionLabel} dans ${tableLabel} par ${agentName}.`
                })()}
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 text-muted-foreground">Changements</p>
              {selectedLog ? (
                buildChanges(selectedLog.old_values, selectedLog.new_values).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun détail de modification disponible.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {buildChanges(selectedLog.old_values, selectedLog.new_values).map((change, idx) => (
                      <div key={`${change.field}-${idx}`} className="rounded-md border p-2">
                        <p className="font-medium">{change.field}</p>
                        <p className="text-muted-foreground">Avant: {change.before}</p>
                        <p className="text-muted-foreground">Après: {change.after}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 text-muted-foreground">Détails techniques (optionnel)</p>
              <pre className="whitespace-pre-wrap text-xs">
                {selectedLog?.metadata ? JSON.stringify(selectedLog.metadata, null, 2) : '—'}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
