/**
 * Server-side authorization utilities for Next.js API routes
 * Always use these for sensitive operations, not client-side checks
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthorizedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    org_id?: string
    role: string
  }
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.slice(7)

    // Verify token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return null
    }

    // Get user details from public.users table
    const { data, error: fetchError } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        org_id,
        user_roles:user_role_id (
          role_type
        )
      `
      )
      .eq('id', user.id)
      .single()

    if (fetchError || !data) {
      return null
    }

    return {
      id: data.id,
      email: data.email,
      org_id: data.org_id,
      role: (data.user_roles as any)?.role_type || 'carer',
    }
  } catch (error) {
    console.error('Error getting auth user:', error)
    return null
  }
}

/**
 * Check if user has a specific role
 */
export function hasRole(
  user: { role: string } | null,
  role: string | string[]
): boolean {
  if (!user) return false

  const roles = Array.isArray(role) ? role : [role]
  return roles.includes(user.role)
}

/**
 * Check if user is superadmin
 */
export function isSuperadmin(user: { role: string } | null): boolean {
  return hasRole(user, 'superadmin')
}

/**
 * Check if user is administrator
 */
export function isAdministrator(user: { role: string } | null): boolean {
  return hasRole(user, 'administrator')
}

/**
 * Authorize request - check if user exists and is authenticated
 */
export async function authorizeRequest(
  request: NextRequest
): Promise<{
  authorized: boolean
  user: AuthorizedRequest['user'] | null
  response?: NextResponse
}> {
  const user = await getAuthUser(request)

  if (!user) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  return {
    authorized: true,
    user,
  }
}

/**
 * Authorize request with role check
 */
export async function authorizeWithRole(
  request: NextRequest,
  requiredRoles: string | string[]
): Promise<{
  authorized: boolean
  user: AuthorizedRequest['user'] | null
  response?: NextResponse
}> {
  const user = await getAuthUser(request)

  if (!user) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  if (!roles.includes(user.role)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user,
  }
}

/**
 * Authorize request with org check
 * Ensures user can only access resources within their organization
 */
export async function authorizeWithOrg(
  request: NextRequest,
  requiredOrg?: string | null
): Promise<{
  authorized: boolean
  user: AuthorizedRequest['user'] | null
  response?: NextResponse
}> {
  const user = await getAuthUser(request)

  if (!user) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  // Superadmin can access anything
  if (user.role === 'superadmin') {
    return {
      authorized: true,
      user,
    }
  }

  // Other roles must match org
  if (requiredOrg && user.org_id !== requiredOrg) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Forbidden: Access denied to this organization' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user,
  }
}

/**
 * Create authorized Supabase client for API route
 */
export function createAuthorizedSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    }
  )
}

/**
 * Log audit event
 */
export async function logAudit(
  supabase: any,
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  changes?: Record<string, any>
) {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes: changes || null,
      ip_address: null, // Could be extracted from request headers
    })
  } catch (error) {
    console.error('Error logging audit:', error)
  }
}
