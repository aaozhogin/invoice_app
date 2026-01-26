'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { useRouter } from 'next/navigation'

export type UserRole = 'superadmin' | 'administrator' | 'service_provider' | 'carer' | 'customer' | 'support_coordinator'

interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  org_id?: string
  role: UserRole
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  userProfile: UserProfile | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  isSuperadmin: () => boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Get initial session and user profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user?.id) {
        fetchUserProfile(session.user.id, supabase)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user?.id) {
        fetchUserProfile(session.user.id, supabase)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string, supabase: any) => {
    try {
      // Fetch profile without relying on PostgREST relationship cache
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, org_id, is_active, user_role_id')
        .eq('id', userId)
        .single()

      if (userError || !userRow) {
        setUserProfile(null)
        return
      }

      let resolvedRole: UserRole = 'carer'

      if (userRow.user_role_id) {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role_type')
          .eq('id', userRow.user_role_id)
          .single()

        if (roleRow?.role_type) {
          resolvedRole = roleRow.role_type as UserRole
        }
      }

      setUserProfile({
        id: userRow.id,
        email: userRow.email,
        first_name: userRow.first_name,
        last_name: userRow.last_name,
        org_id: userRow.org_id,
        role: resolvedRole,
        is_active: userRow.is_active,
      })
    } catch (err) {
      setUserProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error) {
      router.push('/')
    }
    
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    return { error }
  }

  const signOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    
    return { error }
  }

  const isSuperadmin = () => userProfile?.role === 'superadmin'

  const hasRole = (role: UserRole | UserRole[]) => {
    if (!userProfile) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(userProfile.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isSuperadmin,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
