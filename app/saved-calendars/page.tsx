'use client'

import { useEffect, useState } from 'react'

interface SavedCalendarConfig {
  dateFrom: string | null
  dateTo: string | null
  currentDate: string
  selectedClientId: number | null
  rangeShifts: Array<{
    id: number
    time_from: string
    time_to: string
    carer_id: number
    cost: number
    shift_date: string
  }>
  shifts: Array<{
    id: number
    time_from: string
    time_to: string
    carer_id: number
    cost: number
    shift_date: string
  }>
  carerTotals?: Array<{ carerId: number; name: string; totalHours: number; totalCost: number }>
  overlapSummary?: { overlapHours: number; overlapCost: number } | null
  overallTotals?: { totalHours: number; totalCost: number }
}

interface SavedCalendarListItem {
  id: string
  name: string
  date_from: string | null
  date_to: string | null
  client_id: number | null
  created_at: string
  config?: SavedCalendarConfig
}

export default function SavedCalendarsPage() {
  const [items, setItems] = useState<SavedCalendarListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatMoney = (value: number | undefined) =>
    typeof value === 'number' && !Number.isNaN(value) ? `$${value.toFixed(2)}` : 'N/A'

  const formatHours = (value: number | undefined) =>
    typeof value === 'number' && !Number.isNaN(value) ? `${value.toFixed(2)}h` : 'N/A'

  const deriveStats = (config?: SavedCalendarConfig) => {
    if (!config) {
      return {
        overall: 'N/A',
        overlap: 'N/A',
        carers: 'N/A',
      }
    }

    const overallHours = config.overallTotals?.totalHours
    const overallCost = config.overallTotals?.totalCost
    const overlapHours = config.overlapSummary?.overlapHours
    const overlapCost = config.overlapSummary?.overlapCost
    const carersList = config.carerTotals

    const overall = overallHours || overallCost
      ? `${formatHours(overallHours)} • ${formatMoney(overallCost)}`
      : 'N/A'

    const overlap = overlapHours || overlapCost
      ? `${formatHours(overlapHours)} • ${formatMoney(overlapCost)}`
      : 'N/A'

    const carers = carersList && carersList.length > 0
      ? carersList
          .map(c => `${c.name || `Carer ${c.carerId}`}: ${formatHours(c.totalHours)} / ${formatMoney(c.totalCost)}`)
          .join(', ')
      : 'N/A'

    return { overall, overlap, carers }
  }

  const loadCalendars = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/saved-calendars')
      if (!res.ok) throw new Error('Failed to load saved calendars')
      const body = await res.json()
      setItems(body?.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved calendars')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCalendars()
  }, [])

  const handleDelete = async (id: string) => {
    if (deletingId) return
    const confirmDelete = window.confirm('Delete this saved calendar? This cannot be undone.')
    if (!confirmDelete) return
    try {
      setDeletingId(id)
      setError(null)
      const res = await fetch(`/api/saved-calendars/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to delete saved calendar')
      }
      await loadCalendars()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete saved calendar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1>Saved Calendars</h1>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>There are no saved Calendars at the moment. Come back later.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#0f1724' }}>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Name</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Dates</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Overall</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Overlap</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Carers</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const stats = deriveStats(item.config)
                return (
                  <tr key={item.id} style={{ background: '#0b1220' }}>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937', fontWeight: 700 }}>{item.name}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937', color: '#cbd5e1' }}>
                      {item.date_from} - {item.date_to}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937', color: '#e2e8f0' }}>
                      {stats.overall}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937', color: '#e2e8f0' }}>
                      {stats.overlap}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937', color: '#e2e8f0' }}>
                      {stats.carers}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fecdd3',
                          padding: '6px 10px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        {deletingId === item.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
