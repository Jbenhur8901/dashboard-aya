'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      // Public pages that don't require authentication
      const publicPages = ['/login', '/signin']
      const isPublicPage = publicPages.includes(pathname)

      // If not authenticated and not on a public page, redirect to login
      if (!user && !isPublicPage) {
        router.push('/login')
      }
      // If authenticated and on login or register page, redirect to home
      else if (user && isPublicPage) {
        router.push('/')
      }
    }
  }, [user, loading, pathname, router])

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
