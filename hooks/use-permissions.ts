'use client'

import { useMemo } from 'react'
import { useUserProfile } from './use-user-profile'
import { Permission, hasPermission, canAccessRoute, getNavigationForRole, UserRole } from '@/lib/permissions'

export function usePermissions() {
  const { data: profile, isLoading } = useUserProfile()

  const role = profile?.role as UserRole | null

  const can = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!profile?.approved || profile?.disabled) return false
      return hasPermission(role, permission)
    }
  }, [role, profile?.approved, profile?.disabled])

  const canAccess = useMemo(() => {
    return (route: string): boolean => {
      if (!profile?.approved || profile?.disabled) return false
      return canAccessRoute(role, route)
    }
  }, [role, profile?.approved, profile?.disabled])

  const allowedNavigation = useMemo(() => {
    if (!profile?.approved || profile?.disabled) return []
    return getNavigationForRole(role)
  }, [role, profile?.approved, profile?.disabled])

  return {
    can,
    canAccess,
    allowedNavigation,
    role,
    isLoading,
    isUser: role === 'user',
    isAdmin: role === 'admin' || role === 'superadmin',
    isAdminFin: role === 'admin_fin' || role === 'superadmin',
    isSuperAdmin: role === 'superadmin',
  }
}
