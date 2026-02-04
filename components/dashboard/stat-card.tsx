import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  colorClass?: string
}

export function StatCard({ title, value, icon: Icon, trend, colorClass }: StatCardProps) {
  return (
    <div className="surface hover-lift p-5 sm:p-6 animate-fade-up">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
              <span className="text-muted-foreground">vs mois dernier</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/60',
            colorClass
          )}
        >
          <Icon className="h-4 w-4 text-foreground" />
        </div>
      </div>
    </div>
  )
}
