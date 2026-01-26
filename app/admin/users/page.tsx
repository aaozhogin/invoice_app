'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/app/lib/AuthContext'
import { getSupabaseClient } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type UserRole = 'superadmin' | 'administrator' | 'service_provider' | 'carer' | 'customer' | 'support_coordinator'

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  created_at: string
  org_id?: string
  user_role_id?: string
  role_type?: UserRole
}

interface NewUser {
  email: string
  password: string
  first_name: string
  last_name: string
  role: UserRole
}

export default function UserManagementPage() {
  const { userProfile, isSuperadmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'carer'
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Redirect if not superadmin
  useEffect(() => {
    if (!authLoading && !isSuperadmin()) {
      router.push('/')
    }
  }, [authLoading, isSuperadmin, router])

  useEffect(() => {
    if (isSuperadmin()) {
      fetchUsers()
    }
  }, [isSuperadmin])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = getSupabaseClient()

      // Fetch users without relying on PostgREST relationship cache
      const { data: userRows, error: fetchError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, is_active, created_at, org_id, user_role_id')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Resolve role types separately to avoid missing FK relationships in the cache
      const roleIds = Array.from(
        new Set((userRows || []).map((u) => u.user_role_id).filter(Boolean))
      ) as string[]

      let roleMap = new Map<string, UserRole>()
      if (roleIds.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('id, role_type')
          .in('id', roleIds)

        if (rolesError) throw rolesError
        rolesData?.forEach((r) => {
          if (r.id && r.role_type) {
            roleMap.set(r.id, r.role_type as UserRole)
          }
        })
      }

      const hydrated = (userRows || []).map((u) => ({
        ...u,
        role_type: (u.user_role_id && roleMap.get(u.user_role_id)) || 'carer',
      }))

      setUsers(hydrated)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Error fetching users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    setCreateSuccess(false)

    try {
      const supabase = getSupabaseClient()

      // Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            first_name: newUser.first_name,
            last_name: newUser.last_name
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create auth user')

      // Get the role ID
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role_type', newUser.role)
        .limit(1)
        .single()

      if (roleError) throw roleError
      if (!roleData) throw new Error('Role not found')

      // Create user in public.users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          org_id: userProfile?.org_id || null,
          user_role_id: roleData.id,
          is_active: true
        })

      if (userError) throw userError

      setCreateSuccess(true)
      setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'carer' })
      setTimeout(() => {
        setShowCreateForm(false)
        setCreateSuccess(false)
        fetchUsers()
      }, 1500)
    } catch (err) {
      console.error('Error creating user:', err)
      setCreateError(err instanceof Error ? err.message : 'Error creating user')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error
      alert('Password reset email sent!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error sending reset email')
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating user')
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) return

    try {
      const supabase = getSupabaseClient()
      
      // Delete from public.users
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error
      
      alert('User deleted successfully')
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting user')
    }
  }

  const filteredUsers = users.filter((u) =>
    `${u.first_name || ''} ${u.last_name || ''} ${u.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  if (authLoading || !isSuperadmin()) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>User Management</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Manage all users in the system • Total: {users.length} users
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '12px 24px',
            background: showCreateForm ? '#6b7280' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid var(--border)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Create New User</h2>
          
          {createError && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {createError}
            </div>
          )}

          {createSuccess && (
            <div style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              User created successfully!
            </div>
          )}

          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Email *
              </label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Role *
              </label>
              <select
                required
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="carer">Carer</option>
                <option value="administrator">Administrator</option>
                <option value="service_provider">Service Provider</option>
                <option value="customer">Customer</option>
                <option value="support_coordinator">Support Coordinator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={createLoading}
              style={{
                padding: '12px 24px',
                background: createLoading ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: createLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {createLoading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="🔍 Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '12px',
        overflow: 'auto',
        border: '1px solid var(--border)'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
            {searchTerm ? 'No users match your search' : 'No users found - tables may not be created yet'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)' }}>Name</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)' }}>Email</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)' }}>Role</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)' }}>Created</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--muted)', fontSize: '14px' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: user.role_type === 'superadmin' ? '#fef3c7' : '#dbeafe',
                      color: user.role_type === 'superadmin' ? '#92400e' : '#1e40af',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {user.role_type || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: user.is_active ? '#d1fae5' : '#fee2e2',
                      color: user.is_active ? '#065f46' : '#dc2626',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--muted)', fontSize: '14px' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleResetPassword(user.id, user.email)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          color: '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        title="Send password reset email"
                      >
                        Reset Pwd
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          color: user.is_active ? '#f59e0b' : '#10b981',
                          border: `1px solid ${user.is_active ? '#f59e0b' : '#10b981'}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          color: '#dc2626',
                          border: '1px solid #dc2626',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        title="Delete user permanently"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
