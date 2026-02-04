'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { AuthGuard } from './auth-guard'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signin' ||
    pathname?.startsWith('/mfa') ||
    pathname === '/ip-blocked'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background app-bg px-6 py-6 sm:px-8">
            <div className="animate-fade-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
