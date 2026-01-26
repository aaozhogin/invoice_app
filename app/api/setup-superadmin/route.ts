import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Setup superadmin endpoint
 * GET/POST /api/setup-superadmin
 */
export async function GET(request: NextRequest) {
  return setupSuperadmin()
}

export async function POST(request: NextRequest) {
  return setupSuperadmin()
}

async function setupSuperadmin() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Check if internal org exists
    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'internal')
      .single()

    if (orgError || !org) {
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Internal',
          slug: 'internal',
          description: 'Internal organization for superadmin and system',
          is_active: true,
        })
        .select()
        .single()

      if (createError) throw new Error(`Failed to create org: ${createError.message}`)
      if (!newOrg) throw new Error('Failed to create organization')
      org = newOrg
    }

    // Get auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const superadminUser = authUsers?.users.find((u) => u.email === 'aaozhogin@gmail.com')

    if (!superadminUser) {
      throw new Error('Superadmin user not found. Create it in Supabase first.')
    }

    // Get superadmin role
    let { data: role } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', 'superadmin')
      .is('org_id', null)
      .single()

    if (!role) {
      const { data: newRole, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          role_type: 'superadmin',
          org_id: null,
          description: 'Full access to entire system',
        })
        .select()
        .single()

      if (roleError) throw new Error(`Failed to create role: ${roleError.message}`)
      if (!newRole) throw new Error('Failed to create role')
      role = newRole
    }

    if (!org || !role) {
      throw new Error('Organization or role not properly initialized')
    }

    // Link user to users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', superadminUser.id)
      .single()

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: superadminUser.id,
          email: superadminUser.email,
          first_name: 'Admin',
          last_name: 'User',
          org_id: org.id,
          user_role_id: role.id,
          is_active: true,
        })

      if (insertError) throw new Error(`Failed to insert user: ${insertError.message}`)
    } else {
      // Update existing user with superadmin role
      const { error: updateError } = await supabase
        .from('users')
        .update({
          user_role_id: role.id,
          org_id: org.id,
        })
        .eq('id', superadminUser.id)

      if (updateError) throw new Error(`Failed to update user: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Superadmin setup complete!',
      userId: superadminUser.id,
      email: superadminUser.email,
    })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    )
  }
}
