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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Souscriptions',
    href: '/souscriptions',
    icon: FileText,
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: CreditCard,
  },
  {
    name: 'Codes Promo',
    href: '/codes-promo',
    icon: Tag,
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FolderOpen,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-20 items-center justify-center border-b px-6">
        <Image
          src="https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/Capture2.jpeg"
          alt="Logo"
          width={64}
          height={64}
          className="rounded"
        />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-center mb-2">
          <Image
            src="https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/Logo%20NSIA%20Assurances.png"
            alt="NSIA Assurances"
            width={100}
            height={32}
            className="object-contain"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Powered by Aya v1.0.0
        </p>
      </div>
    </div>
  )
}
