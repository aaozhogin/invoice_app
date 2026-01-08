'use client'

import Link from 'next/link'
import { useAuth } from './lib/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()

  const Button = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} style={{
      display: 'inline-block',
      padding: '12px 16px',
      borderRadius: 8,
      background: '#3b82f6',
      color: '#fff',
      textDecoration: 'none',
      fontWeight: 600
    }}>
      {children}
    </Link>
  )

  return (
    <div style={{
      maxWidth: 920,
      margin: '0 auto',
      padding: '48px 24px'
    }}>
      <h1 style={{ color: '#e2e8f0', fontSize: 28, marginBottom: 12 }}>OML NDIS Invoice App</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        {loading ? 'Loading your session…' : user ? 'Welcome back! Choose where to go:' : 'Manage NDIS shifts, carers, clients and invoices for your NDIS participants.'}
      </p>

      {loading ? (
        <div style={{ color: '#94a3b8' }}>Preparing…</div>
      ) : user ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <Button href="/calendar">Calendar</Button>
          <Button href="/shifts">Shifts</Button>
          <Button href="/invoices">Invoices</Button>
          <Button href="/reports">Reports</Button>
          <Button href="/carers">Carers</Button>
          <Button href="/clients">Clients</Button>
          <Button href="/line-item-codes">Line Item Codes</Button>
          <Button href="/settings">Settings</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <Button href="/login">Sign In</Button>
          <Link href="/signup" style={{
            display: 'inline-block',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #334155',
            color: '#e2e8f0',
            textDecoration: 'none',
            fontWeight: 600
          }}>Create Account</Link>
        </div>
      )}
    </div>
  )
}