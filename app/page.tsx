'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './lib/AuthContext'

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
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#7dd3fc' }}>Key Features</h2>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>📅 Smart Calendar Management</h3>
          <ul style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li>Visual timeline view with drag-and-drop shift scheduling</li>
            <li>Day, week, and month navigation</li>
            <li>Real-time shift overlap detection and visual layout</li>
            <li>Copy shifts across multiple days with validation</li>
            <li>Client-based filtering for focused scheduling</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>💰 Automated Cost Calculation</h3>
          <ul style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li>Dynamic rate calculation based on line item codes and time windows</li>
            <li>Support for weekday, Saturday, Sunday, and public holiday rates</li>
            <li>Sleepover shift flat-rate billing</li>
            <li>Detailed cost breakdown by line item code</li>
            <li>Real-time totals with HIREUP category exclusion</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>📊 Excel Invoice Generation</h3>
          <ul style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li>Professional Excel invoices with custom formatting</li>
            <li>Grouped by line item codes with detailed breakdowns</li>
            <li>Automatic shift aggregation and totals</li>
            <li>Configurable date ranges and client filtering</li>
            <li>One-click download with custom invoice numbers</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>👥 Complete Resource Management</h3>
          <ul style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li><strong>Carers:</strong> Manage care workers with custom color coding and billed rates</li>
            <li><strong>Clients:</strong> Track clients with full contact information</li>
            <li><strong>Line Item Codes:</strong> Configure billing codes with time-based rates, day types, and special flags</li>
            <li><strong>Shifts:</strong> Comprehensive shift records with edit history and detailed views</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>🔒 Smart Validations</h3>
          <ul style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li>Prevent carer schedule conflicts (no overlapping shifts per carer)</li>
            <li>Maximum 2 overlapping shifts allowed at any time</li>
            <li>Overnight shift support with automatic date handling</li>
            <li>Client-specific shift filtering and invoice generation</li>
          </ul>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>📈 Real-time Analytics</h3>
          <ul style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
            <li>Per-carer totals (hours and costs) in sidebar</li>
            <li>Overlap analysis showing concurrent shift costs</li>
            <li>Overall totals excluding internal HIREUP shifts</li>
            <li>Date range summaries with flexible filtering</li>
          </ul>
        </div>
      </section>

      <section style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#7dd3fc' }}>Getting Started</h2>
        <ol style={{ marginLeft: '1.5rem', color: '#cbd5e1', lineHeight: '2' }}>
          <li>Add your <strong>Clients</strong> to the system</li>
          <li>Set up your <strong>Carers</strong> with rates and colors</li>
          <li>Configure <strong>Line Item Codes</strong> with appropriate rates and time windows</li>
          <li>Start scheduling shifts in the <strong>Calendar</strong></li>
          <li>Generate professional invoices from the Calendar actions menu</li>
        </ol>
      </section>
    </div>
  );
}