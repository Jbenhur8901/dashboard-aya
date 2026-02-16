import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  DashboardStats,
  SouscriptionParType,
  RevenuParMois,
  Souscription
} from '@/types/database.types'
import { startOfMonth, subMonths, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString()

      // Total souscriptions actives (validées)
      const { count: totalSouscriptions } = await supabase
        .from('souscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'valide')

      // Revenus du mois
      const { data: souscriptionsMois } = await supabase
        .from('souscriptions')
        .select('prime_ttc')
        .gte('created_at', startOfCurrentMonth)
        .lte('created_at', new Date().toISOString())
        .eq('status', 'valide')

      const revenusMois = souscriptionsMois?.reduce((sum, s) => sum + (s.prime_ttc || 0), 0) || 0

      // Total transactions encaissées (validées)
      const { data: transactionsValidees } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'valide')

      const totalEncaisse = transactionsValidees?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

      // Transactions en attente
      const { count: transactionsPending } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'en_attente')

      // Total Mobile Money (transactions validées)
      const { data: mobileMoneyTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .in('payment_method', ['MTN_MOBILE_MONEY', 'AIRTEL_MOBILE_MONEY'])
        .eq('status', 'valide')

      const totalMtn = mobileMoneyTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

      // Nouveaux clients ce mois
      const { count: nouveauxClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfCurrentMonth)

      return {
        total_souscriptions: totalSouscriptions || 0,
        revenus_mois: revenusMois,
        total_mtn: totalMtn,
        total_encaisse: totalEncaisse,
        transactions_pending: transactionsPending || 0,
        nouveaux_clients: nouveauxClients || 0,
      }
    },
  })
}

export function useSouscriptionsParType() {
  return useQuery({
    queryKey: ['souscriptions-par-type'],
    queryFn: async (): Promise<SouscriptionParType[]> => {
      const { data } = await supabase
        .from('souscriptions')
        .select('producttype')
        .eq('status', 'valide')

      const counts = data?.reduce((acc, s) => {
        acc[s.producttype] = (acc[s.producttype] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return Object.entries(counts).map(([producttype, count]) => ({
        producttype: producttype as any,
        count,
      }))
    },
  })
}

export function useRevenusParMois() {
  return useQuery({
    queryKey: ['revenus-par-mois'],
    queryFn: async (): Promise<RevenuParMois[]> => {
      const sixMonthsAgo = subMonths(new Date(), 5)

      const { data } = await supabase
        .from('souscriptions')
        .select('prime_ttc, created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .eq('status', 'valide')
        .order('created_at', { ascending: true })

      const revenusParMois = new Map<string, number>()

      data?.forEach(s => {
        const mois = format(new Date(s.created_at), 'MMM yyyy', { locale: fr })
        revenusParMois.set(mois, (revenusParMois.get(mois) || 0) + (s.prime_ttc || 0))
      })

      return Array.from(revenusParMois.entries()).map(([mois, revenus]) => ({
        mois,
        revenus,
      }))
    },
  })
}

export function useRecentSouscriptions() {
  return useQuery({
    queryKey: ['recent-souscriptions'],
    queryFn: async (): Promise<Souscription[]> => {
      const { data } = await supabase
        .from('souscriptions')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('status', 'valide')
        .order('created_at', { ascending: false })
        .limit(5)

      return data || []
    },
  })
}
