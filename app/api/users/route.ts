/**
 * Example API route for getting users within an organization
 * Path: /api/users
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeWithRole,
  authorizeWithOrg,
  createAuthorizedSupabaseClient,
  logAudit,
} from '@/lib/server-auth'

/**
 * GET /api/users
 * Get users in the current user's organization
 * Requires: authenticated user, admin or service provider role
 */
export async function GET(request: NextRequest) {
  // Authorize with role
  const { authorized, user, response } = await authorizeWithRole(request, [
    'superadmin',
    'administrator',
    'service_provider',
  ])

  if (!authorized || !user) {
    return response
  }

  try {
    const supabase = createAuthorizedSupabaseClient(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id') || user.org_id
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check organization access
    const orgAuth = await authorizeWithOrg(request, orgId)
    if (!orgAuth.authorized) {
      return orgAuth.response
    }

    // Fetch users
    const { data, error, count } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        user_roles:user_role_id (
          role_type,
          id
        )
      `,
        { count: 'exact' }
      )
      .eq('org_id', orgId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create a new user
 * Requires: superadmin or administrator role
 */
export async function POST(request: NextRequest) {
  // Authorize with admin role
  const { authorized, user, response } = await authorizeWithRole(request, [
    'superadmin',
    'administrator',
  ])

  if (!authorized || !user) {
    return response
  }

  try {
    const supabase = createAuthorizedSupabaseClient(request)
    const body = await request.json()

    const {
      email,
      password,
      first_name,
      last_name,
      role_type,
      org_id = user.org_id,
    } = body

    // Validate required fields
    if (!email || !password || !role_type) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, role_type' },
        { status: 400 }
      )
    }

    // Non-superadmin users can only create users in their org
    if (user.role !== 'superadmin' && org_id !== user.org_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot create users outside your organization' },
        { status: 403 }
      )
    }

    // Get the role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', role_type)
      .eq('org_id', org_id)
      .single()

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: 'Invalid role for this organization' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      )
    }

    // Create user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        org_id,
        user_role_id: roleData.id,
        is_active: true,
      })
      .select()
      .single()

    if (userError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      console.error('User creation error:', userError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Log audit
    await logAudit(
      supabase,
      user.id,
      'create',
      'user',
      userData.id,
      { email, role_type, org_id }
    )

    return NextResponse.json(userData, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
