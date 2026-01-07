'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './lib/AuthContext'

// Home page - redirects based on auth status
export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/calendar')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    }}>
      <div style={{
        fontSize: '18px',
        color: '#94a3b8'
      }}>
        Loading...
      </div>
    </div>
  )
}