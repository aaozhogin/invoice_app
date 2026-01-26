/**
 * Permission and authorization utilities
 * These are used across the application for consistent permission checking
 */

export interface PermissionDef {
  resource: string
  action: string
}

/**
 * Client-side permission matrix
 * NOTE: Always verify permissions on the server/database level
 * This is only for UI hints and preventing unnecessary API calls
 */
export const ROLE_PERMISSIONS = {
  superadmin: {
    users: ['create', 'read', 'update', 'delete', 'manage_roles'],
    shifts: ['create', 'read', 'update', 'delete', 'bulk_assign'],
    invoices: ['create', 'read', 'update', 'delete', 'generate'],
    reports: ['read', 'export'],
    carers: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update', 'delete'],
    organizations: ['create', 'read', 'update', 'delete', 'manage'],
  },
  administrator: {
    users: ['create', 'read', 'update', 'delete', 'manage_roles'],
    shifts: ['create', 'read', 'update', 'delete', 'bulk_assign'],
    invoices: ['create', 'read', 'update', 'delete', 'generate'],
    reports: ['read', 'export'],
    carers: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update', 'delete'],
  },
  service_provider: {
    shifts: ['create', 'read', 'update', 'bulk_assign'],
    invoices: ['create', 'read', 'generate'],
    reports: ['read', 'export'],
    carers: ['create', 'read', 'update'],
    clients: ['create', 'read', 'update'],
  },
  carer: {
    shifts: ['read', 'update'],
    reports: ['read'],
  },
  customer: {
    reports: ['read'],
    clients: ['read'],
  },
  support_coordinator: {
    reports: ['read', 'export'],
  },
} as const

export type UserRole = keyof typeof ROLE_PERMISSIONS

/**
 * Check if a role has a specific permission
 */
export const roleHasPermission = (
  role: UserRole,
  resource: string,
  action: string
): boolean => {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false

  const resourcePerms = (permissions as any)[resource] || []
  return resourcePerms.includes(action)
}

/**
 * Check if a role has any of the given permissions
 */
export const roleHasAnyPermission = (
  role: UserRole,
  checks: PermissionDef[]
): boolean => {
  return checks.some((check) => roleHasPermission(role, check.resource, check.action))
}

/**
 * Check if a role has all of the given permissions
 */
export const roleHasAllPermissions = (
  role: UserRole,
  checks: PermissionDef[]
): boolean => {
  return checks.every((check) => roleHasPermission(role, check.resource, check.action))
}

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role: UserRole): Record<string, readonly string[]> => {
  return ROLE_PERMISSIONS[role] || {}
}

/**
 * Check if user can perform a sensitive operation
 * Should always verify on the server
 */
export const canPerformSensitiveAction = (
  role: UserRole,
  action: 'create_user' | 'delete_user' | 'change_role' | 'manage_org'
): boolean => {
  const sensitiveActions: Record<string, UserRole[]> = {
    create_user: ['superadmin', 'administrator'],
    delete_user: ['superadmin', 'administrator'],
    change_role: ['superadmin', 'administrator'],
    manage_org: ['superadmin'],
  }

  return sensitiveActions[action]?.includes(role) || false
}

/**
 * Format role for display
 */
export const formatRole = (role: UserRole): string => {
  const roleLabels: Record<UserRole, string> = {
    superadmin: 'Super Admin',
    administrator: 'Administrator',
    service_provider: 'Service Provider',
    carer: 'Carer',
    customer: 'Customer',
    support_coordinator: 'Support Coordinator',
  }

  return roleLabels[role] || role
}

/**
 * Get role description
 */
export const getRoleDescription = (role: UserRole): string => {
  const descriptions: Record<UserRole, string> = {
    superadmin: 'Full access to entire system. Only user with email aaozhogin@gmail.com.',
    administrator:
      'Organization administrator. Full control within their organization. Can manage users, shifts, invoices, reports.',
    service_provider:
      'Manager of the organization. Can create/edit shifts, assign shifts, generate invoices, create carers/customers, manage line items.',
    carer: 'Can view their own shifts and other carers\' shifts (greyed out). Access to iOS/Android app for shift logging.',
    customer:
      'Access to customer-specific reports and approved carers roster within their organization.',
    support_coordinator: 'Access to reports and analytics.',
  }

  return descriptions[role] || ''
}

/**
 * Get role color for UI (tailwind classes)
 */
export const getRoleColor = (
  role: UserRole
): { bg: string; text: string; border: string } => {
  const colors: Record<UserRole, { bg: string; text: string; border: string }> = {
    superadmin: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    administrator: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    service_provider: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    carer: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    customer: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    support_coordinator: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  }

  return colors[role] || colors.carer
}
