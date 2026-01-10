'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import '../../../app/globals.css'

interface CarerReport {
  seq: number
  carerId: number
  carerName: string
  shiftHours: number
  totalCost: number
  color: string
  monthlyData: { [key: string]: { hours: number; cost: number } }
}

interface LineItemReport {
  seq: number
  category: string
  code: string
  description: string
  hours: number
  cost: number
  monthlyData: { [key: string]: { hours: number; cost: number } }
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
  const [hireupMapping, setHireupMapping] = useState('')

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
        setHireupMapping(json.hireupMapping || '')

        // Process report data
        if (json.data.carersReport) {
          processCarersReport(json.data.carersReport, json.data.dateFrom, json.data.dateTo)
        }
        if (json.data.lineItemsReport) {
          processLineItemsReport(json.data.lineItemsReport, json.data.dateFrom, json.data.dateTo, json.hireupMapping)
        }
        if (json.data.categoriesReport) {
          processCategoriesReport(json.data.categoriesReport, json.data.dateFrom, json.data.dateTo, json.hireupMapping)
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

    const carerTotals = new Map<number, { hours: number; cost: number; name: string; monthlyData: Map<string, { hours: number; cost: number }> }>()
    let seq = 0

    shifts.forEach((shift: Shift) => {
      const carerId = shift.carer_id
      const carer = carerMap.get(carerId)
      if (!carer) return

      const timeFrom = new Date(shift.time_from)
      const timeTo = new Date(shift.time_to)
      const hours = (timeTo.getTime() - timeFrom.getTime()) / (1000 * 60 * 60)

      const shiftDate = new Date(shift.shift_date)
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`

      if (!carerTotals.has(carerId)) {
        carerTotals.set(carerId, { hours: 0, cost: 0, name: `${carer.first_name} ${carer.last_name}`, monthlyData: new Map() })
      }

      const total = carerTotals.get(carerId)!
      total.hours += hours
      total.cost += shift.cost

      if (!total.monthlyData.has(monthKey)) {
        total.monthlyData.set(monthKey, { hours: 0, cost: 0 })
      }
      const md = total.monthlyData.get(monthKey)!
      md.hours += hours
      md.cost += shift.cost
    })

    const reports = Array.from(carerTotals.entries()).map(([carerId, total]) => {
      seq++
      const monthlyDataObj: { [key: string]: { hours: number; cost: number } } = {}
      total.monthlyData.forEach((value, key) => {
        monthlyDataObj[key] = {
          hours: Math.round(value.hours * 100) / 100,
          cost: Math.round(value.cost * 100) / 100
        }
      })
      return {
        seq,
        carerId,
        carerName: total.name,
        shiftHours: Math.round(total.hours * 100) / 100,
        totalCost: Math.round(total.cost * 100) / 100,
        color: colorsMap.get(carerId) || '#888',
        monthlyData: monthlyDataObj
      }
    })

    setCarerReports(reports)
  }

  const processLineItemsReport = (lineItemsReport: any, dateFrom: string, dateTo: string, hireupCode: string) => {
    const { shifts, lineItems } = lineItemsReport
    const lineItemMap = new Map<string, LineItem>(lineItems.map((li: LineItem) => [li.id, li]))

    const lineItemTotals = new Map<string, { seq: number; hours: number; cost: number; code: string; category: string; description: string; monthlyData: Map<string, { hours: number; cost: number }> }>()
    let seq = 0

    shifts.forEach((shift: Shift) => {
      let codeId = shift.line_item_code_id ? String(shift.line_item_code_id) : null
      if (shift.category === 'HIREUP' && hireupCode) {
        codeId = hireupCode
      }
      if (!codeId) return

      const timeFrom = new Date(shift.time_from)
      const timeTo = new Date(shift.time_to)
      const hours = (timeTo.getTime() - timeFrom.getTime()) / (1000 * 60 * 60)

      if (!lineItemTotals.has(codeId)) {
        seq++
        const lineItem = lineItemMap.get(codeId)
        lineItemTotals.set(codeId, {
          seq,
          hours: 0,
          cost: 0,
          code: lineItem?.code || codeId,
          category: lineItem?.category || 'Uncategorized',
          description: lineItem?.description || '',
          monthlyData: new Map()
        })
      }

      const total = lineItemTotals.get(codeId)!
      total.hours += hours
      total.cost += shift.cost

      const shiftDate = new Date(shift.shift_date)
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`
      if (!total.monthlyData.has(monthKey)) {
        total.monthlyData.set(monthKey, { hours: 0, cost: 0 })
      }
      const md = total.monthlyData.get(monthKey)!
      md.hours += hours
      md.cost += shift.cost
    })

    const reports = Array.from(lineItemTotals.entries())
      .map(([, total]) => {
        const monthlyDataObj: { [key: string]: { hours: number; cost: number } } = {}
        total.monthlyData.forEach((value, key) => {
          monthlyDataObj[key] = {
            hours: Math.round(value.hours * 100) / 100,
            cost: Math.round(value.cost * 100) / 100
          }
        })
        return {
          seq: total.seq,
          code: total.code,
          category: total.category,
          description: total.description,
          hours: Math.round(total.hours * 100) / 100,
          cost: Math.round(total.cost * 100) / 100,
          monthlyData: monthlyDataObj
        }
      })
      .sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category)
        if (categoryCompare !== 0) return categoryCompare
        return b.hours - a.hours
      })

    setLineItemReports(reports)
  }

  const processCategoriesReport = (categoriesReport: any, dateFrom: string, dateTo: string, hireupCode: string) => {
    const { shifts, lineItems = [] } = categoriesReport
    const lineItemMap = new Map<string, LineItem>(lineItems.map((li: LineItem) => [li.id, li]))
    const categoryTotals = new Map<string, { hours: number; cost: number; monthlyData: Map<string, { hours: number; cost: number }> }>()

    shifts.forEach((shift: Shift) => {
      let categoryName = shift.category || 'Uncategorized'
      
      // If this is a HIREUP shift and we have a mapping
      if (shift.category === 'HIREUP' && hireupCode) {
        // Find the line item that the HIREUP was mapped to
        const mappedLineItem = lineItemMap.get(hireupCode)
        if (mappedLineItem && mappedLineItem.category) {
          // Use the mapped line item's category
          categoryName = mappedLineItem.category
        }
      }
      
      const shiftDate = new Date(shift.shift_date)
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!categoryTotals.has(categoryName)) {
        categoryTotals.set(categoryName, { hours: 0, cost: 0, monthlyData: new Map() })
      }

      const timeFrom = new Date(shift.time_from)
      const timeTo = new Date(shift.time_to)
      const hours = (timeTo.getTime() - timeFrom.getTime()) / (1000 * 60 * 60)

      const total = categoryTotals.get(categoryName)!
      total.hours += hours
      total.cost += shift.cost

      if (!total.monthlyData.has(monthKey)) {
        total.monthlyData.set(monthKey, { hours: 0, cost: 0 })
      }
      const monthData = total.monthlyData.get(monthKey)!
      monthData.hours += hours
      monthData.cost += shift.cost
    })

    const reports = Array.from(categoryTotals.entries()).map(([category, data]) => {
      const monthlyDataObj: { [key: string]: { hours: number; cost: number } } = {}
      data.monthlyData.forEach((value, key) => {
        monthlyDataObj[key] = {
          hours: Math.round(value.hours * 100) / 100,
          cost: Math.round(value.cost * 100) / 100
        }
      })
      
      return {
        category,
        hours: Math.round(data.hours * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        monthlyData: monthlyDataObj
      }
    }).sort((a, b) => b.cost - a.cost)

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

  const monthKeys = (() => {
    if (!reportData?.dateFrom || !reportData?.dateTo) return [] as string[]
    const start = new Date(reportData.dateFrom)
    const end = new Date(reportData.dateTo)
    start.setDate(1)
    end.setDate(1)
    const keys: string[] = []
    const d = new Date(start)
    while (d <= end) {
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      d.setMonth(d.getMonth() + 1)
    }
    return keys
  })()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', padding: '40px 20px', overflow: 'auto' }}>
      <div>
        <h1 style={{ marginBottom: '8px' }}>Shared Report</h1>
        <p style={{ color: '#999', marginBottom: '32px' }}>
          {reportData?.dateFrom} to {reportData?.dateTo}
        </p>

        {reportData?.carersReport && carerReports.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ marginBottom: '24px' }}>Carers Report</h2>
            <div style={{ overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '40px' }}>Seq</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', minWidth: '180px' }}>Carer Name</th>
                    {monthKeys.map(monthKey => (
                      <th key={monthKey} style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {new Date(`${monthKey}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </th>
                    ))}
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {carerReports.map((carer) => (
                    <tr key={carer.carerId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>{carer.seq}</td>
                      <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: carer.color
                        }} />
                        {carer.carerName}
                      </td>
                      {monthKeys.map(monthKey => (
                        <td key={monthKey} style={{ padding: '8px 6px', textAlign: 'right' }}>
                          {carer.monthlyData[monthKey] && carer.monthlyData[monthKey].cost > 0 ? `$${carer.monthlyData[monthKey].cost.toFixed(2)}` : '-'}
                        </td>
                      ))}
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>${carer.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: '600', backgroundColor: 'var(--bg)' }}>
                    <td colSpan={2} style={{ padding: '8px 12px' }}>TOTAL</td>
                    {monthKeys.map(monthKey => {
                      const monthTotal = carerReports.reduce((sum, c) => sum + (c.monthlyData[monthKey]?.cost || 0), 0)
                      return (
                        <td key={monthKey} style={{ padding: '8px 6px', textAlign: 'right' }}>${monthTotal.toFixed(2)}</td>
                      )
                    })}
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>${carerReports.reduce((sum, c) => sum + c.totalCost, 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {carerReports.length > 0 && (
              <div style={{ marginTop: '40px', display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: '12px' }}>Carer Cost Distribution</h3>
                  <svg viewBox="0 0 200 200" style={{ width: '600px', height: '600px' }}>
                    {(() => {
                      const total = carerReports.reduce((sum, carer) => sum + carer.totalCost, 0)
                      let currentAngle = -90
                      
                      return carerReports.map((carer, idx) => {
                        const sliceAngle = total > 0 ? (carer.totalCost / total) * 360 : 0
                        const startAngle = currentAngle
                        const endAngle = currentAngle + sliceAngle
                        
                        const startRad = (startAngle * Math.PI) / 180
                        const endRad = (endAngle * Math.PI) / 180
                        
                        const x1 = 100 + 80 * Math.cos(startRad)
                        const y1 = 100 + 80 * Math.sin(startRad)
                        const x2 = 100 + 80 * Math.cos(endRad)
                        const y2 = 100 + 80 * Math.sin(endRad)
                        
                        const largeArc = sliceAngle > 180 ? 1 : 0
                        const pathData = [
                          `M 100 100`,
                          `L ${x1} ${y1}`,
                          `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
                          `Z`
                        ].join(' ')
                        
                        const midAngle = startAngle + sliceAngle / 2
                        const mr = 55
                        const mx = 100 + mr * Math.cos((midAngle * Math.PI) / 180)
                        const my = 100 + mr * Math.sin((midAngle * Math.PI) / 180)
                        const initials = carer.carerName.split(' ').map((s: string) => s[0]).join('').toUpperCase()
                        
                        currentAngle = endAngle
                        
                        return (
                          <g key={idx}>
                            <path d={pathData} fill={carer.color} />
                            {sliceAngle > 10 && (
                              <text x={mx} y={my} fill="#fff" fontSize="12" textAnchor="middle" dominantBaseline="middle">{initials}</text>
                            )}
                          </g>
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div>
                  <h3 style={{ marginBottom: '12px' }}>Carer Time Distribution</h3>
                  <svg viewBox="0 0 200 200" style={{ width: '600px', height: '600px' }}>
                    {(() => {
                      const total = carerReports.reduce((sum, carer) => sum + carer.shiftHours, 0)
                      let currentAngle = -90
                      
                      return carerReports.map((carer, idx) => {
                        const sliceAngle = total > 0 ? (carer.shiftHours / total) * 360 : 0
                        const startAngle = currentAngle
                        const endAngle = currentAngle + sliceAngle
                        
                        const startRad = (startAngle * Math.PI) / 180
                        const endRad = (endAngle * Math.PI) / 180
                        
                        const x1 = 100 + 80 * Math.cos(startRad)
                        const y1 = 100 + 80 * Math.sin(startRad)
                        const x2 = 100 + 80 * Math.cos(endRad)
                        const y2 = 100 + 80 * Math.sin(endRad)
                        
                        const largeArc = sliceAngle > 180 ? 1 : 0
                        const pathData = [
                          `M 100 100`,
                          `L ${x1} ${y1}`,
                          `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
                          `Z`
                        ].join(' ')
                        
                        const midAngle = startAngle + sliceAngle / 2
                        const mr = 55
                        const mx = 100 + mr * Math.cos((midAngle * Math.PI) / 180)
                        const my = 100 + mr * Math.sin((midAngle * Math.PI) / 180)
                        const initials = carer.carerName.split(' ').map((s: string) => s[0]).join('').toUpperCase()
                        
                        currentAngle = endAngle
                        
                        return (
                          <g key={idx}>
                            <path d={pathData} fill={carer.color} />
                            {sliceAngle > 10 && (
                              <text x={mx} y={my} fill="#fff" fontSize="12" textAnchor="middle" dominantBaseline="middle">{initials}</text>
                            )}
                          </g>
                        )
                      })
                    })()}
                  </svg>
                </div>
              </div>
            )}
          </section>
        )}

        {reportData?.lineItemsReport && lineItemReports.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ marginBottom: '24px' }}>Line Item Codes Report</h2>
            <div style={{ overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '40px' }}>Seq</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: '600', minWidth: '100px' }}>Code</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: '600', minWidth: '160px' }}>Category</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: '600', minWidth: '200px' }}>Description</th>
                    {monthKeys.map(monthKey => (
                      <th key={monthKey} style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {new Date(`${monthKey}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </th>
                    ))}
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemReports.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>{item.seq}</td>
                      <td style={{ padding: '8px 6px' }}>{item.code}</td>
                      <td style={{ padding: '8px 6px' }}>{item.category}</td>
                      <td style={{ padding: '8px 6px' }}>{item.description}</td>
                      {monthKeys.map(monthKey => (
                        <td key={monthKey} style={{ padding: '8px 6px', textAlign: 'right' }}>
                          {item.monthlyData[monthKey] && item.monthlyData[monthKey].cost > 0 ? `$${item.monthlyData[monthKey].cost.toFixed(2)}` : '-'}
                        </td>
                      ))}
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600' }}>${item.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: '600', backgroundColor: 'var(--bg)' }}>
                    <td colSpan={4} style={{ padding: '8px 6px' }}>TOTAL</td>
                    {monthKeys.map(monthKey => {
                      const monthTotal = lineItemReports.reduce((sum, item) => sum + (item.monthlyData[monthKey]?.cost || 0), 0)
                      return (
                        <td key={monthKey} style={{ padding: '8px 6px', textAlign: 'right' }}>
                          ${monthTotal.toFixed(2)}
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>${lineItemReports.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {reportData?.categoriesReport && categoryReports.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ marginBottom: '24px' }}>Line Item Categories</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--card)',
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '40px' }}>Seq</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', minWidth: '200px' }}>Category</th>
                    {monthKeys.map(monthKey => (
                      <th key={monthKey} style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {new Date(`${monthKey}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </th>
                    ))}
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReports.map((cat, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{cat.category}</td>
                      {monthKeys.map(monthKey => (
                        <td key={monthKey} style={{ padding: '8px 6px', textAlign: 'right' }}>
                          {cat.monthlyData[monthKey] && cat.monthlyData[monthKey].cost > 0 ? `$${cat.monthlyData[monthKey].cost.toFixed(2)}` : '-'}
                        </td>
                      ))}
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600' }}>${cat.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: '600', backgroundColor: 'var(--bg)' }}>
                    <td colSpan={2} style={{ padding: '8px 12px' }}>TOTAL</td>
                    {monthKeys.map(monthKey => {
                      const monthTotal = categoryReports.reduce((sum, cat) => sum + (cat.monthlyData[monthKey]?.cost || 0), 0)
                      return (
                        <td key={monthKey} style={{ padding: '8px 6px', textAlign: 'right' }}>
                          ${monthTotal.toFixed(2)}
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>${categoryReports.reduce((sum, cat) => sum + cat.cost, 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {categoryReports.length > 0 && (
              <div style={{ marginTop: '40px', display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: '20px' }}>Category Budget Distribution</h3>
                  <svg viewBox="0 0 200 200" style={{ width: '600px', height: '600px' }}>
                    {(() => {
                      const total = categoryReports.reduce((sum, cat) => sum + cat.cost, 0)
                      let currentAngle = -90
                      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
                      
                      return categoryReports.map((cat, idx) => {
                        const sliceAngle = (cat.cost / total) * 360
                        const startAngle = currentAngle
                        const endAngle = currentAngle + sliceAngle
                        
                        const startRad = (startAngle * Math.PI) / 180
                        const endRad = (endAngle * Math.PI) / 180
                        
                        const x1 = 100 + 80 * Math.cos(startRad)
                        const y1 = 100 + 80 * Math.sin(startRad)
                        const x2 = 100 + 80 * Math.cos(endRad)
                        const y2 = 100 + 80 * Math.sin(endRad)
                        
                        const largeArc = sliceAngle > 180 ? 1 : 0
                        const pathData = [
                          `M 100 100`,
                          `L ${x1} ${y1}`,
                          `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
                          `Z`
                        ].join(' ')
                        
                        const midAngle = startAngle + sliceAngle / 2
                        const mr = 55
                        const mx = 100 + mr * Math.cos((midAngle * Math.PI) / 180)
                        const my = 100 + mr * Math.sin((midAngle * Math.PI) / 180)
                        const abbr = cat.category.split(' ').map((w: string) => w[0]).join('').slice(0,4).toUpperCase()

                        currentAngle = endAngle
                        
                        return (
                          <g key={idx}>
                            <path d={pathData} fill={colors[idx % colors.length]} />
                            {sliceAngle > 10 && (
                              <text x={mx} y={my} fill="#fff" fontSize="12" textAnchor="middle" dominantBaseline="middle">{abbr}</text>
                            )}
                          </g>
                        )
                      })
                    })()}
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'flex-start', paddingTop: '60px' }}>
                  {categoryReports.map((cat, idx) => {
                    const total = categoryReports.reduce((sum, c) => sum + c.cost, 0)
                    const percentage = ((cat.cost / total) * 100).toFixed(1)
                    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: colors[idx % colors.length],
                          flexShrink: 0
                        }} />
                        <span>{cat.category}: {percentage}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
