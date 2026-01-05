'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

interface SyncSettings {
  summaryFields: {
    carerName: boolean
    clientName: boolean
    lineItemCode: boolean
    description: boolean
    shiftCost: boolean
    hours: boolean
  }
  summaryOrder: string[] // e.g., ['carerName', 'clientName', 'hours']
  selectedClients: string[] // client IDs
  selectedCarers: string[] // carer IDs
  syncMode: 'automatic' | 'manual'
  manualDateFrom?: string
  manualDateTo?: string
  googleCalendarConnected: boolean
  googleCalendarId?: string
}

interface Client {
  id: number
  first_name: string
  last_name: string
}

interface Carer {
  id: number
  first_name: string
  last_name: string
}

export default function GoogleCalendarSyncClient() {
  const [settings, setSettings] = useState<SyncSettings>({
    summaryFields: {
      carerName: true,
      clientName: true,
      lineItemCode: false,
      description: false,
      shiftCost: false,
      hours: true
    },
    summaryOrder: ['carerName', 'clientName', 'hours'],
    selectedClients: [],
    selectedCarers: [],
    syncMode: 'automatic',
    googleCalendarConnected: false
  })

  const [clients, setClients] = useState<Client[]>([])
  const [carers, setCarers] = useState<Carer[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    loadSettings()
    fetchClientsAndCarers()
    handleOAuthCallback()
  }, [])

  const handleOAuthCallback = () => {
    // Check URL params for OAuth callback
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const error = params.get('error')

    if (error) {
      setSyncMessage(`❌ OAuth error: ${error}`)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (success === 'true' && accessToken) {
      // Store tokens securely
      localStorage.setItem('google_access_token', accessToken)
      if (refreshToken) {
        localStorage.setItem('google_refresh_token', refreshToken)
      }

      // Update settings
      saveSettings({ ...settings, googleCalendarConnected: true })
      setSyncMessage('✅ Successfully connected to Google Calendar!')

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  const loadSettings = () => {
    const saved = localStorage.getItem('googleCalendarSyncSettings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }

    // Check if we have stored tokens
    const accessToken = localStorage.getItem('google_access_token')
    if (accessToken && !settings.googleCalendarConnected) {
      setSettings(prev => ({ ...prev, googleCalendarConnected: true }))
    }
  }

  const saveSettings = (newSettings: SyncSettings) => {
    setSettings(newSettings)
    localStorage.setItem('googleCalendarSyncSettings', JSON.stringify(newSettings))
  }

  const fetchClientsAndCarers = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      
      const [clientsRes, carersRes] = await Promise.all([
        supabase.from('clients').select('*').order('first_name'),
        supabase.from('carers').select('*').order('first_name')
      ])

      if (clientsRes.data) setClients(clientsRes.data)
      if (carersRes.data) setCarers(carersRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSummaryField = (field: keyof typeof settings.summaryFields) => {
    const newFields = { ...settings.summaryFields, [field]: !settings.summaryFields[field] }
    
    // Update order array
    let newOrder = [...settings.summaryOrder]
    if (newFields[field]) {
      if (!newOrder.includes(field)) {
        newOrder.push(field)
      }
    } else {
      newOrder = newOrder.filter(f => f !== field)
    }

    saveSettings({ ...settings, summaryFields: newFields, summaryOrder: newOrder })
  }

  const moveFieldUp = (field: string) => {
    const index = settings.summaryOrder.indexOf(field)
    if (index > 0) {
      const newOrder = [...settings.summaryOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      saveSettings({ ...settings, summaryOrder: newOrder })
    }
  }

  const moveFieldDown = (field: string) => {
    const index = settings.summaryOrder.indexOf(field)
    if (index < settings.summaryOrder.length - 1 && index >= 0) {
      const newOrder = [...settings.summaryOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      saveSettings({ ...settings, summaryOrder: newOrder })
    }
  }

  const toggleClient = (clientId: number) => {
    const id = String(clientId)
    const newSelected = settings.selectedClients.includes(id)
      ? settings.selectedClients.filter(c => c !== id)
      : [...settings.selectedClients, id]
    saveSettings({ ...settings, selectedClients: newSelected })
  }

  const toggleCarer = (carerId: number) => {
    const id = String(carerId)
    const newSelected = settings.selectedCarers.includes(id)
      ? settings.selectedCarers.filter(c => c !== id)
      : [...settings.selectedCarers, id]
    saveSettings({ ...settings, selectedCarers: newSelected })
  }

  const selectAllClients = () => {
    saveSettings({ ...settings, selectedClients: clients.map(c => String(c.id)) })
  }

  const selectAllCarers = () => {
    saveSettings({ ...settings, selectedCarers: carers.map(c => String(c.id)) })
  }

  const connectGoogleCalendar = async () => {
    // Redirect to OAuth endpoint
    window.location.href = '/api/google-calendar/auth'
  }

  const disconnectGoogleCalendar = () => {
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_refresh_token')
    saveSettings({ ...settings, googleCalendarConnected: false })
    setSyncMessage('Disconnected from Google Calendar')
  }

  const syncNow = async () => {
    // Validation
    const atLeastOneField = Object.values(settings.summaryFields).some(v => v)
    if (!atLeastOneField) {
      setSyncMessage('❌ Please select at least one field for event summary')
      return
    }

    if (settings.selectedClients.length === 0) {
      setSyncMessage('❌ Please select at least one client')
      return
    }

    if (settings.selectedCarers.length === 0) {
      setSyncMessage('❌ Please select at least one carer')
      return
    }

    if (!settings.googleCalendarConnected) {
      setSyncMessage('❌ Please connect to Google Calendar first')
      return
    }

    setSyncing(true)
    setSyncMessage('🔄 Syncing shifts to Google Calendar...')

    try {
      // Get access token
      const accessToken = localStorage.getItem('google_access_token')
      if (!accessToken) {
        setSyncMessage('❌ No access token found. Please reconnect to Google Calendar.')
        setSyncing(false)
        return
      }

      // This will call the sync API
      const response = await fetch('/api/sync-google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          dateFrom: settings.syncMode === 'manual' ? settings.manualDateFrom : undefined,
          dateTo: settings.syncMode === 'manual' ? settings.manualDateTo : undefined,
          accessToken
        })
      })

      const result = await response.json()
      if (response.ok) {
        setSyncMessage(`✅ Successfully synced ${result.count} shifts!`)
      } else {
        setSyncMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setSyncMessage('❌ Error syncing shifts')
      console.error(error)
    } finally {
      setSyncing(false)
    }
  }

  const fieldLabels: Record<string, string> = {
    carerName: "Carer's Name",
    clientName: "Client's Name",
    lineItemCode: 'Line Item Code',
    description: 'Description',
    shiftCost: 'Shift Cost',
    hours: 'Number of Hours'
  }

  const getPreview = () => {
    return settings.summaryOrder
      .filter(field => settings.summaryFields[field as keyof typeof settings.summaryFields])
      .map(field => {
        switch (field) {
          case 'carerName': return 'John Smith'
          case 'clientName': return 'Jane Doe'
          case 'lineItemCode': return '01_010_0107_1_1'
          case 'description': return 'Support'
          case 'shiftCost': return '$150.00'
          case 'hours': return '3.5h'
          default: return ''
        }
      })
      .join(' | ')
  }

  if (loading) {
    return <div className="sync-container">Loading...</div>
  }

  return (
    <div className="sync-container">
      <h1>Google Calendar Sync</h1>

      {/* Connection Status - Full Width */}
      <section className="sync-section sync-section-full">
        <h2>Connection Status</h2>
        {settings.googleCalendarConnected ? (
          <div className="sync-status connected">
            ✅ Connected to Google Calendar
            <button onClick={disconnectGoogleCalendar} className="sync-btn-disconnect">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="sync-status disconnected">
            ⚠️ Not connected
            <button onClick={connectGoogleCalendar} className="sync-btn-connect">
              Connect Google Calendar
            </button>
          </div>
        )}
      </section>

      {/* Two Column Layout */}
      <div className="sync-columns">
        {/* Left Column */}
        <div className="sync-column">
          {/* Event Summary Configuration */}
          <section className="sync-section">
        <h2>Event Summary Configuration</h2>
        <p className="sync-help">Select at least one field and arrange the order</p>
        
        <div className="sync-fields-list">
          {settings.summaryOrder.map((field, idx) => {
            const isEnabled = settings.summaryFields[field as keyof typeof settings.summaryFields]
            if (!isEnabled) return null
            
            return (
              <div key={field} className="sync-field-item">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleSummaryField(field as keyof typeof settings.summaryFields)}
                />
                <span className="sync-field-label">{fieldLabels[field]}</span>
                <div className="sync-field-order">
                  <button onClick={() => moveFieldUp(field)} disabled={idx === 0} className="sync-btn-order">
                    ▲
                  </button>
                  <span className="sync-order-num">{idx + 1}</span>
                  <button onClick={() => moveFieldDown(field)} disabled={idx === settings.summaryOrder.filter(f => settings.summaryFields[f as keyof typeof settings.summaryFields]).length - 1} className="sync-btn-order">
                    ▼
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Show unchecked fields */}
        <div className="sync-fields-list">
          {Object.keys(settings.summaryFields).map(field => {
            const isEnabled = settings.summaryFields[field as keyof typeof settings.summaryFields]
            if (isEnabled) return null
            
            return (
              <div key={field} className="sync-field-item sync-field-disabled">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleSummaryField(field as keyof typeof settings.summaryFields)}
                />
                <span className="sync-field-label">{fieldLabels[field]}</span>
              </div>
            )
          })}
        </div>

        <div className="sync-preview">
          <strong>Preview:</strong> {getPreview() || '(Select at least one field)'}
        </div>
      </section>

          {/* Sync Mode */}
          <section className="sync-section">
            <h2>Sync Mode</h2>
            
            <label className="sync-radio-item">
              <input
                type="radio"
                checked={settings.syncMode === 'automatic'}
                onChange={() => saveSettings({ ...settings, syncMode: 'automatic' })}
              />
              <span>Automatic - Sync all shifts continuously</span>
            </label>

            <label className="sync-radio-item">
              <input
                type="radio"
                checked={settings.syncMode === 'manual'}
                onChange={() => saveSettings({ ...settings, syncMode: 'manual' })}
              />
              <span>Manual - Sync specific date range</span>
            </label>

            {settings.syncMode === 'manual' && (
              <div className="sync-date-range">
                <label className="sync-field">
                  <span>Date From (optional - leave empty for all)</span>
                  <input
                    type="date"
                    value={settings.manualDateFrom || ''}
                    onChange={(e) => saveSettings({ ...settings, manualDateFrom: e.target.value })}
                  />
                </label>
                <label className="sync-field">
                  <span>Date To (optional - leave empty for all)</span>
                  <input
                    type="date"
                    value={settings.manualDateTo || ''}
                    onChange={(e) => saveSettings({ ...settings, manualDateTo: e.target.value })}
                  />
                </label>
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="sync-column">
          {/* Client Selection */}
          <section className="sync-section">
        <h2>Clients to Sync</h2>
        <p className="sync-help">Select at least one client</p>
        <button onClick={selectAllClients} className="sync-btn-select-all">Select All</button>
        <button onClick={() => saveSettings({ ...settings, selectedClients: [] })} className="sync-btn-select-none">Select None</button>
        
        <div className="sync-checkbox-grid">
          {clients.map(client => (
            <label key={client.id} className="sync-checkbox-item">
              <input
                type="checkbox"
                checked={settings.selectedClients.includes(String(client.id))}
                onChange={() => toggleClient(client.id)}
              />
              <span>{client.first_name} {client.last_name}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Carer Selection */}
      <section className="sync-section">
        <h2>Carers to Sync</h2>
        <p className="sync-help">Select at least one carer</p>
        <button onClick={selectAllCarers} className="sync-btn-select-all">Select All</button>
        <button onClick={() => saveSettings({ ...settings, selectedCarers: [] })} className="sync-btn-select-none">Select None</button>
        
        <div className="sync-checkbox-grid">
          {carers.map(carer => (
            <label key={carer.id} className="sync-checkbox-item">
              <input
                type="checkbox"
                checked={settings.selectedCarers.includes(String(carer.id))}
                onChange={() => toggleCarer(carer.id)}
              />
              <span>{carer.first_name} {carer.last_name}</span>
            </label>
          ))}
        </div>
        </section>
        </div>
      </div>

      {/* Sync Button - Full Width */}
      <section className="sync-section sync-section-full">
        <button
          onClick={syncNow}
          disabled={syncing || !settings.googleCalendarConnected}
          className="sync-btn-primary"
        >
          {syncing ? 'Syncing...' : settings.syncMode === 'automatic' ? 'Start Automatic Sync' : 'Sync Now'}
        </button>
        
        {syncMessage && <div className="sync-message">{syncMessage}</div>}
      </section>

      <style jsx>{`
        .sync-container {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-y: auto;
        }

        .sync-columns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }

        .sync-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sync-section-full {
          grid-column: 1 / -1;
        }

        h1 {
          margin: 0 0 32px 0;
          font-size: 2rem;
        }

        h2 {
          margin: 0 0 16px 0;
          font-size: 1.3rem;
          color: var(--text);
        }

        .sync-section {
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .sync-help {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }

        .sync-status {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: 6px;
          font-weight: 600;
        }

        .sync-status.connected {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid #22c55e;
          color: #86efac;
        }

        .sync-status.disconnected {
          background: rgba(251, 146, 60, 0.1);
          border: 1px solid #fb923c;
          color: #fdba74;
        }

        .sync-btn-connect,
        .sync-btn-disconnect {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        .sync-btn-connect {
          background: #3b82f6;
          color: white;
        }

        .sync-btn-connect:hover {
          background: #2563eb;
        }

        .sync-btn-disconnect {
          background: #ef4444;
          color: white;
        }

        .sync-btn-disconnect:hover {
          background: #dc2626;
        }

        .sync-fields-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .sync-field-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
        }

        .sync-field-item.sync-field-disabled {
          opacity: 0.6;
        }

        .sync-field-label {
          flex: 1;
          font-size: 0.95rem;
        }

        .sync-field-order {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sync-btn-order {
          padding: 4px 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          color: var(--text);
          font-size: 0.8rem;
        }

        .sync-btn-order:hover:not(:disabled) {
          background: var(--border);
        }

        .sync-btn-order:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .sync-order-num {
          font-weight: 700;
          min-width: 20px;
          text-align: center;
          color: #3b82f6;
        }

        .sync-preview {
          padding: 16px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          border-radius: 6px;
          color: #93c5fd;
          font-family: monospace;
          margin-top: 16px;
        }

        .sync-btn-select-all,
        .sync-btn-select-none {
          padding: 6px 12px;
          margin-right: 8px;
          margin-bottom: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
          color: var(--text);
          font-size: 0.9rem;
        }

        .sync-btn-select-all:hover,
        .sync-btn-select-none:hover {
          background: var(--border);
        }

        .sync-checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 10px;
          max-height: 300px;
          overflow-y: auto;
        }

        .sync-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
        }

        .sync-checkbox-item:hover {
          background: rgba(125, 211, 252, 0.05);
        }

        .sync-checkbox-item input[type="checkbox"] {
          cursor: pointer;
        }

        .sync-radio-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          margin-bottom: 12px;
          cursor: pointer;
        }

        .sync-radio-item:hover {
          background: rgba(125, 211, 252, 0.05);
        }

        .sync-radio-item input[type="radio"] {
          cursor: pointer;
        }

        .sync-date-range {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }

        .sync-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .sync-field span {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .sync-field input {
          padding: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 0.95rem;
        }

        .sync-btn-primary {
          padding: 14px 28px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
        }

        .sync-btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .sync-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sync-message {
          margin-top: 16px;
          padding: 12px;
          border-radius: 6px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          color: #93c5fd;
          text-align: center;
        }

        input[type="checkbox"],
        input[type="radio"] {
          width: 18px;
          height: 18px;
        }

        @media (max-width: 1024px) {
          .sync-columns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
