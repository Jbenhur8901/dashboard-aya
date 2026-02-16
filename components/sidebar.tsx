'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
  HeartPulse,
  ClipboardList,
  Settings,
  UserCog,
  Zap,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'

type NavPermission =
  | 'view:dashboard'
  | 'view:souscriptions'
  | 'view:products'
  | 'view:clients'
  | 'view:transactions'
  | 'view:codes_agents'
  | 'view:documents'
  | 'view:logs'
  | 'manage:users'
  | 'manage:settings'

type NavLeaf = {
  name: string
  href: string
  icon: any
  permission: NavPermission
}

type NavGroup = {
  name: string
  icon: any
  children: NavLeaf[]
}

const dashboardItem: NavLeaf = {
  name: 'Dashboard',
  href: '/',
  icon: LayoutDashboard,
  permission: 'view:dashboard',
}

const groupedNavigation: NavGroup[] = [
  {
    name: 'Activité',
    icon: FileText,
    children: [
      { name: 'Souscriptions', href: '/souscriptions', icon: FileText, permission: 'view:souscriptions' },
      { name: 'Clients', href: '/clients', icon: Users, permission: 'view:clients' },
      { name: 'Transactions', href: '/transactions', icon: CreditCard, permission: 'view:transactions' },
      { name: 'Documents', href: '/documents', icon: FolderOpen, permission: 'view:documents' },
    ],
  },
  {
    name: 'Produits',
    icon: Car,
    children: [
      { name: 'Auto', href: '/auto', icon: Car, permission: 'view:products' },
      { name: 'Voyage', href: '/voyage', icon: Plane, permission: 'view:products' },
      { name: 'MRH', href: '/mrh', icon: Home, permission: 'view:products' },
      { name: 'IAC', href: '/iac', icon: ShieldCheck, permission: 'view:products' },
      { name: 'Easy Santé', href: '/easy-sante', icon: HeartPulse, permission: 'view:products' },
    ],
  },
  {
    name: 'Performance',
    icon: BarChart3,
    children: [
      { name: 'Codes Agents', href: '/codes-agents', icon: Tag, permission: 'view:codes_agents' },
      { name: 'Suivi Agents', href: '/codes-agents/suivi', icon: BarChart3, permission: 'view:codes_agents' },
    ],
  },
  {
    name: 'Administration',
    icon: Settings,
    children: [
      { name: 'Logs', href: '/logs', icon: ClipboardList, permission: 'view:logs' },
      { name: 'Utilisateurs', href: '/admin/users', icon: UserCog, permission: 'manage:users' },
      { name: 'Whitelist IP', href: '/admin/ip-whitelist', icon: Settings, permission: 'manage:settings' },
    ],
  },
]

function isPathActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()
  const { can, isLoading } = usePermissions()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const canViewDashboard = can(dashboardItem.permission)
  const navigationGroups = useMemo(
    () =>
      groupedNavigation
        .map((group) => ({
          ...group,
          children: group.children.filter((child) => can(child.permission)),
        }))
        .filter((group) => group.children.length > 0),
    [can]
  )

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      let hasChanges = false
      navigationGroups.forEach((group) => {
        const hasActiveChild = group.children.some((item) => isPathActive(pathname, item.href))
        if (hasActiveChild) {
          if (next[group.name] !== true) {
            next[group.name] = true
            hasChanges = true
          }
        } else if (!(group.name in next)) {
          next[group.name] = false
          hasChanges = true
        }
      })
      return hasChanges ? next : prev
    })
  }, [navigationGroups, pathname])

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
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-1">
            {canViewDashboard && (
              <Link
                href={dashboardItem.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isPathActive(pathname, dashboardItem.href)
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isPathActive(pathname, dashboardItem.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80'
                  )}
                >
                  <dashboardItem.icon className="h-4 w-4" />
                </div>
                <span>{dashboardItem.name}</span>
                {isPathActive(pathname, dashboardItem.href) && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )}

            {navigationGroups.map((group) => {
              const isGroupOpen = !!openGroups[group.name]
              const hasActiveChild = group.children.some((item) => isPathActive(pathname, item.href))

              return (
                <div key={group.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group.name]: !prev[group.name],
                      }))
                    }
                    className={cn(
                      'w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      hasActiveChild
                        ? 'bg-secondary/80 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                        hasActiveChild
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80'
                      )}
                    >
                      <group.icon className="h-4 w-4" />
                    </div>
                    <span>{group.name}</span>
                    <ChevronDown
                      className={cn(
                        'ml-auto h-4 w-4 transition-transform',
                        isGroupOpen ? 'rotate-180' : 'rotate-0'
                      )}
                    />
                  </button>

                  {isGroupOpen && (
                    <div className="ml-11 space-y-1 border-l pl-3">
                      {group.children.map((item) => {
                        const isActive = isPathActive(pathname, item.href)
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-secondary text-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t">
        <div className="space-y-1 text-center">
          <p className="text-[10px] text-muted-foreground tracking-wide">v2.0.0</p>
          <p className="text-[10px] text-muted-foreground">Powered by Nodes Technology</p>
        </div>
      </div>
    </div>
  )
}
