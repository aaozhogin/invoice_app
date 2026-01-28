'use client'

import Link from 'next/link'
import { useAuth } from './lib/AuthContext'
import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Pricing } from '@/components/landing/Pricing'
import { CTA } from '@/components/landing/CTA'
import { Footer } from '@/components/landing/Footer'
import { AnimatedBackground } from '@/components/landing/AnimatedBackground'

export default function HomePage() {
  const { user, loading } = useAuth()

  // If user is logged in, show the app navigation
  if (user && !loading) {
    return (
      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '48px 24px'
      }}>
        <h1 style={{ 
          color: '#e2e8f0', 
          fontSize: 36, 
          marginBottom: 16,
          fontWeight: 700,
          textAlign: 'center'
        }}>
          Welcome back!
        </h1>
        
        <p style={{ 
          color: '#94a3b8', 
          fontSize: 18,
          marginBottom: 32,
          lineHeight: 1.6,
          textAlign: 'center'
        }}>
          Choose where to go:
        </p>

        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 16,
          maxWidth: 800,
          margin: '0 auto'
        }}>
          <Link href="/calendar" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            📅 Calendar
          </Link>
          <Link href="/shifts" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            🕐 Shifts
          </Link>
          <Link href="/invoices" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            🧾 Invoices
          </Link>
          <Link href="/reports" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            📊 Reports
          </Link>
          <Link href="/carers" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            👥 Carers
          </Link>
          <Link href="/clients" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            🏠 Clients
          </Link>
          <Link href="/line-item-codes" style={{
            display: 'block',
            padding: '16px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'all 0.2s',
            minWidth: 180,
            textAlign: 'center',
            flex: '1 1 180px',
            maxWidth: 220
          }}>
            💰 Line Item Codes
          </Link>
        </div>
      </div>
    )
  }

  // Show landing page for logged out users
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Animated particle network background - sits above base bg, below content */}
      <AnimatedBackground />
      
      {/* All content sits above the animated background */}
      <div className="relative" style={{ zIndex: 2 }}>
        <Header />
        <main>
          <Hero />
          <Features />
          <HowItWorks />
          <Pricing />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  )
}