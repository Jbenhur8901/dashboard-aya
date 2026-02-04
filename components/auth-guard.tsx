'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useUserProfile } from '@/hooks/use-user-profile'
import { usePermissions } from '@/hooks/use-permissions'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const { canAccess } = usePermissions()
  const [mfaChecked, setMfaChecked] = useState(false)
  const [mfaRoute, setMfaRoute] = useState<'/mfa/setup' | '/mfa/verify' | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }

    const checkMfa = async () => {
      try {
        const { data: factorsData, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aalError) throw aalError

        const hasAnyFactor =
          factorsData.totp.length > 0 ||
          factorsData.phone.length > 0 ||
          factorsData.webauthn.length > 0
        const aal = aalData.currentLevel

        if (!hasAnyFactor) {
          setMfaRoute('/mfa/setup')
        } else if (aal !== 'aal2') {
          setMfaRoute('/mfa/verify')
        } else {
          setMfaRoute(null)
        }
      } catch {
        setMfaRoute('/mfa/setup')
      } finally {
        setMfaChecked(true)
      }
    }

    checkMfa()
  }, [loading, user, router])

  useEffect(() => {
    if (!mfaChecked) return
    if (mfaRoute && pathname !== mfaRoute) {
      router.replace(mfaRoute)
    }
  }, [mfaChecked, mfaRoute, pathname, router])

  useEffect(() => {
    if (!profile || mfaRoute) return
    if (!canAccess(pathname)) {
      router.replace('/souscriptions')
    }
  }, [profile, mfaRoute, pathname, canAccess, router])

  if (loading || profileLoading || !mfaChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  if (profile && (!profile.approved || profile.disabled)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Accès restreint</h1>
          <p className="text-muted-foreground">
            Votre compte est en attente d&apos;approbation ou désactivé.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
