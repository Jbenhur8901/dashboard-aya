'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  useDashboardStats,
  useSouscriptionsParType,
  useRevenusParMois,
  useRecentSouscriptions,
} from '@/hooks/use-dashboard-data'
import { FileText, TrendingUp, Clock, Users } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ProductType, SouscriptionStatus } from '@/types/database.types'

const PRODUCT_COLORS: Record<ProductType, string> = {
  'NSIA AUTO': '#10B981',
  'NSIA VOYAGE': '#3B82F6',
  'NSIA MULTIRISQUE HABITATION': '#8B5CF6',
  'NSIA INDIVIDUEL ACCIDENTS': '#F59E0B',
}

const PRODUCT_LABELS: Record<ProductType, string> = {
  'NSIA AUTO': 'Auto',
  'NSIA VOYAGE': 'Voyage',
  'NSIA MULTIRISQUE HABITATION': 'MRH',
  'NSIA INDIVIDUEL ACCIDENTS': 'IAC',
}

const STATUS_VARIANTS: Record<SouscriptionStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  en_cours: 'default',
  valide: 'success',
  expiree: 'secondary',
  annulee: 'destructive',
  en_attente: 'warning',
}

const STATUS_LABELS: Record<SouscriptionStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validée',
  expiree: 'Expirée',
  annulee: 'Annulée',
  en_attente: 'En attente',
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: souscriptionsParType } = useSouscriptionsParType()
  const { data: revenusParMois } = useRevenusParMois()
  const { data: recentSouscriptions } = useRecentSouscriptions()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const pieData = souscriptionsParType?.map(item => ({
    name: PRODUCT_LABELS[item.producttype as ProductType],
    value: item.count,
    color: PRODUCT_COLORS[item.producttype as ProductType],
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Souscriptions Actives"
          value={statsLoading ? '...' : stats?.total_souscriptions || 0}
          icon={FileText}
          colorClass="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-100"
        />
        <StatCard
          title="Revenus du Mois"
          value={statsLoading ? '...' : formatCurrency(stats?.revenus_mois || 0)}
          icon={TrendingUp}
          colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-100"
        />
        <StatCard
          title="Transactions en Attente"
          value={statsLoading ? '...' : stats?.transactions_pending || 0}
          icon={Clock}
          colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-100"
        />
        <StatCard
          title="Nouveaux Clients"
          value={statsLoading ? '...' : stats?.nouveaux_clients || 0}
          icon={Users}
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-100"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Souscriptions par Type</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="w-full h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Revenus des 6 Derniers Mois</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="w-full h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenusParMois} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="revenus" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières Souscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type de Produit</TableHead>
                <TableHead>Prime TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSouscriptions?.map((souscription) => (
                <TableRow key={souscription.id}>
                  <TableCell>
                    {souscription.client?.username || souscription.client?.fullname || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: `${PRODUCT_COLORS[souscription.producttype as ProductType]}20`,
                        color: PRODUCT_COLORS[souscription.producttype as ProductType],
                      }}
                    >
                      {PRODUCT_LABELS[souscription.producttype as ProductType]}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(souscription.prime_ttc || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[(souscription.status || 'en_attente') as SouscriptionStatus]}>
                      {STATUS_LABELS[(souscription.status || 'en_attente') as SouscriptionStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(souscription.created_at), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
