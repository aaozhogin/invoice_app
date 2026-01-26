const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function setup() {
  try {
    console.log('🔄 Setting up superadmin...\n');

    // Check if internal org exists
    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'internal')
      .single();

    if (orgError || !org) {
      console.log('📝 Creating internal organization...');
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Internal',
          slug: 'internal',
          description: 'Internal organization for superadmin and system',
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw new Error(`Failed to create org: ${createError.message}`);
      if (!newOrg) throw new Error('Failed to create organization');

      org = newOrg;
      console.log(`✓ Created internal organization: ${newOrg.id}\n`);
    } else {
      console.log(`✓ Internal organization exists: ${org.id}\n`);
    }

    // Get auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const superadminUser = authUsers?.users.find((u) => u.email === 'aaozhogin@gmail.com');

    if (!superadminUser) {
      throw new Error('Superadmin user not found. Create it in Supabase first.');
    }

    console.log(`✓ Found superadmin user: ${superadminUser.id}`);

    // Get superadmin role
    let { data: role } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', 'superadmin')
      .is('org_id', null)
      .single();

    if (!role) {
      console.log('📝 Creating superadmin role...');
      const { data: newRole, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          role_type: 'superadmin',
          org_id: null,
          description: 'Full access to entire system',
        })
        .select()
        .single();

      if (roleError) throw new Error(`Failed to create role: ${roleError.message}`);
      if (!newRole) throw new Error('Failed to create role');

      role = newRole;
      console.log(`✓ Created superadmin role: ${newRole.id}\n`);
    } else {
      console.log(`✓ Superadmin role exists: ${role.id}\n`);
    }

    if (!org || !role) {
      throw new Error('Organization or role not properly initialized');
    }

    // Link user to users table
    console.log('📝 Linking user to users table...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', superadminUser.id)
      .single();

    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
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
        .select()
        .single();

      if (insertError) throw new Error(`Failed to insert user: ${insertError.message}`);

      console.log(`✓ User linked successfully\n`);
    } else {
      // Update existing user with superadmin role
      console.log('📝 Updating existing user with superadmin role...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          user_role_id: role.id,
          org_id: org.id,
        })
        .eq('id', superadminUser.id);

      if (updateError) throw new Error(`Failed to update user: ${updateError.message}`);
      console.log(`✓ User updated successfully\n`);
    }

    console.log('✅ Superadmin setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setup();
