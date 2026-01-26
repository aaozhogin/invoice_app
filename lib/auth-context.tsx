import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export type UserRole = 'superadmin' | 'administrator' | 'service_provider' | 'carer' | 'customer' | 'support_coordinator'

export interface AuthUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  org_id?: string
  role: UserRole
  is_active: boolean
  created_at: string
}

interface PermissionCheck {
  resource: string
  action: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  // Role checks
  isSuperadmin: () => boolean
  isAdministrator: () => boolean
  isServiceProvider: () => boolean
  isCarer: () => boolean
  isCustomer: () => boolean
  isSupportCoordinator: () => boolean
  // Permission checks
  hasPermission: (resource: string, action: string) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  // Organization
  currentOrg: string | null
  canManageUsers: () => boolean
  canManageShifts: () => boolean
  canCreateInvoices: () => boolean
  canViewReports: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (session?.user) {
          // Fetch user details from our users table
          const { data, error: fetchError } = await supabase
            .from('users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              org_id,
              is_active,
              created_at,
              user_roles:user_role_id (
                id,
                role_type
              )
            `)
            .eq('id', session.user.id)
            .single()

          if (fetchError) {
            // User exists in auth but not in users table yet
            setUser(null)
            setError('User profile not found. Please complete your setup.')
          } else if (data) {
            setUser({
              id: data.id,
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
              org_id: data.org_id,
              role: (data.user_roles as any)?.role_type || 'carer',
              is_active: data.is_active,
              created_at: data.created_at,
            })
            setError(null)
          }
        } else {
          setUser(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication error')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              org_id,
              is_active,
              created_at,
              user_roles:user_role_id (
                id,
                role_type
              )
            `)
            .eq('id', session.user.id)
            .single()

          if (data) {
            setUser({
              id: data.id,
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
              org_id: data.org_id,
              role: (data.user_roles as any)?.role_type || 'carer',
              is_active: data.is_active,
              created_at: data.created_at,
            })
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase])

  // Role check functions
  const isSuperadmin = () => user?.role === 'superadmin'
  const isAdministrator = () => user?.role === 'administrator'
  const isServiceProvider = () => user?.role === 'service_provider'
  const isCarer = () => user?.role === 'carer'
  const isCustomer = () => user?.role === 'customer'
  const isSupportCoordinator = () => user?.role === 'support_coordinator'

  // Check if user has any of the given roles
  const hasAnyRole = (roles: UserRole[]) => user ? roles.includes(user.role) : false

  // Permission check - this should be verified against the database
  // For now, we'll use role-based checks (client-side only - not secure for sensitive operations)
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false
    if (user.role === 'superadmin') return true

    // Role-based permission matrix (client-side only - verify on server)
    const permissions: Record<UserRole, Record<string, string[]>> = {
      superadmin: {
        '*': ['*'], // All permissions
      },
      administrator: {
        users: ['create', 'read', 'update', 'delete'],
        shifts: ['create', 'read', 'update', 'delete', 'bulk_assign'],
        invoices: ['create', 'read', 'update', 'delete', 'generate'],
        reports: ['read', 'export'],
        carers: ['create', 'read', 'update', 'delete'],
        clients: ['create', 'read', 'update', 'delete'],
        organizations: ['read'],
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
    }

    const rolePerms = permissions[user.role]
    if (!rolePerms) return false

    // Check if permission exists for resource
    const resourcePerms = rolePerms[resource] || []
    return resourcePerms.includes(action) || resourcePerms.includes('*')
  }

  // Feature-specific shortcuts
  const canManageUsers = () => hasPermission('users', 'manage_roles') || isSuperadmin()
  const canManageShifts = () => hasAnyRole(['administrator', 'service_provider'])
  const canCreateInvoices = () => hasPermission('invoices', 'create')
  const canViewReports = () => hasPermission('reports', 'read')

  const value: AuthContextType = {
    user,
    loading,
    error,
    isSuperadmin,
    isAdministrator,
    isServiceProvider,
    isCarer,
    isCustomer,
    isSupportCoordinator,
    hasPermission,
    hasAnyRole,
    currentOrg: user?.org_id || null,
    canManageUsers,
    canManageShifts,
    canCreateInvoices,
    canViewReports,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
