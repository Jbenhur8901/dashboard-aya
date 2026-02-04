export type UserRole = 'user' | 'admin' | 'admin_fin' | 'superadmin'

export type Permission =
  | 'view:dashboard'
  | 'view:souscriptions'
  | 'edit:souscriptions'
  | 'delete:souscriptions'
  | 'view:transactions'
  | 'edit:transactions'
  | 'pay:transactions'
  | 'view:codes_agents'
  | 'edit:codes_agents'
  | 'view:products'
  | 'view:clients'
  | 'edit:clients'
  | 'view:documents'
  | 'manage:users'
  | 'manage:settings'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    'view:dashboard',
    'view:souscriptions',
    'edit:souscriptions',
    'delete:souscriptions',
    'view:transactions',
    'edit:transactions',
    'pay:transactions',
    'view:codes_agents',
    'edit:codes_agents',
    'view:products',
    'view:clients',
    'edit:clients',
    'view:documents',
    'manage:users',
    'manage:settings',
  ],
  admin: [
    'view:dashboard',
    'view:souscriptions',
    'edit:souscriptions',
    'view:transactions',
    'edit:transactions',
    'view:codes_agents',
    'edit:codes_agents',
    'view:products',
    'view:clients',
    'edit:clients',
    'view:documents',
    'manage:users',
  ],
  admin_fin: [
    'view:dashboard',
    'view:souscriptions',
    'view:transactions',
    'edit:transactions',
    'pay:transactions',
    'view:codes_agents',
    'view:products',
    'view:clients',
    'view:documents',
  ],
  user: [
    'view:souscriptions',
  ],
}

export function hasPermission(role: UserRole | string | null, permission: Permission): boolean {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role as UserRole]
  if (!permissions) return false
  return permissions.includes(permission)
}

export function canAccessRoute(role: UserRole | string | null, route: string): boolean {
  if (!role) return false

  // User role can only access /souscriptions
  if (role === 'user') {
    return route === '/souscriptions' || route.startsWith('/souscriptions/')
  }

  const routePermissions: Record<string, Permission> = {
    '/admin/users': 'manage:users',
    '/admin/ip-whitelist': 'manage:settings',
  }

  const required = routePermissions[route]
  if (!required) return true

  return hasPermission(role, required)
}

export function getNavigationForRole(role: UserRole | string | null): string[] {
  if (!role) return []

  if (role === 'user') {
    return ['/souscriptions']
  }

  // Admin, admin_fin, and superadmin get full navigation
  return [
    '/',
    '/souscriptions',
    '/auto',
    '/voyage',
    '/mrh',
    '/iac',
    '/clients',
    '/transactions',
    '/codes-agents',
    '/codes-agents/suivi',
    '/documents',
    '/admin/users',
    '/admin/ip-whitelist',
  ]
}
