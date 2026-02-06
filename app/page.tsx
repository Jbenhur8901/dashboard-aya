'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  useDashboardStats,
  useSouscriptionsParType,
  useRevenusParMois,
  useRecentSouscriptions,
} from '@/hooks/use-dashboard-data'
import { FileText, TrendingUp, Clock, Users, ArrowUpRight, CreditCard } from 'lucide-react'
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
import { useIsAdmin } from '@/hooks/use-user-profile'

const PRODUCT_COLORS: Record<ProductType, string> = {
  'NSIA AUTO': '#0EA5E9',
  'NSIA VOYAGE': '#6366F1',
  'NSIA MULTIRISQUE HABITATION': '#14B8A6',
  'NSIA INDIVIDUEL ACCIDENTS': '#F59E0B',
}

const PRODUCT_LABELS: Record<ProductType, string> = {
  'NSIA AUTO': 'Auto',
  'NSIA VOYAGE': 'Voyage',
  'NSIA MULTIRISQUE HABITATION': 'MRH',
  'NSIA INDIVIDUEL ACCIDENTS': 'IAC',
}

const STATUS_STYLES: Record<SouscriptionStatus, string> = {
  en_cours: 'bg-sky-500/10 text-sky-700 border border-sky-500/20',
  valide: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
  expirée: 'bg-slate-500/10 text-slate-700 border border-slate-500/20',
  annulée: 'bg-red-500/10 text-red-700 border border-red-500/20',
  en_attente: 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
}

const STATUS_LABELS: Record<SouscriptionStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validée',
  expirée: 'Expirée',
  annulée: 'Annulée',
  en_attente: 'En attente',
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: souscriptionsParType } = useSouscriptionsParType()
  const { data: revenusParMois } = useRevenusParMois()
  const { data: recentSouscriptions } = useRecentSouscriptions()
  const { isUser } = useIsAdmin()

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="title-display">Dashboard</h1>
          <p className="subtitle mt-1">Vue d&apos;ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          Mise à jour en temps réel
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isUser && (
          <StatCard
            title="Souscriptions Actives"
            value={statsLoading ? '...' : stats?.total_souscriptions || 0}
            icon={FileText}
          />
        )}
        {!isUser && (
          <StatCard
            title="Revenus du Mois"
            value={statsLoading ? '...' : formatCurrency(stats?.revenus_mois || 0)}
            icon={TrendingUp}
          />
        )}
        {!isUser && (
          <StatCard
            title="Total MTN Mobile Money"
            value={statsLoading ? '...' : formatCurrency(stats?.total_mtn || 0)}
            icon={CreditCard}
          />
        )}
        {!isUser && (
          <StatCard
            title="Chiffre d'affaires encaissé"
            value={statsLoading ? '...' : formatCurrency(stats?.total_encaisse || 0)}
            icon={TrendingUp}
          />
        )}
        <StatCard
          title="Transactions en Attente"
          value={statsLoading ? '...' : stats?.transactions_pending || 0}
          icon={Clock}
        />
        <StatCard
          title="Nouveaux Clients"
          value={statsLoading ? '...' : stats?.nouveaux_clients || 0}
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="surface p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold">Souscriptions par Type</h3>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Détails <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                  }}
                  itemStyle={{ color: '#111827' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        {!isUser && (
          <div className="surface p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold">Revenus des 6 Derniers Mois</h3>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Détails <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenusParMois} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                  <XAxis
                    dataKey="mois"
                    style={{ fontSize: '12px' }}
                    stroke="rgba(15, 23, 42, 0.4)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    style={{ fontSize: '12px' }}
                    stroke="rgba(15, 23, 42, 0.4)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    }}
                    itemStyle={{ color: '#111827' }}
                    labelStyle={{ color: 'rgba(15, 23, 42, 0.55)' }}
                  />
                  <Bar
                    dataKey="revenus"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F172A" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent Subscriptions Table */}
      <div className="surface overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-base font-semibold">Dernières Souscriptions</h3>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Voir tout <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Client</TableHead>
                <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="text-muted-foreground font-medium">Prime TTC</TableHead>
                <TableHead className="text-muted-foreground font-medium">Statut</TableHead>
                <TableHead className="text-muted-foreground font-medium">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSouscriptions?.map((souscription) => (
                <TableRow
                  key={souscription.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    {souscription.client?.username || souscription.client?.fullname || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${PRODUCT_COLORS[souscription.producttype as ProductType]}15`,
                        color: PRODUCT_COLORS[souscription.producttype as ProductType],
                      }}
                    >
                      {PRODUCT_LABELS[souscription.producttype as ProductType]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {formatCurrency(souscription.prime_ttc || 0)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[(souscription.status || 'en_attente') as SouscriptionStatus]}`}>
                      {STATUS_LABELS[(souscription.status || 'en_attente') as SouscriptionStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(souscription.created_at), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
