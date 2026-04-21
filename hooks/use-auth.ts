'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // Update last login timestamp (best-effort)
    if (data.user) {
      supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error('Error updating last_login_at:', updateError)
          }
        })
    }

    // Enforce MFA after login before reaching the dashboard
    try {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalError) throw aalError

      const hasAnyFactor =
        factorsData.totp.length > 0 ||
        factorsData.phone.length > 0 ||
        factorsData.webauthn.length > 0

      if (!hasAnyFactor) {
        router.replace('/mfa/setup')
      } else if (aalData.currentLevel !== 'aal2') {
        router.replace('/mfa/verify')
      } else {
        router.replace('/')
      }
    } catch (mfaError) {
      console.error('Error checking MFA after login:', mfaError)
      router.replace('/mfa/setup')
    }
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Force a hard navigation to ensure auth state is cleared
    window.location.href = '/login'
  }

  const signUp = async (email: string, password: string, userInfo?: {
    username?: string
    full_name?: string
    last_name?: string
    fonction?: string
    departement?: string
    phone?: string
  }) => {
    // Call server-side API to handle signup with service role
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: userInfo?.full_name,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erreur lors de l\'inscription')
    }

    const data = await response.json()

    // Auto-login after signup
    if (data.success) {
      window.location.href = '/'
    }
    return data
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    signUp,
  }
}
