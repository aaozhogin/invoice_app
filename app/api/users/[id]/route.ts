/**
 * API route for updating a specific user
 * Path: /api/users/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeRequest,
  authorizeWithRole,
  authorizeWithOrg,
  createAuthorizedSupabaseClient,
  logAudit,
} from '@/lib/server-auth'

interface Params {
  params: {
    id: string
  }
}

/**
 * GET /api/users/[id]
 * Get a specific user
 * Requires: authenticated user who is superadmin, admin, or same user
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { authorized, user, response } = await authorizeRequest(request)

  if (!authorized || !user) {
    return response
  }

  try {
    const supabase = createAuthorizedSupabaseClient(request)
    const userId = params.id

    // Users can view themselves, admins can view users in their org
    const { data: targetUser } = await supabase
      .from('users')
      .select('org_id, user_roles:user_role_id (role_type)')
      .eq('id', userId)
      .single()

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Permission check
    if (
      user.id !== userId &&
      user.role === 'superadmin' &&
      user.org_id !== targetUser.org_id
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access users outside your organization' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        org_id,
        is_active,
        created_at,
        last_login_at,
        user_roles:user_role_id (
          role_type,
          id
        )
      `
      )
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/[id]
 * Update a user
 * Requires: superadmin, administrator, or the user themselves (limited fields)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const { authorized, user, response } = await authorizeRequest(request)

  if (!authorized || !user) {
    return response
  }

  try {
    const supabase = createAuthorizedSupabaseClient(request)
    const userId = params.id
    const body = await request.json()

    // Fetch target user
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Permission checks
    const isOwnProfile = user.id === userId
    const isAdmin = ['superadmin', 'administrator'].includes(user.role)
    const isSameOrg = user.org_id === targetUser.org_id
    const isSuperadmin = user.role === 'superadmin'

    // Non-admin users can only update themselves
    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot update other users' },
        { status: 403 }
      )
    }

    // Non-superadmin admins can only update users in their org
    if (!isSuperadmin && isAdmin && !isSameOrg) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot update users outside your organization' },
        { status: 403 }
      )
    }

    // Separate updatable fields by role
    let updateData: Record<string, any> = {}

    if (isOwnProfile) {
      // Users can update their own profile
      const allowedFields = ['first_name', 'last_name']
      allowedFields.forEach((field) => {
        if (field in body) {
          updateData[field] = body[field]
        }
      })
    } else if (isAdmin) {
      // Admins can update more fields
      const allowedFields = ['first_name', 'last_name', 'is_active']
      allowedFields.forEach((field) => {
        if (field in body) {
          updateData[field] = body[field]
        }
      })

      // Only superadmin can change roles
      if (isSuperadmin && body.user_role_id) {
        updateData.user_role_id = body.user_role_id
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Perform update
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        org_id,
        is_active,
        created_at,
        user_roles:user_role_id (
          role_type,
          id
        )
      `
      )
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Log audit
    await logAudit(
      supabase,
      user.id,
      'update',
      'user',
      userId,
      updateData
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user
 * Requires: superadmin only
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { authorized, user, response } = await authorizeWithRole(request, 'superadmin')

  if (!authorized || !user) {
    return response
  }

  try {
    const supabase = createAuthorizedSupabaseClient(request)
    const userId = params.id

    // Prevent deleting yourself
    if (user.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Auth deletion error:', authError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    // Log audit (user deletion cascades and removes the public.users record)
    await logAudit(
      supabase,
      user.id,
      'delete',
      'user',
      userId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
