'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './use-auth'

export interface UserProfile {
  id: string
  email: string
  username: string
  full_name: string | null
  last_name: string | null
  fonction: string | null
  departement: string | null
  phone: string | null
  role: string | null
  org_id: string | null
  approved: boolean
  disabled: boolean
  last_login_at: string | null
  mfa_enabled: boolean | null
  mfa_verified_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
}

export function useUserProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

export function useIsAdmin() {
  const { data: profile, isLoading } = useUserProfile()

  const isApprovedAndActive = profile?.approved && !profile?.disabled

  return {
    isAdmin: (profile?.role === 'admin' || profile?.role === 'superadmin') && isApprovedAndActive,
    isAdminFin: (profile?.role === 'admin_fin' || profile?.role === 'superadmin') && isApprovedAndActive,
    isSuperAdmin: profile?.role === 'superadmin' && isApprovedAndActive,
    isUser: profile?.role === 'user' && isApprovedAndActive,
    role: profile?.role,
    isLoading,
  }
}
