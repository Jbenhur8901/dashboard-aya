'use client'

import { useState, useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { BarChart3, TrendingUp, Tag, Search, Users } from 'lucide-react'
import { CodePromo } from '@/types/database.types'

interface CodeTracking {
  code: string
  agent: string | null
  subscription_count: number
  total_revenue: number
  commission: number
  conversion_rate: number
  last_subscription_at: string | null
  actif: boolean
}

type SouscriptionRow = {
  codepromo: string | null
  prime_ttc: number | null
  status: string | null
  created_at: string | null
}

type TransactionRow = {
  amount: number | string | null
  status: string | null
  created_at: string | null
  souscription?: {
    codepromo: string | null
  }[] | null
}

export default function SuiviAgentsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all codes promo to get all agents
  const { data: codesPromo } = useQuery({
    queryKey: ['codes-agents-all'],
    queryFn: async (): Promise<CodePromo[]> => {
      const { data, error } = await supabase
        .from('code_promo')
        .select('id, created_at, updated_at, code, agent:"Agent", type_reduction:"Type_Reduction", valeur:"Valeur", expiration:"Expiration", actif')

      if (error) throw error
      return data || []
    },
  })

  // Fetch all souscriptions with promo code info
  const { data: souscriptions, isLoading } = useQuery<SouscriptionRow[]>({
    queryKey: ['souscriptions-for-agent-tracking'],
    queryFn: async (): Promise<SouscriptionRow[]> => {
      const { data, error } = await supabase
        .from('souscriptions')
        .select('codepromo, prime_ttc, status, created_at')

      if (error) throw error
      return (data || []) as SouscriptionRow[]
    },
  })

  // Fetch transactions with linked souscriptions for payment stats
  const { data: transactions } = useQuery<TransactionRow[]>({
    queryKey: ['transactions-for-agent-tracking'],
    queryFn: async (): Promise<TransactionRow[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          status,
          created_at,
          souscription:souscriptions(codepromo)
        `)

      if (error) throw error
      return (data || []) as TransactionRow[]
    },
  })

  // Aggregate data by agent
  const codeTracking: CodeTracking[] = useMemo(() => {
    if (!codesPromo) return []

    const normalizeCode = (value: string) => value.trim().toUpperCase()

    // Create a map of code -> agent and agent -> codes
    const codeToAgent = new Map<string, string>()
    const agentCodes = new Map<string, Set<string>>()

    codesPromo.forEach((cp) => {
      if (!cp.code) return
      const normalizedCode = normalizeCode(cp.code)
      if (cp.agent) {
        codeToAgent.set(normalizedCode, cp.agent)
        if (!agentCodes.has(cp.agent)) {
          agentCodes.set(cp.agent, new Set())
        }
        agentCodes.get(cp.agent)?.add(normalizedCode)
      }
    })

    // Count subscriptions and revenue per code
    const codeStats = new Map<string, {
      count: number
      revenue: number
      last_sub: string | null
      last_pay: string | null
    }>()

    // Initialize all codes with 0
    codesPromo.forEach((cp) => {
      if (!cp.code) return
      const normalizedCode = normalizeCode(cp.code)
      if (!codeStats.has(normalizedCode)) {
        codeStats.set(normalizedCode, { count: 0, revenue: 0, last_sub: null, last_pay: null })
      }
    })

    // Add subscription data (based on souscriptions table)
    if (souscriptions) {
      souscriptions.forEach((sub) => {
        if (sub.codepromo) {
          const normalizedCode = normalizeCode(sub.codepromo)
          if (codeStats.has(normalizedCode)) {
            const current = codeStats.get(normalizedCode) || { count: 0, revenue: 0, last_sub: null, last_pay: null }
            const createdAt = sub.created_at ? new Date(sub.created_at).toISOString() : null
            codeStats.set(normalizedCode, {
              count: current.count + 1,
              revenue: current.revenue + (Number(sub.prime_ttc) || 0),
              last_sub: createdAt && (!current.last_sub || createdAt > current.last_sub) ? createdAt : current.last_sub,
              last_pay: current.last_pay,
            })
          }
        }
      })
    }

    // Add payment data (only validated)
    if (transactions) {
      transactions.forEach((tx) => {
        const codepromo = Array.isArray(tx.souscription)
          ? tx.souscription[0]?.codepromo
          : undefined
        if (!codepromo) return
        const normalizedCode = normalizeCode(codepromo)
        if (!codeStats.has(normalizedCode)) return

        if (tx.status === 'valide') {
          const current = codeStats.get(normalizedCode) || { count: 0, revenue: 0, last_sub: null, last_pay: null }
          const createdAt = tx.created_at ? new Date(tx.created_at).toISOString() : null
          codeStats.set(normalizedCode, {
            count: current.count,
            revenue: current.revenue,
            last_sub: current.last_sub,
            last_pay: createdAt && (!current.last_pay || createdAt > current.last_pay) ? createdAt : current.last_pay,
          })
        }
      })
    }

    // Compute total subscriptions overall for conversion rate
    const totalSubscriptionsOverall = Array.from(codeStats.values()).reduce(
      (sum, stats) => sum + stats.count,
      0
    )

    // Build result array
    return codesPromo
      .filter((cp) => cp.code)
      .map((cp) => {
        const normalizedCode = normalizeCode(cp.code)
        const stats = codeStats.get(normalizedCode) || { count: 0, revenue: 0, last_sub: null, last_pay: null }
        const agent = cp.agent || null
        const conversionRate = totalSubscriptionsOverall
          ? (stats.count / totalSubscriptionsOverall) * 100
          : 0
        const commissionRate = typeof cp.valeur === 'number' ? cp.valeur : 0
        const commission = (stats.revenue * commissionRate) / 100

        return {
          code: normalizedCode,
          agent,
          subscription_count: stats.count,
          total_revenue: stats.revenue,
          commission,
          conversion_rate: conversionRate,
          last_subscription_at: stats.last_sub,
          actif: cp.actif !== false,
        }
      })
      .sort((a, b) => b.total_revenue - a.total_revenue)
  }, [codesPromo, souscriptions, transactions])

  // Filter by search query
  const filteredCodeTracking = useMemo(() => {
    if (!searchQuery) return codeTracking

    return codeTracking.filter((item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.agent || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [codeTracking, searchQuery])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Calculate summary stats
  const totalAgents = new Set(codeTracking.map((item) => item.agent).filter(Boolean)).size
  const totalSubscriptions = codeTracking.reduce(
    (sum, item) => sum + item.subscription_count,
    0
  )
  const totalRevenue = codeTracking.reduce(
    (sum, item) => sum + item.total_revenue,
    0
  )
  const totalCodes = codeTracking.length
  const totalActiveCodes = codeTracking.filter((item) => item.actif).length
  const codesWithSubscriptions = codeTracking.filter(
    (item) => item.actif && item.subscription_count > 0
  ).length
  const forceDeVente = totalActiveCodes
    ? (codesWithSubscriptions / totalActiveCodes) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-display">Suivi Agents</h1>
        <p className="subtitle">Analyse des performances de vos agents commerciaux</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              Agents avec codes attribues
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codes Attribues</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes}</div>
            <p className="text-xs text-muted-foreground">
              Codes agents total
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Souscriptions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Via codes agents
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant Encaisse</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Transactions validees
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Force de Vente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forceDeVente.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Codes actifs avec souscription
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Rechercher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par agent ou code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracking Table */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Performance par Code</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Souscriptions</TableHead>
                <TableHead>Montant Encaisse</TableHead>
                <TableHead>Taux Conversion</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Derniere Souscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredCodeTracking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {searchQuery ? 'Aucun code trouve' : 'Aucun code attribue'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodeTracking.map((item) => (
                  <TableRow key={item.code}>
                    <TableCell className="font-mono font-semibold">
                      {item.code}
                    </TableCell>
                    <TableCell>
                      {item.agent || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.subscription_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.total_revenue)}
                    </TableCell>
                    <TableCell>
                      {item.conversion_rate > 0 ? (
                        <span className="text-green-600">
                          {item.conversion_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.commission)}
                    </TableCell>
                    <TableCell>
                      {item.last_subscription_at
                        ? new Date(item.last_subscription_at).toLocaleDateString('fr-FR')
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
