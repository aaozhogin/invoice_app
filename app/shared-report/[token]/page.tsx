'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import '../../../app/globals.css'

interface CarerReport {
  carerId: number
  carerName: string
  shiftHours: number
  totalCost: number
  color: string
}

interface LineItemReport {
  category: string
  code: string
  description: string
  hours: number
  cost: number
}

interface Shift {
  id: number
  carer_id: number
  time_from: string
  time_to: string
  cost: number
  shift_date: string
  category?: string | null
  line_item_code_id?: string | number | null
  carers?: { id: number; first_name: string; last_name: string }
}

interface Carer {
  id: number
  first_name: string
  last_name: string
  color?: string
}

interface LineItem {
  id: string
  code: string
  category: string | null
  description: string | null
}

export default function SharedReportPage() {
  const params = useParams()
  const token = params?.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [carerReports, setCarerReports] = useState<CarerReport[]>([])
  const [lineItemReports, setLineItemReports] = useState<LineItemReport[]>([])
  const [categoryReports, setCategoryReports] = useState<any[]>([])
  const [carerColorsMap, setCarerColorsMap] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    if (!token) return

    const fetchSharedReport = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/get-shared-report?token=${token}`)
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error || 'Failed to load report')
        }
        const json = await res.json()
        setReportData(json.data)

        // Process report data
        if (json.data.carersReport) {
          processCarersReport(json.data.carersReport, json.data.dateFrom, json.data.dateTo)
        }
        if (json.data.lineItemsReport) {
          processLineItemsReport(json.data.lineItemsReport, json.data.dateFrom, json.data.dateTo)
        }
        if (json.data.categoriesReport) {
          processCategoriesReport(json.data.categoriesReport, json.data.dateFrom, json.data.dateTo)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedReport()
  }, [token])

  const processCarersReport = (carersReport: any, dateFrom: string, dateTo: string) => {
    const { shifts, carers } = carersReport
    const carerMap = new Map<number, Carer>(carers.map((c: Carer) => [c.id, c]))
    const colorsMap = new Map<number, string>(carers.map((c: Carer) => [c.id, c.color || '#888']))
    setCarerColorsMap(colorsMap)

    const carerTotals = new Map<number, { hours: number; cost: number; name: string }>()

    shifts.forEach((shift: Shift) => {
      const carerId = shift.carer_id
      const carer = carerMap.get(carerId)
      if (!carer) return

      const timeFrom = new Date(shift.time_from)
      const timeTo = new Date(shift.time_to)
      const hours = (timeTo.getTime() - timeFrom.getTime()) / (1000 * 60 * 60)

      if (!carerTotals.has(carerId)) {
        carerTotals.set(carerId, { hours: 0, cost: 0, name: `${carer.first_name} ${carer.last_name}` })
      }

      const total = carerTotals.get(carerId)!
      total.hours += hours
      total.cost += shift.cost
    })

    const reports = Array.from(carerTotals.entries()).map(([carerId, total]) => ({
      carerId,
      carerName: total.name,
      shiftHours: total.hours,
      totalCost: total.cost,
      color: colorsMap.get(carerId) || '#888'
    }))

    setCarerReports(reports)
  }

  const processLineItemsReport = (lineItemsReport: any, dateFrom: string, dateTo: string) => {
    const { shifts, lineItems } = lineItemsReport
    
    // Build a map of line items by ID
    const lineItemMap = new Map<string, LineItem>(lineItems.map((li: LineItem) => [li.id, li]))

    // Group shifts by line item code ID
    const lineItemTotals = new Map<string, { hours: number; cost: number; code: string; category: string; description: string }>()

    shifts.forEach((shift: Shift) => {
      // Get the line item code ID from the shift
      const codeId = shift.line_item_code_id ? String(shift.line_item_code_id) : null
      
      if (!codeId) return

      const timeFrom = new Date(shift.time_from)
      const timeTo = new Date(shift.time_to)
      const hours = (timeTo.getTime() - timeFrom.getTime()) / (1000 * 60 * 60)

      if (!lineItemTotals.has(codeId)) {
        const lineItem = lineItemMap.get(codeId)
        lineItemTotals.set(codeId, {
          hours: 0,
          cost: 0,
          code: lineItem?.code || codeId,
          category: lineItem?.category || 'Uncategorized',
          description: lineItem?.description || ''
        })
      }

      const total = lineItemTotals.get(codeId)!
      total.hours += hours
      total.cost += shift.cost
    })

    const reports = Array.from(lineItemTotals.entries())
      .map(([, total]) => ({
        code: total.code,
        category: total.category,
        description: total.description,
        hours: Math.round(total.hours * 100) / 100,
        cost: Math.round(total.cost * 100) / 100
      }))
      .sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category)
        if (categoryCompare !== 0) return categoryCompare
        return b.hours - a.hours
      })

    setLineItemReports(reports)
  }

  const processCategoriesReport = (categoriesReport: any, dateFrom: string, dateTo: string) => {
    const { shifts } = categoriesReport
    const categoryTotals = new Map<string, { hours: number; cost: number }>()

    shifts.forEach((shift: Shift) => {
      const category = shift.category || 'Uncategorized'
      if (!categoryTotals.has(category)) {
        categoryTotals.set(category, { hours: 0, cost: 0 })
      }

      const timeFrom = new Date(shift.time_from)
      const timeTo = new Date(shift.time_to)
      const hours = (timeTo.getTime() - timeFrom.getTime()) / (1000 * 60 * 60)

      const total = categoryTotals.get(category)!
      total.hours += hours
      total.cost += shift.cost
    })

    const reports = Array.from(categoryTotals.entries()).map(([category, total]) => ({
      category,
      hours: total.hours,
      cost: total.cost
    }))

    setCategoryReports(reports)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading report...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ef4444', fontSize: '18px' }}>
          <p>Error loading report: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>Shared Report</h1>
        <p style={{ color: '#999', marginBottom: '32px' }}>
          {reportData?.dateFrom} to {reportData?.dateTo}
        </p>

        {reportData?.carersReport && carerReports.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ marginBottom: '24px' }}>Carers Report</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Carer</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Hours</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {carerReports.map((carer) => (
                    <tr key={carer.carerId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: carer.color
                        }} />
                        {carer.carerName}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{carer.shiftHours.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>£{carer.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {reportData?.lineItemsReport && lineItemReports.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ marginBottom: '24px' }}>Line Item Codes Report</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Hours</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemReports.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>{item.category}</td>
                      <td style={{ padding: '12px' }}>{item.description}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{item.hours.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>£{item.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {reportData?.categoriesReport && categoryReports.length > 0 && (
          <section>
            <h2 style={{ marginBottom: '24px' }}>Categories Report</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Hours</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReports.map((cat, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>{cat.category}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{cat.hours.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>£{cat.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
