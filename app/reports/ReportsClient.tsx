'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/app/lib/supabaseClient'
import { useAuth } from '@/app/lib/AuthContext'
import ShareModal from '@/components/ShareModal'

interface CarerReport {
  carerId: number
  carerName: string
  shiftHours: number
  totalCost: number
  color: string
  monthlyData?: { [monthKey: string]: { hours: number; cost: number } }
}

interface LineItemReport {
  category: string
  code: string
  description: string
  hours: number
  cost: number
}

interface LineItemCode {
  id: string
  code: string
  category: string | null
  description: string | null
}

interface CategoryReport {
  category: string
  hours: number
  cost: number
  monthlyData?: { [monthKey: string]: { hours: number; cost: number } }
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
  line_items?: { code: string; description: string | null; category: string | null }
}

export default function ReportsClient() {
  const { user, loading: authLoading } = useAuth();
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [carerReports, setCarerReports] = useState<CarerReport[]>([])
  const [lineItemReports, setLineItemReports] = useState<LineItemReport[]>([])
  const [lineItemCodes, setLineItemCodes] = useState<LineItemCode[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedLineItemCode, setSelectedLineItemCode] = useState('')
  const [hireupMapping, setHireupMapping] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([])
  const [loading, setLoading] = useState(true)
  const [carerColorsMap, setCarerColorsMap] = useState<Map<number, string>>(new Map())
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Load dates from localStorage on mount
  useEffect(() => {
    const savedDateFrom = localStorage.getItem('reports.dateFrom')
    const savedDateTo = localStorage.getItem('reports.dateTo')
    const savedHireupMapping = localStorage.getItem('reports.hireupMapping')
    
    if (savedDateFrom) setDateFrom(savedDateFrom)
    if (savedDateTo) setDateTo(savedDateTo)
    if (savedHireupMapping) setHireupMapping(savedHireupMapping)
  }, [])

  // Fetch line item codes and shifts data
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true)
      try {
        const supabase = getSupabaseClient()

        // Fetch line item codes
        const { data: codes } = await supabase
          .from('line_items')
          .select('*')
          .eq('user_id', user.id)
          .order('code')
        
        if (codes) setLineItemCodes(codes)

        // Fetch shifts
        let query = supabase.from('shifts').select('*').eq('user_id', user.id)
        
        if (dateFrom) {
          query = query.gte('shift_date', dateFrom)
        }
        if (dateTo) {
          query = query.lte('shift_date', dateTo)
        }

        const { data: shiftsData } = await query

        if (shiftsData) {
          // Fetch carers for enrichment
          const { data: carersData } = await supabase.from('carers').select('*').eq('user_id', user.id)
          const { data: lineItemsData } = await supabase.from('line_items').select('*').eq('user_id', user.id)

          // Build color map from carers data
          const colorMap = new Map<number, string>()
          if (carersData) {
            carersData.forEach(carer => {
              colorMap.set(carer.id, carer.color || '#22c55e')
            })
          }
          setCarerColorsMap(colorMap)

          const enrichedShifts = shiftsData.map(shift => ({
            ...shift,
            carers: carersData?.find(c => c.id === shift.carer_id),
            line_items: lineItemsData?.find(l => l.id === shift.line_item_code_id)
          }))

          setShifts(enrichedShifts)
        }
      } catch (error) {
        console.error('Error fetching reports data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateFrom, dateTo])

  // Save dates to localStorage
  useEffect(() => {
    if (dateFrom) localStorage.setItem('reports.dateFrom', dateFrom)
    else localStorage.removeItem('reports.dateFrom')
  }, [dateFrom])

  useEffect(() => {
    if (dateTo) localStorage.setItem('reports.dateTo', dateTo)
    else localStorage.removeItem('reports.dateTo')
  }, [dateTo])

  useEffect(() => {
    if (hireupMapping) localStorage.setItem('reports.hireupMapping', hireupMapping)
    else localStorage.removeItem('reports.hireupMapping')
  }, [hireupMapping])

  // Separate effect to recalculate reports when shifts or hireupMapping changes
  useEffect(() => {
    if (shifts.length > 0) {
      calculateReports(shifts, hireupMapping, carerColorsMap)
    }
  }, [shifts, hireupMapping, lineItemCodes, carerColorsMap])

  // Helper to generate month keys from date range
  const getMonthKeys = (): string[] => {
    if (!dateFrom || !dateTo) return []
    
    const months: string[] = []
    const start = new Date(dateFrom)
    const end = new Date(dateTo)
    
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
    
    while (current <= endMonth) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      months.push(monthKey)
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  const formatMonthKey = (monthKey: string): string => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const calculateReports = (shiftsData: Shift[], hireupCode: string, colorMap: Map<number, string>) => {
    // Calculate carer reports with monthly breakdown
    const carerMap = new Map<number, { hours: number; cost: number; name: string; monthlyData: Map<string, { hours: number; cost: number }> }>()
    const categoryMap = new Map<string, { hours: number; cost: number; monthlyData: Map<string, { hours: number; cost: number }> }>()

    shiftsData.forEach(shift => {
      if (!shift.carers) return
      
      const duration = calculateDuration(shift.time_from, shift.time_to)
      const key = shift.carer_id
      const shiftDate = new Date(shift.shift_date)
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!carerMap.has(key)) {
        carerMap.set(key, {
          hours: 0,
          cost: 0,
          name: `${shift.carers.first_name} ${shift.carers.last_name}`,
          monthlyData: new Map()
        })
      }
      
      const current = carerMap.get(key)!
      current.hours += duration
      current.cost += shift.cost || 0
      
      // Add to monthly data
      if (!current.monthlyData.has(monthKey)) {
        current.monthlyData.set(monthKey, { hours: 0, cost: 0 })
      }
      const monthData = current.monthlyData.get(monthKey)!
      monthData.hours += duration
      monthData.cost += shift.cost || 0
    })

    const carerReportArray = Array.from(carerMap.entries()).map(([carerId, data]) => {
      const monthlyDataObj: { [key: string]: { hours: number; cost: number } } = {}
      data.monthlyData.forEach((value, key) => {
        monthlyDataObj[key] = {
          hours: Math.round(value.hours * 100) / 100,
          cost: Math.round(value.cost * 100) / 100
        }
      })
      
      return {
        carerId,
        carerName: data.name,
        shiftHours: Math.round(data.hours * 100) / 100,
        totalCost: Math.round(data.cost * 100) / 100,
        color: colorMap.get(carerId) || '#22c55e',
        monthlyData: monthlyDataObj
      }
    })

    setCarerReports(carerReportArray)

    // Calculate line item code reports
    const lineItemMap = new Map<string, { hours: number; cost: number; code: string; category: string; description: string }>()

    shiftsData.forEach(shift => {
      let codeId: string | null = null
      if (shift.line_item_code_id !== null && shift.line_item_code_id !== undefined) {
        codeId = String(shift.line_item_code_id)
      }
      
      // Map HIREUP to selected code
      if (shift.category === 'HIREUP' && hireupCode) {
        codeId = hireupCode
      }

      if (!codeId) return

      const duration = calculateDuration(shift.time_from, shift.time_to)
      const lineItem = lineItemCodes.find(l => String(l.id) === codeId)
      const categoryName = lineItem?.category || shift.category || 'Uncategorized'
      
      if (!lineItemMap.has(codeId)) {
        lineItemMap.set(codeId, {
          hours: 0,
          cost: 0,
          code: lineItem?.code || codeId,
          category: categoryName,
          description: lineItem?.description || ''
        })
      }

      const current = lineItemMap.get(codeId)!
      current.hours += duration
      current.cost += shift.cost || 0

      // Track category data with monthly breakdown
      const shiftDate = new Date(shift.shift_date)
      const monthKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { hours: 0, cost: 0, monthlyData: new Map() })
      }
      const categoryBucket = categoryMap.get(categoryName)!
      categoryBucket.hours += duration
      categoryBucket.cost += shift.cost || 0
      
      // Add to monthly data
      if (!categoryBucket.monthlyData.has(monthKey)) {
        categoryBucket.monthlyData.set(monthKey, { hours: 0, cost: 0 })
      }
      const categoryMonthData = categoryBucket.monthlyData.get(monthKey)!
      categoryMonthData.hours += duration
      categoryMonthData.cost += shift.cost || 0
    })

    const lineItemReportArray = Array.from(lineItemMap.entries())
      .map(([codeId, data]) => ({
        category: data.category,
        code: data.code,
        description: data.description,
        hours: Math.round(data.hours * 100) / 100,
        cost: Math.round(data.cost * 100) / 100
      }))
      .sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category)
        if (categoryCompare !== 0) return categoryCompare
        return b.hours - a.hours
      })

    const categoryReportArray = Array.from(categoryMap.entries())
      .map(([category, data]) => {
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
      })
      .sort((a, b) => b.cost - a.cost)

    setLineItemReports(lineItemReportArray)
    setCategoryReports(categoryReportArray)
  }

  const calculateDuration = (timeFrom: string, timeTo: string): number => {
    const from = new Date(timeFrom)
    const to = new Date(timeTo)
    return (to.getTime() - from.getTime()) / (1000 * 60 * 60)
  }

  const handleGenerateShareLink = async (reports: {
    carersReport: boolean
    lineItemsReport: boolean
    categoriesReport: boolean
  }) => {
    if (!user) {
      alert('You must be logged in to share reports')
      return null
    }

    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/share-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          carersReport: reports.carersReport,
          lineItemsReport: reports.lineItemsReport,
          categoriesReport: reports.categoriesReport,
          dateFrom,
          dateTo
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate share link')
      }

      const json = await res.json()
      return { shareUrl: json.shareUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate share link'
      throw new Error(message)
    }
  }

  const categories = Array.from(new Set(lineItemCodes.map(l => l.category).filter(Boolean))) as string[]
  const filteredCodes = selectedCategory
    ? lineItemCodes.filter(l => l.category === selectedCategory)
    : []

  const carerTotalHours = carerReports.reduce((sum, c) => sum + c.shiftHours, 0)
  const carerTotalCost = carerReports.reduce((sum, c) => sum + c.totalCost, 0)

  const lineItemTotalHours = lineItemReports.reduce((sum, l) => sum + l.hours, 0)
  const lineItemTotalCost = lineItemReports.reduce((sum, l) => sum + l.cost, 0)
  const categoryTotalHours = categoryReports.reduce((sum, c) => sum + c.hours, 0)
  const categoryTotalCost = categoryReports.reduce((sum, c) => sum + c.cost, 0)

  const normalizeDateInput = (value: string): string => {
    if (!value) return ''
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return ''
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="reports-container">
      <h1>Reports</h1>

      {/* Date Range Controls */}
      <div className="reports-date-range">
        <label className="reports-field">
          <span>Date from</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(normalizeDateInput(e.target.value))}
          />
        </label>
        <label className="reports-field">
          <span>Date to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(normalizeDateInput(e.target.value))}
          />
        </label>
        <button
          onClick={() => {
            setDateFrom('')
            setDateTo('')
          }}
          className="reports-btn-clear"
        >
          Clear Dates
        </button>
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="reports-btn-share"
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Share Report
        </button>
      </div>

      {loading ? (
        <div className="reports-loading">Loading reports...</div>
      ) : (
        <>
          {/* Section 1: Carers */}
          <section className="reports-section">
            <h2>Carers Report</h2>
            
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Carer Name</th>
                    {getMonthKeys().map(monthKey => (
                      <th key={monthKey} style={{ textAlign: 'right' }}>
                        {formatMonthKey(monthKey)}
                      </th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {carerReports.length === 0 ? (
                    <tr>
                      <td colSpan={3 + getMonthKeys().length} style={{ textAlign: 'center' }}>
                        No data for selected period
                      </td>
                    </tr>
                  ) : (
                    <>
                      {carerReports.map((carer, idx) => (
                        <tr key={carer.carerId}>
                          <td>{idx + 1}</td>
                          <td>{carer.carerName}</td>
                          {getMonthKeys().map(monthKey => {
                            const monthData = carer.monthlyData?.[monthKey]
                            return (
                              <td key={monthKey} style={{ textAlign: 'right' }}>
                                {monthData ? `$${monthData.cost.toFixed(2)}` : '-'}
                              </td>
                            )
                          })}
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            ${carer.totalCost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="reports-total-row">
                        <td colSpan={2} style={{ fontWeight: 'bold' }}>
                          TOTAL
                        </td>
                        {getMonthKeys().map(monthKey => {
                          const monthTotal = carerReports.reduce((sum, carer) => {
                            const monthData = carer.monthlyData?.[monthKey]
                            return sum + (monthData?.cost || 0)
                          }, 0)
                          return (
                            <td key={monthKey} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                              ${monthTotal.toFixed(2)}
                            </td>
                          )
                        })}
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ${carerTotalCost.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie Charts */}
            <div className="reports-charts">
              <div className="reports-chart-placeholder">
                <h3>Carers Time Distribution</h3>
                {carerReports.length > 0 ? (
                  <svg viewBox="0 0 450 450" className="reports-pie-svg" style={{ width: '450px', height: '450px' }}>
                    {(() => {
                      let currentAngle = -90
                      
                      return carerReports.map((carer, idx) => {
                        const sliceAngle = (carer.shiftHours / carerTotalHours) * 360
                        const startAngle = currentAngle
                        const endAngle = currentAngle + sliceAngle
                        
                        const startRad = (startAngle * Math.PI) / 180
                        const endRad = (endAngle * Math.PI) / 180
                        
                        const x1 = 225 + 180 * Math.cos(startRad)
                        const y1 = 225 + 180 * Math.sin(startRad)
                        const x2 = 225 + 180 * Math.cos(endRad)
                        const y2 = 225 + 180 * Math.sin(endRad)
                        
                        const largeArc = sliceAngle > 180 ? 1 : 0
                        
                        const path = `M 225 225 L ${x1} ${y1} A 180 180 0 ${largeArc} 1 ${x2} ${y2} Z`
                        
                        // Calculate mid-angle for label placement
                        const midAngle = (startAngle + endAngle) / 2
                        const midRad = (midAngle * Math.PI) / 180
                        
                        // Get initials from carer name
                        const initials = carer.carerName
                          .split(' ')
                          .map(word => word[0])
                          .join('')
                          .toUpperCase()
                        
                        // Small slice threshold (less than 5%)
                        const isSmallSlice = sliceAngle < 18
                        
                        currentAngle = endAngle
                        
                        if (isSmallSlice) {
                          // External label with leader line
                          const labelRadius = 220
                          const lineStartRadius = 190
                          const labelX = 225 + labelRadius * Math.cos(midRad)
                          const labelY = 225 + labelRadius * Math.sin(midRad)
                          const lineStartX = 225 + lineStartRadius * Math.cos(midRad)
                          const lineStartY = 225 + lineStartRadius * Math.sin(midRad)
                          
                          return (
                            <g key={idx}>
                              <path
                                d={path}
                                fill={carer.color}
                                stroke="var(--card)"
                                strokeWidth="3"
                              />
                              <line
                                x1={lineStartX}
                                y1={lineStartY}
                                x2={labelX}
                                y2={labelY}
                                stroke={carer.color}
                                strokeWidth="2"
                              />
                              <text
                                x={labelX}
                                y={labelY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="18"
                                fontWeight="bold"
                                fill="white"
                                stroke="#000"
                                strokeWidth="0.5"
                                style={{ pointerEvents: 'none' }}
                              >
                                {initials}
                              </text>
                            </g>
                          )
                        } else {
                          // Internal label
                          const textX = 225 + 127.5 * Math.cos(midRad)
                          const textY = 225 + 127.5 * Math.sin(midRad)
                          
                          return (
                            <g key={idx}>
                              <path
                                d={path}
                                fill={carer.color}
                                stroke="var(--card)"
                                strokeWidth="3"
                              />
                              <text
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="21"
                                fontWeight="bold"
                                fill="white"
                                stroke="#000"
                                strokeWidth="0.5"
                                style={{ pointerEvents: 'none' }}
                              >
                                {initials}
                              </text>
                            </g>
                          )
                        }
                      })
                    })()}
                  </svg>
                ) : (
                  <p style={{ color: '#999' }}>No data</p>
                )}
                <div className="reports-chart-legend">
                  {carerReports.map((carer, idx) => {
                    const percentage = (carer.shiftHours / carerTotalHours) * 100
                    return (
                      <div key={idx} className="reports-legend-item">
                        <span 
                          className="reports-legend-color" 
                          style={{ backgroundColor: carer.color }}
                        />
                        <span className="reports-legend-text">
                          {carer.carerName}: {percentage.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="reports-chart-placeholder">
                <h3>Carers Total Cost Distribution</h3>
                {carerReports.length > 0 ? (
                  <svg viewBox="0 0 450 450" className="reports-pie-svg" style={{ width: '450px', height: '450px' }}>
                    {(() => {
                      let currentAngle = -90
                      
                      return carerReports.map((carer, idx) => {
                        const sliceAngle = (carer.totalCost / carerTotalCost) * 360
                        const startAngle = currentAngle
                        const endAngle = currentAngle + sliceAngle
                        
                        const startRad = (startAngle * Math.PI) / 180
                        const endRad = (endAngle * Math.PI) / 180
                        
                        const x1 = 225 + 180 * Math.cos(startRad)
                        const y1 = 225 + 180 * Math.sin(startRad)
                        const x2 = 225 + 180 * Math.cos(endRad)
                        const y2 = 225 + 180 * Math.sin(endRad)
                        
                        const largeArc = sliceAngle > 180 ? 1 : 0
                        
                        const path = `M 225 225 L ${x1} ${y1} A 180 180 0 ${largeArc} 1 ${x2} ${y2} Z`
                        
                        // Calculate mid-angle for label placement
                        const midAngle = (startAngle + endAngle) / 2
                        const midRad = (midAngle * Math.PI) / 180
                        
                        // Get initials from carer name
                        const initials = carer.carerName
                          .split(' ')
                          .map(word => word[0])
                          .join('')
                          .toUpperCase()
                        
                        // Small slice threshold (less than 5%)
                        const isSmallSlice = sliceAngle < 18
                        
                        currentAngle = endAngle
                        
                        if (isSmallSlice) {
                          // External label with leader line
                          const labelRadius = 220
                          const lineStartRadius = 190
                          const labelX = 225 + labelRadius * Math.cos(midRad)
                          const labelY = 225 + labelRadius * Math.sin(midRad)
                          const lineStartX = 225 + lineStartRadius * Math.cos(midRad)
                          const lineStartY = 225 + lineStartRadius * Math.sin(midRad)
                          
                          return (
                            <g key={idx}>
                              <path
                                d={path}
                                fill={carer.color}
                                stroke="var(--card)"
                                strokeWidth="3"
                              />
                              <line
                                x1={lineStartX}
                                y1={lineStartY}
                                x2={labelX}
                                y2={labelY}
                                stroke={carer.color}
                                strokeWidth="2"
                              />
                              <text
                                x={labelX}
                                y={labelY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="18"
                                fontWeight="bold"
                                fill="white"
                                stroke="#000"
                                strokeWidth="0.5"
                                style={{ pointerEvents: 'none' }}
                              >
                                {initials}
                              </text>
                            </g>
                          )
                        } else {
                          // Internal label
                          const textX = 225 + 127.5 * Math.cos(midRad)
                          const textY = 225 + 127.5 * Math.sin(midRad)
                          
                          return (
                            <g key={idx}>
                              <path
                                d={path}
                                fill={carer.color}
                                stroke="var(--card)"
                                strokeWidth="3"
                              />
                              <text
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="21"
                                fontWeight="bold"
                                fill="white"
                                stroke="#000"
                                strokeWidth="0.5"
                                style={{ pointerEvents: 'none' }}
                              >
                                {initials}
                              </text>
                            </g>
                          )
                        }
                      })
                    })()}
                  </svg>
                ) : (
                  <p style={{ color: '#999' }}>No data</p>
                )}
                <div className="reports-chart-legend">
                  {carerReports.map((carer, idx) => {
                    const percentage = (carer.totalCost / carerTotalCost) * 100
                    return (
                      <div key={idx} className="reports-legend-item">
                        <span 
                          className="reports-legend-color" 
                          style={{ backgroundColor: carer.color }}
                        />
                        <span className="reports-legend-text">
                          {carer.carerName}: {percentage.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </section>

          {/* Section 2: Line Item Codes */}
          <section className="reports-section">
            <h2>Line Item Codes Report</h2>

            {/* HIREUP Mapping */}
            <div className="reports-hireup-selector">
              <label className="reports-field">
                <span>HIREUP Line Item Code</span>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => {
                    const val = e.target.value || null
                    setSelectedCategory(val)
                    setSelectedLineItemCode('')
                  }}
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCategory && filteredCodes.length > 0 && (
                <label className="reports-field">
                  <span>Code</span>
                  <select
                    value={selectedLineItemCode}
                    onChange={(e) => setSelectedLineItemCode(e.target.value)}
                  >
                    <option value="">Select code...</option>
                    {filteredCodes.map(code => (
                      <option key={code.id} value={code.id}>
                        {code.code} - {code.description || 'No description'}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedLineItemCode && filteredCodes.find(c => c.id === selectedLineItemCode) && (
                <button
                  onClick={() => setHireupMapping(selectedLineItemCode)}
                  className="reports-btn-apply"
                >
                  Apply Mapping
                </button>
              )}

              {hireupMapping && (
                <div className="reports-hireup-status">
                  Mapped to:{' '}
                  {lineItemCodes.find(l => l.id === hireupMapping)?.code ||
                    hireupMapping}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Hours</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>
                        No data for selected period
                      </td>
                    </tr>
                  ) : (
                    <>
                      {lineItemReports.map((item, idx) => (
                        <tr key={`${item.category}-${item.code}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{item.code}</td>
                          <td>{item.description}</td>
                          <td>{item.hours.toFixed(2)}</td>
                          <td>${item.cost.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="reports-total-row">
                        <td colSpan={3} style={{ fontWeight: 'bold' }}>
                          TOTAL
                        </td>
                        <td style={{ fontWeight: 'bold' }}>
                          {lineItemTotalHours.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 'bold' }}>
                          ${lineItemTotalCost.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '12px' }}>Line Item Categories</h3>
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Category</th>
                    {getMonthKeys().map(monthKey => (
                      <th key={monthKey} style={{ textAlign: 'right' }}>
                        {formatMonthKey(monthKey)}
                      </th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReports.length === 0 ? (
                    <tr>
                      <td colSpan={3 + getMonthKeys().length} style={{ textAlign: 'center' }}>
                        No data for selected period
                      </td>
                    </tr>
                  ) : (
                    <>
                      {categoryReports.map((item, idx) => (
                        <tr key={`${item.category}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{item.category}</td>
                          {getMonthKeys().map(monthKey => {
                            const monthData = item.monthlyData?.[monthKey]
                            return (
                              <td key={monthKey} style={{ textAlign: 'right' }}>
                                {monthData ? `$${monthData.cost.toFixed(2)}` : '-'}
                              </td>
                            )
                          })}
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            ${item.cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="reports-total-row">
                        <td colSpan={2} style={{ fontWeight: 'bold' }}>
                          TOTAL
                        </td>
                        {getMonthKeys().map(monthKey => {
                          const monthTotal = categoryReports.reduce((sum, cat) => {
                            const monthData = cat.monthlyData?.[monthKey]
                            return sum + (monthData?.cost || 0)
                          }, 0)
                          return (
                            <td key={monthKey} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                              ${monthTotal.toFixed(2)}
                            </td>
                          )
                        })}
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ${categoryTotalCost.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Category Budget Distribution Chart */}
            <h3 style={{ marginTop: '32px', marginBottom: '12px' }}>Category Budget Distribution</h3>
            <div className="reports-table-wrapper" style={{ maxWidth: '600px' }}>
              {categoryReports.length > 0 ? (
                <svg viewBox="0 0 450 450" className="reports-pie-svg" style={{ width: '450px', height: '450px' }}>
                  {(() => {
                    let currentAngle = -90
                    const totalCost = categoryTotalCost || 1
                    const colors = [
                      '#3b82f6', '#ef4444', '#22c55e', '#f97316',
                      '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'
                    ]

                    return categoryReports.map((cat, idx) => {
                      const sliceAngle = (cat.cost / totalCost) * 360
                      const startAngle = currentAngle
                      const endAngle = currentAngle + sliceAngle

                      const startRad = (startAngle * Math.PI) / 180
                      const endRad = (endAngle * Math.PI) / 180

                      const x1 = 225 + 180 * Math.cos(startRad)
                      const y1 = 225 + 180 * Math.sin(startRad)
                      const x2 = 225 + 180 * Math.cos(endRad)
                      const y2 = 225 + 180 * Math.sin(endRad)

                      const largeArc = sliceAngle > 180 ? 1 : 0

                      const path = `M 225 225 L ${x1} ${y1} A 180 180 0 ${largeArc} 1 ${x2} ${y2} Z`

                      // Calculate mid-angle for label placement
                      const midAngle = (startAngle + endAngle) / 2
                      const midRad = (midAngle * Math.PI) / 180
                      
                      // Get category abbreviation (first 2 letters)
                      const abbrev = cat.category.substring(0, 2).toUpperCase()
                      
                      // Small slice threshold (less than 5%)
                      const isSmallSlice = sliceAngle < 18 // 5% of 360 degrees
                      
                      currentAngle = endAngle

                      if (isSmallSlice) {
                        // External label with leader line
                        const labelRadius = 220
                        const lineStartRadius = 190
                        const labelX = 225 + labelRadius * Math.cos(midRad)
                        const labelY = 225 + labelRadius * Math.sin(midRad)
                        const lineStartX = 225 + lineStartRadius * Math.cos(midRad)
                        const lineStartY = 225 + lineStartRadius * Math.sin(midRad)
                        
                        return (
                          <g key={idx}>
                            <path
                              d={path}
                              fill={colors[idx % colors.length]}
                              stroke="var(--card)"
                              strokeWidth="3"
                            />
                            <line
                              x1={lineStartX}
                              y1={lineStartY}
                              x2={labelX}
                              y2={labelY}
                              stroke={colors[idx % colors.length]}
                              strokeWidth="2"
                            />
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="18"
                              fontWeight="bold"
                              fill="white"
                              stroke="#000"
                              strokeWidth="0.5"
                              style={{ pointerEvents: 'none' }}
                            >
                              {abbrev}
                            </text>
                          </g>
                        )
                      } else {
                        // Internal label
                        const textX = 225 + 127.5 * Math.cos(midRad)
                        const textY = 225 + 127.5 * Math.sin(midRad)
                        
                        return (
                          <g key={idx}>
                            <path
                              d={path}
                              fill={colors[idx % colors.length]}
                              stroke="var(--card)"
                              strokeWidth="3"
                            />
                            <text
                              x={textX}
                              y={textY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="21"
                              fontWeight="bold"
                              fill="white"
                              stroke="#000"
                              strokeWidth="0.5"
                              style={{ pointerEvents: 'none' }}
                            >
                              {abbrev}
                            </text>
                          </g>
                        )
                      }
                    })
                  })()}
                </svg>
              ) : (
                <p style={{ color: '#999' }}>No data</p>
              )}
              <div className="reports-chart-legend">
                {categoryReports.map((cat, idx) => {
                  const totalCost = categoryTotalCost || 1
                  const percentage = (cat.cost / totalCost) * 100
                  const colors = [
                    '#3b82f6', '#ef4444', '#22c55e', '#f97316',
                    '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'
                  ]
                  return (
                    <div key={idx} className="reports-legend-item">
                      <span
                        className="reports-legend-color"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      />
                      <span className="reports-legend-text">
                        {cat.category}: {percentage.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .reports-container {
          padding: 24px;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          max-height: 100vh;
          overflow-y: auto;
        }

        h1 {
          margin: 0 0 24px 0;
          font-size: 2rem;
        }

        .reports-date-range {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .reports-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reports-field span {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .reports-field input,
        .reports-field select {
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.95rem;
          min-width: 160px;
        }

        .reports-btn-clear,
        .reports-btn-apply {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .reports-btn-clear:hover,
        .reports-btn-apply:hover {
          background: #2563eb;
        }

        .reports-section {
          margin-bottom: 48px;
          padding: 24px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .reports-section h2 {
          margin: 0 0 20px 0;
          font-size: 1.3rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .reports-loading {
          text-align: center;
          padding: 40px;
          color: var(--muted);
          font-size: 1.1rem;
        }

        .reports-table-wrapper {
          overflow-x: auto;
          margin-bottom: 24px;
        }

        .reports-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--card);
          border: 1px solid var(--border);
        }

        .reports-table th {
          background: var(--border);
          color: var(--text);
          padding: 12px;
          text-align: left;
          font-weight: 700;
          border-bottom: 1px solid var(--border);
        }

        .reports-table td {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }

        .reports-table tr:hover {
          background: rgba(125, 211, 252, 0.05);
        }

        .reports-total-row {
          background: rgba(59, 130, 246, 0.1);
          font-weight: 700;
        }

        .reports-total-row td {
          padding: 14px 12px;
          border-top: 2px solid var(--border);
        }

        .reports-charts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .reports-chart-placeholder {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
          min-height: 300px;
        }

        .reports-chart-placeholder h3 {
          margin: 0 0 16px 0;
          font-size: 1rem;
          color: var(--text);
        }

        .reports-chart-legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reports-legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }

        .reports-legend-color {
          width: 16px;
          height: 16px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .reports-legend-text {
          color: var(--text);
          font-size: 0.95rem;
          word-break: break-word;
        }

        .reports-pie-svg {
          width: 300px;
          height: 300px;
          margin: 0 auto 20px;
        }

        .pie-chart {
          width: 100%;
          max-width: 300px;
        }

        .reports-hireup-selector {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: flex-end;
          padding: 16px;
          background: var(--card);
          border-radius: 6px;
        }

        .reports-hireup-status {
          padding: 8px 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid #22c55e;
          border-radius: 6px;
          color: #86efac;
          font-size: 0.9rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .reports-charts {
            grid-template-columns: 1fr;
          }

          .reports-date-range {
            flex-direction: column;
          }

          .reports-field input,
          .reports-field select {
            min-width: 100%;
          }
        }
      `}</style>

      <ShareModal
        isOpen={isShareModalOpen}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onClose={() => setIsShareModalOpen(false)}
        onGenerate={handleGenerateShareLink}
      />
    </div>
  )
}
