'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './lib/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // If user is signed in, redirect to calendar
  if (!loading && user) {
    router.push('/calendar')
    return null
  }

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
        fontWeight: 700
      }}>
        OML NDIS Invoice App
      </h1>
      
      <p style={{ 
        color: '#94a3b8', 
        fontSize: 18,
        marginBottom: 32,
        lineHeight: 1.6
      }}>
        Comprehensive invoicing and shift management solution for NDIS service providers
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        marginBottom: 48
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #334155'
        }}>
          <h3 style={{ color: '#7dd3fc', marginBottom: 12, fontSize: 20 }}>📅 Calendar & Shifts</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            Manage shifts with an intuitive calendar interface. View by day or week, drag-and-drop to create shifts, 
            and automatically calculate costs based on NDIS line item rates and time windows.
          </p>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #334155'
        }}>
          <h3 style={{ color: '#7dd3fc', marginBottom: 12, fontSize: 20 }}>👥 Carers & Clients</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            Maintain detailed records for carers (ABN, bank details, contact info) and clients (NDIS number, address). 
            Organize your workforce and participant information in one place.
          </p>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #334155'
        }}>
          <h3 style={{ color: '#7dd3fc', marginBottom: 12, fontSize: 20 }}>💰 NDIS Line Items</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            Configure NDIS line item codes with rates, time windows, and day-specific pricing. 
            Support for weekday/weekend rates, public holidays, and sleepover shifts.
          </p>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #334155'
        }}>
          <h3 style={{ color: '#7dd3fc', marginBottom: 12, fontSize: 20 }}>🧾 Invoice Generation</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            Generate professional invoices as Excel files with automatic totals, formatted dates, 
            and custom carer logos. Bulk generate for date ranges and specific clients.
          </p>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #334155'
        }}>
          <h3 style={{ color: '#7dd3fc', marginBottom: 12, fontSize: 20 }}>📊 Reports</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            Track shift costs, hours worked, and generate summaries by carer, client, or time period. 
            Export data for accounting and reconciliation.
          </p>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: 24,
          borderRadius: 12,
          border: '1px solid #334155'
        }}>
          <h3 style={{ color: '#7dd3fc', marginBottom: 12, fontSize: 20 }}>🔒 Secure & Multi-User</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
            Each user's data is completely isolated with row-level security. 
            Email verification, password recovery, and secure authentication built-in.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ 
          textAlign: 'center',
          color: '#94a3b8',
          padding: '24px 0'
        }}>
          Loading...
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center',
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          marginTop: 32
        }}>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: 8,
            background: '#3b82f6',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 16,
            transition: 'background 0.2s'
          }}>
            Sign In
          </Link>
          <Link href="/signup" style={{
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: 8,
            border: '2px solid #3b82f6',
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 16,
            transition: 'all 0.2s'
          }}>
            Create Account
          </Link>
        </div>
      )}
    </div>
  )
}