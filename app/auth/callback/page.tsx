'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import getSupabaseClient from '@/app/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<string>('Finalizing sign-in…')

  useEffect(() => {
    const supabase = getSupabaseClient()
    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/calendar'

    async function handleCallback() {
      try {
        // Prefer code exchange (PKCE / email link when redirect URLs are configured)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          router.replace(next)
          return
        }

        // Fallback: handle hash tokens (#access_token) if Supabase sent fragment params
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.substring(1))
          const access_token = hash.get('access_token')
          const refresh_token = hash.get('refresh_token')
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
            router.replace(next)
            return
          }
        }

        // If nothing to exchange, go to login
        router.replace('/login')
      } catch (err: any) {
        setMessage(err?.message || 'Authentication failed. Redirecting to login…')
        setTimeout(() => router.replace('/login'), 1200)
      }
    }

    handleCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    }}>
      <div style={{ fontSize: '18px', color: '#94a3b8' }}>{message}</div>
    </div>
  )
}
