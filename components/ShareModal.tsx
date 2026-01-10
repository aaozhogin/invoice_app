'use client'

import { useState } from 'react'

interface ShareModalProps {
  isOpen: boolean
  dateFrom: string
  dateTo: string
  onClose: () => void
  onGenerate: (reports: {
    carersReport: boolean
    lineItemsReport: boolean
    categoriesReport: boolean
  }) => Promise<{ shareUrl: string } | null>
}

export default function ShareModal({
  isOpen,
  dateFrom,
  dateTo,
  onClose,
  onGenerate
}: ShareModalProps) {
  const [carersReport, setCarersReport] = useState(true)
  const [lineItemsReport, setLineItemsReport] = useState(true)
  const [categoriesReport, setCategoriesReport] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleGenerateLink = async () => {
    if (!carersReport && !lineItemsReport && !categoriesReport) {
      setError('Please select at least one report')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      const result = await onGenerate({
        carersReport,
        lineItemsReport,
        categoriesReport
      })

      if (result) {
        setShareUrl(result.shareUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setGenerating(false)
    }
  }

  const handleClose = () => {
    setShareUrl(null)
    setError(null)
    setCarersReport(true)
    setLineItemsReport(true)
    setCategoriesReport(true)
    onClose()
  }

  const handleCopyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        {shareUrl ? (
          <>
            <h2 style={{ marginBottom: '16px' }}>Share Report</h2>
            <p style={{ color: '#999', marginBottom: '24px' }}>
              Share link generated successfully!
            </p>
            <div style={{
              backgroundColor: 'var(--bg)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '24px',
              wordBreak: 'break-all',
              fontSize: '12px',
              color: '#ccc'
            }}>
              {shareUrl}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCopyToClipboard}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Copy Link
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--border)',
                  color: 'var(--text)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '24px' }}>Share Reports</h2>
            <p style={{ color: '#999', marginBottom: '16px' }}>
              Date range: <strong>{dateFrom} to {dateTo}</strong>
            </p>

            <div style={{ marginBottom: '32px' }}>
              <p style={{ marginBottom: '16px', fontWeight: '600' }}>Select reports to share:</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={carersReport}
                    onChange={(e) => setCarersReport(e.target.checked)}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>Carers Report</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={lineItemsReport}
                    onChange={(e) => setLineItemsReport(e.target.checked)}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>Line Item Codes Report</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={categoriesReport}
                    onChange={(e) => setCategoriesReport(e.target.checked)}
                    style={{ marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>Line Item Categories Report</span>
                </label>
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#7f1d1d',
                color: '#fca5a5',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--border)',
                  color: 'var(--text)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: generating ? 0.6 : 1
                }}
              >
                Close
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: generating ? 0.6 : 1
                }}
              >
                {generating ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
