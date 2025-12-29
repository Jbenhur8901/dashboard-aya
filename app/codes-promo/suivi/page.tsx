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
import { BarChart3, TrendingUp, Tag, Search } from 'lucide-react'

interface PromoTracking {
  code_promo: string
  subscription_count: number
  total_revenue: number
}

export default function PromoTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all validated souscriptions with promo code info
  const { data: souscriptions, isLoading } = useQuery({
    queryKey: ['souscriptions-for-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('souscriptions')
        .select('codepromo, prime_ttc, status')
        .eq('status', 'valide')

      if (error) throw error
      return data || []
    },
  })

  // Aggregate data client-side
  const promoTracking: PromoTracking[] = useMemo(() => {
    if (!souscriptions) return []

    const grouped = new Map<string, { count: number; revenue: number }>()

    souscriptions.forEach((sub) => {
      const code = sub.codepromo || 'Sans code'
      const current = grouped.get(code) || { count: 0, revenue: 0 }
      grouped.set(code, {
        count: current.count + 1,
        revenue: current.revenue + (Number(sub.prime_ttc) || 0),
      })
    })

    return Array.from(grouped.entries())
      .map(([code_promo, stats]) => ({
        code_promo,
        subscription_count: stats.count,
        total_revenue: stats.revenue,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
  }, [souscriptions])

  // Filter by search query
  const filteredPromoTracking = useMemo(() => {
    if (!searchQuery) return promoTracking

    return promoTracking.filter((item) =>
      item.code_promo.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [promoTracking, searchQuery])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Calculate summary stats (based on all data, not filtered)
  const totalCodes = promoTracking.length
  const totalSubscriptions = promoTracking.reduce(
    (sum, item) => sum + item.subscription_count,
    0
  )
  const totalRevenue = promoTracking.reduce(
    (sum, item) => sum + item.total_revenue,
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suivi des Codes Promo</h1>
        <p className="text-sm text-muted-foreground">
          Analyse des performances des codes promotionnels
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codes Utilisés</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes}</div>
            <p className="text-xs text-muted-foreground">
              Codes promo différents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Souscriptions Totales</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Avec codes promo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Généré via codes promo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher un Code Promo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code promo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par Code Promo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Promo</TableHead>
                <TableHead>Nombre de Souscriptions</TableHead>
                <TableHead>Revenu Total</TableHead>
                <TableHead>Revenu Moyen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredPromoTracking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    {searchQuery ? 'Aucun code promo trouvé' : 'Aucune donnée disponible'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPromoTracking.map((item) => (
                  <TableRow key={item.code_promo}>
                    <TableCell className="font-mono font-semibold">
                      {item.code_promo === 'Sans code' ? (
                        <span className="text-muted-foreground">{item.code_promo}</span>
                      ) : (
                        item.code_promo
                      )}
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
                      {formatCurrency(item.total_revenue / item.subscription_count)}
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
