import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
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

    // Get auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const user = authUsers?.users.find((u) => u.email === 'aaozhogin@gmail.com')

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user from users table
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, org_id, is_active, user_role_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'User not in users table', details: userError }, { status: 500 })
    }

    // Get role
    let role = null
    if (userRow?.user_role_id) {
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', userRow.user_role_id)
        .single()
      role = roleRow
    }

    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email,
      },
      userRow,
      role,
      isSuperadmin: role?.role_type === 'superadmin',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
