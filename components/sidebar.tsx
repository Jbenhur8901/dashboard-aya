'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Tag,
  FolderOpen,
  BarChart3,
  Car,
  Plane,
  Home,
  ShieldCheck,
  Settings,
  UserCog,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'

const allNavigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    permission: 'view:dashboard' as const,
  },
  {
    name: 'Souscriptions',
    href: '/souscriptions',
    icon: FileText,
    permission: 'view:souscriptions' as const,
  },
  {
    name: 'Auto',
    href: '/auto',
    icon: Car,
    permission: 'view:products' as const,
  },
  {
    name: 'Voyage',
    href: '/voyage',
    icon: Plane,
    permission: 'view:products' as const,
  },
  {
    name: 'MRH',
    href: '/mrh',
    icon: Home,
    permission: 'view:products' as const,
  },
  {
    name: 'IAC',
    href: '/iac',
    icon: ShieldCheck,
    permission: 'view:products' as const,
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Users,
    permission: 'view:clients' as const,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: CreditCard,
    permission: 'view:transactions' as const,
  },
  {
    name: 'Codes Agents',
    href: '/codes-agents',
    icon: Tag,
    permission: 'view:codes_agents' as const,
  },
  {
    name: 'Suivi Agents',
    href: '/codes-agents/suivi',
    icon: BarChart3,
    permission: 'view:codes_agents' as const,
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FolderOpen,
    permission: 'view:documents' as const,
  },
  {
    name: 'Utilisateurs',
    href: '/admin/users',
    icon: UserCog,
    permission: 'manage:users' as const,
  },
  {
    name: 'Whitelist IP',
    href: '/admin/ip-whitelist',
    icon: Settings,
    permission: 'manage:settings' as const,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { can, isLoading } = usePermissions()

  // Filter navigation based on permissions
  const navigation = allNavigation.filter((item) => can(item.permission))

  return (
    <div className="flex h-screen w-64 flex-col bg-card/80 backdrop-blur border-r">
      {/* Logo Section */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:shadow-md transition-shadow duration-300">
            <Zap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="font-display text-sm font-semibold tracking-tight">LE DASH</span>
            <p className="text-xs text-muted-foreground">Assurance Suite</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80'
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span>{item.name}</span>
                {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            )
          })
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t">
        <p className="text-[10px] text-muted-foreground text-center tracking-wide">v2.0.0</p>
      </div>
    </div>
  )
}
