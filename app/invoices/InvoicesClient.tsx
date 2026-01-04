'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface InvoiceRecord {
  id: string
  invoice_number: string
  carer_id: number
  client_id: number
  date_from: string
  date_to: string
  invoice_date: string
  file_path: string
  created_at: string
  carers: { id: number; first_name: string; last_name: string } | null
  clients: { id: number; first_name: string; last_name: string } | null
  total_amount?: number
}

export default function InvoicesClient() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    // Listen for invoice generation events from the calendar
    const handleInvoiceGenerated = () => {
      fetchInvoices()
    }
    window.addEventListener('invoiceGenerated', handleInvoiceGenerated)
    return () => window.removeEventListener('invoiceGenerated', handleInvoiceGenerated)
  }, [])

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/list-invoices')
      if (!res.ok) throw new Error('Failed to fetch invoices')
      const json = await res.json()
      setInvoices(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice record?')) return

    try {
      setDeletingId(id)
      const res = await fetch(`/api/delete-invoice?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete invoice')
      setInvoices(invoices.filter(inv => inv.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (invoice: InvoiceRecord) => {
    try {
      setDownloadingId(invoice.id)
      const res = await fetch(`/api/download-invoice?number=${encodeURIComponent(invoice.invoice_number)}&date=${invoice.invoice_date}`)
      if (!res.ok) throw new Error('Failed to download invoice')
      
      const json = await res.json()
      if (!json.success || !json.file) throw new Error('Invalid response format')
      
      // Decode base64 file data
      const binaryString = atob(json.file.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Create blob and download
      const blob = new Blob([bytes], { type: json.file.mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = json.file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-AU') + ' ' + date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-AU')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Invoice History</h1>
      
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #334155'
      }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#7dd3fc' }}>How to Generate Invoices</h2>
        <p style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>
          Invoices are generated from the <strong>Calendar</strong> view. To create a new invoice:
        </p>
        <ol style={{ color: '#cbd5e1', marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Go to the <strong>Calendar</strong> page</li>
          <li>Select your desired date range using "Date from" and "Date to" filters</li>
          <li>Select a client from the client dropdown</li>
          <li>Click the <strong>Actions menu</strong> (three dots) and select <strong>Generate Invoice</strong></li>
          <li>Choose the carer, enter an invoice number, and confirm</li>
        </ol>
        <p style={{ color: '#cbd5e1', marginTop: '1rem', fontStyle: 'italic' }}>
          This page shows all previously generated invoices and allows you to download or delete them.
        </p>
      </div>

      {error && invoices.length > 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#7f1d1d',
          borderRadius: '8px',
          color: '#fca5a5',
          marginBottom: '1.5rem',
          border: '1px solid #dc2626'
        }}>
          Error: {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          <p>Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div style={{
          padding: '2rem',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#94a3b8',
          border: '1px solid #334155'
        }}>
          <p>No invoices generated yet. Create your first invoice from the Calendar view.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #334155'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '2px solid #334155' }}>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155', width: '50px' }}>No.</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Invoice #</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Carer</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Client</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Date From</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Date To</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Invoice Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Generated</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Total Amount</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#7dd3fc', fontWeight: 'bold', borderRight: '1px solid #334155' }}>Download</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#7dd3fc', fontWeight: 'bold' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, idx) => (
                <tr key={invoice.id} style={{
                  borderBottom: '1px solid #334155',
                  backgroundColor: '#0f172a'
                }}>
                  <td style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center', borderRight: '1px solid #334155', fontSize: '0.9rem' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '1rem', color: '#e2e8f0', borderRight: '1px solid #334155', fontWeight: '500' }}>
                    {invoice.invoice_number}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', borderRight: '1px solid #334155' }}>
                    {invoice.carers ? `${invoice.carers.first_name} ${invoice.carers.last_name}` : 'Unknown'}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', borderRight: '1px solid #334155' }}>
                    {invoice.clients ? `${invoice.clients.first_name} ${invoice.clients.last_name}` : 'Unknown'}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', borderRight: '1px solid #334155' }}>
                    {formatDate(invoice.date_from)}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', borderRight: '1px solid #334155' }}>
                    {formatDate(invoice.date_to)}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', borderRight: '1px solid #334155' }}>
                    {formatDate(invoice.invoice_date)}
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1', borderRight: '1px solid #334155', fontSize: '0.9rem' }}>
                    {formatDateTime(invoice.created_at)}
                  </td>
                  <td style={{ padding: '1rem', color: '#e2e8f0', borderRight: '1px solid #334155', fontWeight: '500', textAlign: 'right' }}>
                    ${(invoice.total_amount || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', borderRight: '1px solid #334155' }}>
                    <button
                      onClick={() => handleDownload(invoice)}
                      disabled={downloadingId === invoice.id}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: downloadingId === invoice.id ? '#9ca3af' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        cursor: downloadingId === invoice.id ? 'not-allowed' : 'pointer',
                        opacity: downloadingId === invoice.id ? 0.6 : 1
                      }}
                    >
                      {downloadingId === invoice.id ? 'Downloading...' : 'Download'}
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      disabled={deletingId === invoice.id}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: deletingId === invoice.id ? '#9ca3af' : '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        cursor: deletingId === invoice.id ? 'not-allowed' : 'pointer',
                        opacity: deletingId === invoice.id ? 0.6 : 1
                      }}
                    >
                      {deletingId === invoice.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
