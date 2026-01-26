/**
 * Protected route wrapper component
 * Ensures only authorized users can access certain pages
 */

'use client'

import React from 'react'
import { useAuth } from '@/lib/auth-context'
import { UserRole } from '@/lib/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  requiredPermission?: { resource: string; action: string }
  fallback?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredPermission,
  fallback,
}) => {
  const { user, loading, hasPermission, hasAnyRole } = useAuth()

  // Check authorization
  let isAuthorized = true

  if (requiredRoles) {
    isAuthorized = hasAnyRole(requiredRoles)
  }

  if (requiredPermission && isAuthorized) {
    isAuthorized = hasPermission(requiredPermission.resource, requiredPermission.action)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

/**
 * Show content based on authorization
 */
interface ConditionalRenderProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  requiredPermission?: { resource: string; action: string }
  fallback?: React.ReactNode
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  requiredRoles,
  requiredPermission,
  fallback,
}) => {
  const { hasPermission, hasAnyRole } = useAuth()

  let isAuthorized = true

  if (requiredRoles) {
    isAuthorized = hasAnyRole(requiredRoles)
  }

  if (requiredPermission && isAuthorized) {
    isAuthorized = hasPermission(requiredPermission.resource, requiredPermission.action)
  }

  if (!isAuthorized) {
    return fallback || null
  }

  return <>{children}</>
}
