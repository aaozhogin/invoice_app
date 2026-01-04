'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/app/lib/supabaseClient'
import { useCalendarSidebar } from '@/app/CalendarSidebarContext'

interface Shift {
  id: number
  time_from: string
  time_to: string
  carer_id: number
  client_id?: number
  line_item_code_id: number
  cost: number
  shift_date: string
  category?: string | null
  created_at?: string
  updated_at?: string
  // Relations
  carers?: Carer
  clients?: Client
  line_items?: LineItemCode
}

interface Carer {
  id: number
  first_name: string
  last_name: string
  billed_rates: number
  color?: string  // Optional since the column might not exist in database yet
}

interface LineItemCode {
  id: string
  code?: string | null
  description: string | null
  category: string | null
  time_from?: string | null  // Database actually uses time_from
  time_to?: string | null    // Database actually uses time_to
  billed_rate?: number | null
  max_rate?: number | null   // Database uses max_rate instead of pay_rate
  weekday?: boolean | null
  saturday?: boolean | null
  sunday?: boolean | null
  sleepover?: boolean | null
  public_holiday?: boolean | null
}

interface Client {
  id: number
  first_name: string
  last_name: string
}

// Default colors for carers who don't have colors assigned
const DEFAULT_CARER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#6366f1', // Indigo
]

const HOUR_HEIGHT = 35
const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4

interface NewShift {
  shift_date: string
  start_time: string
  end_time: string
  carer_id: number | null
  client_id: number | null
  category: string | null
  line_item_code_id: string | null
  is_sleepover: boolean
  is_public_holiday: boolean
  hireup_cost?: number | null
}

// Helper to initialize currentDate from localStorage
function getInitialCurrentDate(): Date {
  try {
    const stored = localStorage.getItem('calendar.currentDate')
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      const [year, month, day] = stored.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
  } catch {
    // ignore
  }
  return new Date()
}

// Helper to initialize selectedClientId from localStorage
function getInitialSelectedClientId(): number | null {
  try {
    const stored = localStorage.getItem('calendar.selectedClientId')
    if (stored) return Number(stored)
  } catch {
    // ignore
  }
  return null
}

// Helper to initialize viewMode from localStorage
function getInitialViewMode(): 'day' | 'week' {
  try {
    const stored = localStorage.getItem('calendar.viewMode')
    if (stored === 'week' || stored === 'day') return stored
  } catch {
    // ignore
  }
  return 'day'
}

export default function CalendarClient() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState<Date>(getInitialCurrentDate)
  const [viewMode, setViewMode] = useState<'day' | 'week'>(getInitialViewMode)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [dateRangeError, setDateRangeError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(getInitialSelectedClientId)
  const [showCopyDayDialog, setShowCopyDayDialog] = useState(false)
  const [copyDaySelected, setCopyDaySelected] = useState<string[]>([])
  const [copyDayIsWorking, setCopyDayIsWorking] = useState(false)
  const [copyDayError, setCopyDayError] = useState<string | null>(null)
  const [showCopyWeekDialog, setShowCopyWeekDialog] = useState(false)
  const [copyWeekSelected, setCopyWeekSelected] = useState<string[]>([])
  const [copyWeekIsWorking, setCopyWeekIsWorking] = useState(false)
  const [copyWeekError, setCopyWeekError] = useState<string | null>(null)
  const [deleteAllShiftsDateConfirm, setDeleteAllShiftsDateConfirm] = useState<string | null>(null)
  const [showCopyShiftDialog, setShowCopyShiftDialog] = useState(false)
  const [copyShiftSelected, setCopyShiftSelected] = useState<string[]>([])
  const [copyShiftIsWorking, setCopyShiftIsWorking] = useState(false)
  const [copyShiftError, setCopyShiftError] = useState<string | null>(null)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceCarerIds, setInvoiceCarerIds] = useState<number[]>([])
  const [invoiceCarerOptions, setInvoiceCarerOptions] = useState<{ carer: Carer; count: number }[]>([])
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [invoiceSuccess, setInvoiceSuccess] = useState<{ fileName: string; fileData: string; mimeType: string; invoiceDate?: string; dueDate?: string } | null>(null)
  const [invoiceIsGenerating, setInvoiceIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [carers, setCarers] = useState<Carer[]>([])
  const [lineItemCodes, setLineItemCodes] = useState<LineItemCode[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([]) // Add shifts state
  const [rangeShifts, setRangeShifts] = useState<Shift[]>([])
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const { carerTotals, overlapSummary, overallTotals, setCarerTotals, setOverlapSummary, setOverallTotals } = useCalendarSidebar()
  
  // Drag and resize state
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    isResizing: boolean
    shiftId: number | null
    dragType: 'move' | 'resize-top' | 'resize-bottom' | null
    startY: number
    startTime: string
    endTime: string
    originalShift: Shift | null
  }>({
    isDragging: false,
    isResizing: false,
    shiftId: null,
    dragType: null,
    startY: 0,
    startTime: '',
    endTime: '',
    originalShift: null
  }) // Add editing state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number>(0)
  const [dragEnd, setDragEnd] = useState<number>(0)
  const [weekDragState, setWeekDragState] = useState({
    isDragging: false,
    dayYmd: '',
    startY: 0,
    endY: 0,
    timelineRef: null as HTMLElement | null
  })
  const [showShiftDialog, setShowShiftDialog] = useState(false)
  const [newShift, setNewShift] = useState<NewShift>({
    shift_date: '',
    start_time: '',
    end_time: '',
    carer_id: null,
    client_id: null,
    category: null,
    line_item_code_id: null,
    is_sleepover: false,
    is_public_holiday: false,
    hireup_cost: null
  })
  const [error, setError] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Time conversion utilities (defined early for use in effects)
  const timeStringToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  const minutesToTimeString = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    fetchData()
  }, [currentDate, dateFrom, dateTo, selectedClientId, viewMode])

  // Effect for drag event listeners
  useEffect(() => {
    if (!dragState.isDragging && !dragState.isResizing) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragState.startY
      const deltaMinutes = Math.round((deltaY / 60) * 15) * 15 // Snap to 15-minute intervals
      
      if (dragState.dragType === 'move') {
        const originalStartMinutes = timeStringToMinutes(dragState.startTime)
        const originalEndMinutes = timeStringToMinutes(dragState.endTime)
        const duration = originalEndMinutes - originalStartMinutes
        
        const newStartMinutes = Math.max(0, Math.min(24 * 60 - duration, originalStartMinutes + deltaMinutes))
        
        const shiftElement = document.querySelector(`[data-shift-id="${dragState.shiftId}"]`) as HTMLElement
        if (shiftElement) {
          shiftElement.style.top = `${newStartMinutes}px`
        }
      } else if (dragState.dragType === 'resize-top') {
        const originalStartMinutes = timeStringToMinutes(dragState.startTime)
        const originalEndMinutes = timeStringToMinutes(dragState.endTime)
        
        const newStartMinutes = Math.max(0, Math.min(originalEndMinutes - 15, originalStartMinutes + deltaMinutes))
        
        const shiftElement = document.querySelector(`[data-shift-id="${dragState.shiftId}"]`) as HTMLElement
        if (shiftElement) {
          shiftElement.style.top = `${newStartMinutes}px`
          shiftElement.style.height = `${originalEndMinutes - newStartMinutes}px`
        }
      } else if (dragState.dragType === 'resize-bottom') {
        const originalStartMinutes = timeStringToMinutes(dragState.startTime)
        const originalEndMinutes = timeStringToMinutes(dragState.endTime)
        
        const newEndMinutes = Math.max(originalStartMinutes + 15, Math.min(24 * 60, originalEndMinutes + deltaMinutes))
        
        const shiftElement = document.querySelector(`[data-shift-id="${dragState.shiftId}"]`) as HTMLElement
        if (shiftElement) {
          shiftElement.style.height = `${newEndMinutes - originalStartMinutes}px`
        }
      }
    }
    
    const handleMouseUp = async (e: MouseEvent) => {
      const deltaY = e.clientY - dragState.startY
      const deltaMinutes = Math.round((deltaY / 60) * 15) * 15
      
      let newStartTime = dragState.startTime
      let newEndTime = dragState.endTime
      
      if (dragState.dragType === 'move') {
        const originalStartMinutes = timeStringToMinutes(dragState.startTime)
        const originalEndMinutes = timeStringToMinutes(dragState.endTime)
        const duration = originalEndMinutes - originalStartMinutes
        
        const newStartMinutes = Math.max(0, Math.min(24 * 60 - duration, originalStartMinutes + deltaMinutes))
        const newEndMinutes = newStartMinutes + duration
        
        newStartTime = minutesToTimeString(newStartMinutes)
        newEndTime = minutesToTimeString(newEndMinutes)
      } else if (dragState.dragType === 'resize-top') {
        const originalStartMinutes = timeStringToMinutes(dragState.startTime)
        const originalEndMinutes = timeStringToMinutes(dragState.endTime)
        
        const newStartMinutes = Math.max(0, Math.min(originalEndMinutes - 15, originalStartMinutes + deltaMinutes))
        newStartTime = minutesToTimeString(newStartMinutes)
      } else if (dragState.dragType === 'resize-bottom') {
        const originalStartMinutes = timeStringToMinutes(dragState.startTime)
        const originalEndMinutes = timeStringToMinutes(dragState.endTime)
        
        const newEndMinutes = Math.max(originalStartMinutes + 15, Math.min(24 * 60, originalEndMinutes + deltaMinutes))
        newEndTime = minutesToTimeString(newEndMinutes)
      }
      
      // Only update if times have actually changed
      if (newStartTime !== dragState.startTime || newEndTime !== dragState.endTime) {
        await updateShiftTimes(dragState.shiftId!, newStartTime, newEndTime)
      }
      
      // Reset drag state
      setDragState({
        isDragging: false,
        isResizing: false,
        shiftId: null,
        dragType: null,
        startY: 0,
        startTime: '',
        endTime: '',
        originalShift: null
      })
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState])

  const fetchData = async () => {
    try {
      console.log('🔄 Starting fetchData...')
      const supabase = getSupabaseClient()
      console.log('✅ Supabase client created')
      
      const dayYmd = toYmdLocal(currentDate)
      
      // For footer totals, always use the full dateFrom/dateTo range
      let footerRangeFrom = dateFrom || dayYmd
      let footerRangeTo = dateTo || dayYmd

      // For week view display, use the current week
      let displayRangeFrom = footerRangeFrom
      let displayRangeTo = footerRangeTo
      
      if (viewMode === 'week') {
        const monday = getMonday(currentDate)
        const sunday = getSunday(currentDate)
        displayRangeFrom = toYmdLocal(monday)
        displayRangeTo = toYmdLocal(sunday)
        console.log('📅 Week view display range:', { displayRangeFrom, displayRangeTo, currentDate: toYmdLocal(currentDate) })
      }

      // For the current day view, also load shifts from the previous day to catch overnight shifts
      const prevDay = new Date(currentDate)
      prevDay.setDate(prevDay.getDate() - 1)
      const prevDayYmd = toYmdLocal(prevDay)

      const [carersRes, lineItemCodesRes, clientsRes, shiftsRes, prevDayShiftsRes, rangeShiftsRes, footerShiftsRes] = await Promise.all([
        supabase.from('carers').select('*, color').order('first_name'),
        supabase.from('line_items').select('id, code, category, description, time_from, time_to, billed_rate, weekday, saturday, sunday, sleepover, public_holiday').order('category'),
        supabase.from('clients').select('*').order('first_name'),
        // Load shifts for the current day
        supabase.from('shifts').select(`
          *, 
          carers(id, first_name, last_name, email, color), 
          line_items(id, code, category, description, billed_rate)
        `).eq('shift_date', dayYmd).order('time_from'),
        // Load shifts from previous day (to catch overnight shifts extending into today)
        supabase.from('shifts').select(`
          *, 
          carers(id, first_name, last_name, email, color), 
          line_items(id, code, category, description, billed_rate)
        `).eq('shift_date', prevDayYmd).order('time_from'),
        // Load shifts for week view display
        supabase.from('shifts').select(`
          *,
          carers(id, first_name, last_name, email, color),
          clients(id, first_name, last_name),
          line_items(id, code, category, description, billed_rate, sleepover, public_holiday)
        `).gte('shift_date', displayRangeFrom).lte('shift_date', displayRangeTo),
        // Load shifts for footer totals (full date range)
        supabase.from('shifts').select(`
          *,
          carers(id, first_name, last_name, email, color),
          clients(id, first_name, last_name),
          line_items(id, code, category, description, billed_rate, sleepover, public_holiday)
        `).gte('shift_date', footerRangeFrom).lte('shift_date', footerRangeTo)
      ])

      console.log('📊 Raw responses:', { carersRes, lineItemCodesRes, clientsRes, shiftsRes, prevDayShiftsRes, rangeShiftsRes, footerShiftsRes })

      if (carersRes.error) {
        console.error('❌ Carers error:', carersRes.error)
        throw carersRes.error
      }
      if (lineItemCodesRes.error) {
        console.error('❌ Line items error:', lineItemCodesRes.error)
        throw lineItemCodesRes.error
      }
      if (clientsRes.error) {
        console.error('❌ Clients error:', clientsRes.error)
        throw clientsRes.error
      }
      if (shiftsRes.error) {
        console.error('❌ Shifts error:', shiftsRes.error)
        throw shiftsRes.error
      }
      if (prevDayShiftsRes.error) {
        console.error('❌ Previous day shifts error:', prevDayShiftsRes.error)
        throw prevDayShiftsRes.error
      }
      if (rangeShiftsRes.error) {
        console.error('❌ Range shifts error:', rangeShiftsRes.error)
        throw rangeShiftsRes.error
      }
      if (footerShiftsRes.error) {
        console.error('❌ Footer shifts error:', footerShiftsRes.error)
        throw footerShiftsRes.error
      }

      // Merge shifts from today and yesterday (to show overnight shifts extending into today)
      const allShifts = [...(shiftsRes.data || []), ...(prevDayShiftsRes.data || [])]

      console.log('✅ Setting state with data:', {
        carers: carersRes.data?.length,
        lineItemCodes: lineItemCodesRes.data?.length,
        clients: clientsRes.data?.length,
        shifts: allShifts.length
      })

      setCarers(carersRes.data || [])
      setLineItemCodes(lineItemCodesRes.data || [])
      setClients(clientsRes.data || [])
      
      // Manually join clients data with shifts
      const clientsMap = new Map((clientsRes.data || []).map(client => [client.id, client]))
      const shiftsWithClients = allShifts.map(shift => ({
        ...shift,
        clients: shift.client_id ? clientsMap.get(shift.client_id) : null
      }))
      
      // Filter shifts by selected client
      const filteredShifts = shiftsWithClients.filter(
        s => !selectedClientId || s.client_id === selectedClientId
      )
      
      setShifts(filteredShifts)

      // Filter range shifts by selected client
      const filteredRangeShifts = (rangeShiftsRes.data || []).filter(
        s => !selectedClientId || s.client_id === selectedClientId
      )
      
      console.log('🔍 Client filtering debug:', {
        selectedClientId,
        totalShifts: rangeShiftsRes.data?.length,
        filteredShifts: filteredRangeShifts.length,
        shiftClientIds: rangeShiftsRes.data?.map(s => ({ id: s.id, client_id: s.client_id })),
        shiftDates: rangeShiftsRes.data?.slice(0, 3).map(s => ({ id: s.id, shift_date: s.shift_date, type: typeof s.shift_date })),
        rangeShiftsDataSample: rangeShiftsRes.data?.slice(0, 3)
      })
      
      // Ensure rangeShifts have clients data joined (same as done for shifts)
      const rangeShiftsWithClients = (filteredRangeShifts || []).map(shift => ({
        ...shift,
        shift_date: typeof shift.shift_date === 'string' ? shift.shift_date : toYmdLocal(new Date(shift.shift_date)),
        clients: shift.clients || (shift.client_id ? clientsMap.get(shift.client_id) : null)
      }))
      
      console.log('📊 Week view shifts being set:', {
        count: rangeShiftsWithClients.length,
        selectedClientId,
        rangeShiftsResDataLength: rangeShiftsRes.data?.length ?? 0,
        sample: rangeShiftsWithClients.slice(0, 2).map(s => ({
          id: s.id,
          shift_date: s.shift_date,
          carer: s.carers?.first_name,
          client: s.clients?.first_name
        }))
      })
      
      // Always set rangeShifts - don't filter by client
      // If no shifts match the client filter, just show unfiltered shifts
      console.log('✅ Setting rangeShifts:', rangeShiftsWithClients.length, 'shifts (directly from result)')
      setRangeShifts(rangeShiftsWithClients)

      // For footer totals, use the full date range (footerShiftsRes)
      const filteredFooterShifts = (footerShiftsRes.data || []).filter(
        s => !selectedClientId || s.client_id === selectedClientId
      )
      
      const footerShiftsWithClients = (filteredFooterShifts || []).map(shift => ({
        ...shift,
        shift_date: typeof shift.shift_date === 'string' ? shift.shift_date : toYmdLocal(new Date(shift.shift_date)),
        clients: shift.clients || (shift.client_id ? clientsMap.get(shift.client_id) : null)
      }))

      const { carerTotals, overlapSummary, overallTotals } = computeSidebarAggregates(footerShiftsWithClients)
      setCarerTotals(carerTotals)
      setOverlapSummary(carerTotals.length === 0 ? null : overlapSummary)
      setOverallTotals(overallTotals)
      
      console.log('📊 Loaded shifts data:', shiftsWithClients)
      console.log('📊 Sample shift:', JSON.stringify(shiftsWithClients?.[0], null, 2))
      console.log('📊 Shift carers data:', shiftsWithClients?.[0]?.carers)
      console.log('📊 Shift line_items data:', shiftsWithClients?.[0]?.line_items)
      console.log('📊 Shift clients data:', shiftsWithClients?.[0]?.clients)
      
      console.log('Loaded line item codes:', lineItemCodesRes.data)
      // Debug: Log the line items data
      console.log('Line items data:', lineItemCodesRes.data)
      
      // Extract unique categories from line items, and ensure HIREUP is present as an option
      const uniqueCategories = Array.from(new Set(lineItemCodesRes.data?.map(item => item.category).filter(Boolean) || []))
      if (!uniqueCategories.includes('HIREUP')) uniqueCategories.push('HIREUP')
      setCategories(uniqueCategories)
      
      console.log('📈 Final state set successfully!')
      setError(null)
      setIsLoading(false)
    } catch (err) {
      console.error('💥 Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsLoading(false)
    }
  }

  const toYmdLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parseYmdToLocalDate = (ymd: string): Date => {
    return new Date(`${ymd}T00:00:00`)
  }

  const normalizeDateInput = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    // Standard HTML date input value
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

    // Fallback for browsers that treat type=date as text (common formats)
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      const dd = dmy[1].padStart(2, '0')
      const mm = dmy[2].padStart(2, '0')
      const yyyy = dmy[3]
      return `${yyyy}-${mm}-${dd}`
    }

    const ymdSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (ymdSlash) {
      const yyyy = ymdSlash[1]
      const mm = ymdSlash[2].padStart(2, '0')
      const dd = ymdSlash[3].padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    return ''
  }

  useEffect(() => {
    try {
      const storedFrom = localStorage.getItem('calendar.dateFrom') || ''
      const storedTo = localStorage.getItem('calendar.dateTo') || ''
      const storedDate = localStorage.getItem('calendar.currentDate') || ''
      const storedClientId = localStorage.getItem('calendar.selectedClientId') || ''

      // Basic sanity check: values should be YYYY-MM-DD; otherwise ignore
      const isYmd = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
      const nextFrom = isYmd(storedFrom) ? storedFrom : ''
      const nextTo = isYmd(storedTo) ? storedTo : ''

      if (nextFrom) setDateFrom(nextFrom)
      if (nextTo) setDateTo(nextTo)

      // Enforce Date to > Date from on restore
      if (nextFrom && nextTo && nextTo <= nextFrom) {
        setDateTo('')
        localStorage.removeItem('calendar.dateTo')
      }
    } catch {
      // ignore (private mode / blocked storage)
    }
  }, [])

  useEffect(() => {
    try {
      if (dateFrom) localStorage.setItem('calendar.dateFrom', dateFrom)
      else localStorage.removeItem('calendar.dateFrom')

      if (dateTo) localStorage.setItem('calendar.dateTo', dateTo)
      else localStorage.removeItem('calendar.dateTo')

      // Save current date
      const currentYmd = toYmdLocal(currentDate)
      if (currentYmd) localStorage.setItem('calendar.currentDate', currentYmd)
    } catch {
      // ignore
    }
  }, [dateFrom, dateTo, currentDate])

  useEffect(() => {
    try {
      // Save view mode
      localStorage.setItem('calendar.viewMode', viewMode)
    } catch {
      // ignore
    }
  }, [viewMode])

  useEffect(() => {
    try {
      // Save selected client ID
      if (selectedClientId) localStorage.setItem('calendar.selectedClientId', String(selectedClientId))
      else localStorage.removeItem('calendar.selectedClientId')
    } catch {
      // ignore
    }
  }, [selectedClientId])

  const buildUtcIsoFromLocal = (ymd: string, hhmm: string): string => {
    const [year, month, day] = ymd.split('-').map(Number)
    const [hour, minute] = hhmm.split(':').map(Number)
    const dt = new Date(year, month - 1, day, hour, minute, 0, 0)
    return dt.toISOString()
  }

  const addDaysToYmd = (ymd: string, days: number): string => {
    const d = parseYmdToLocalDate(ymd)
    d.setDate(d.getDate() + days)
    return toYmdLocal(d)
  }

  useEffect(() => {
    if (!dateFrom && !dateTo) return

    const currentYmd = toYmdLocal(currentDate)
    if (dateFrom && currentYmd < dateFrom) {
      setCurrentDate(parseYmdToLocalDate(dateFrom))
    }
    if (dateTo && currentYmd > dateTo) {
      setCurrentDate(parseYmdToLocalDate(dateTo))
    }
  }, [dateFrom, dateTo])

  // Convert time string (HH:mm:ss or timestamp) to Y position
  const getYFromTime = (timeStr: string): number => {
    // Prefer Date parsing when the value includes a date (timestamptz from DB)
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(timeStr)) {
      const dt = new Date(timeStr)
      if (!isNaN(dt.getTime())) {
        const totalMinutes = dt.getHours() * 60 + dt.getMinutes()
        return (totalMinutes / 15) * 15
      }
    }

    // Fallback: treat as HH:mm(:ss)
    const [hours, minutes] = timeStr.split(':').map(Number)
    const totalMinutes = (hours || 0) * 60 + (minutes || 0)
    return (totalMinutes / 15) * 15 // Convert to Y position (15px per quarter hour)
  }

  // Convert Y position to time (snap to 15-minute intervals)
  // Y is in pixels relative to timeline container, which has 100% height
  const getTimeFromY = (y: number, containerHeight?: number): string => {
    if (!containerHeight && timelineRef.current) {
      containerHeight = timelineRef.current.getBoundingClientRect().height
    }
    containerHeight = containerHeight || 840 // fallback to default
    
    // Convert pixel Y to percentage, then to total minutes in day (1440 minutes)
    const percentageOfDay = Math.max(0, Math.min(y / containerHeight, 1))
    const totalMinutes = percentageOfDay * 1440
    const snappedMinutes = Math.round(totalMinutes / 15) * 15
    const hours = Math.floor(snappedMinutes / 60)
    const minutes = snappedMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Helper function to add/subtract 15 minutes
  const adjustTime = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number)
    const totalMinutes = hours * 60 + mins + minutes
    
    // Allow wrapping: 0-1440 minutes (where 1440 = 00:00 next day)
    let constrainedMinutes = totalMinutes % 1440
    if (constrainedMinutes < 0) constrainedMinutes += 1440
    
    const newHours = Math.floor(constrainedMinutes / 60) % 24
    const newMins = constrainedMinutes % 60
    
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
  }

  const handleTimeAdjustment = (field: 'start_time' | 'end_time', adjustment: number) => {
    setNewShift(prev => {
      const newTime = adjustTime(prev[field], adjustment)
      
      // For start time adjustments, auto-adjust end time if needed
      if (field === 'start_time') {
        const startMins = timeToMinutes(newTime)
        const endMins = timeToMinutes(prev.end_time)
        
        // Check if this is an overnight shift (end time is next day)
        const isOvernight = isEndTimeNextDay(prev.start_time, prev.end_time)
        
        // Only auto-adjust end time if it's NOT an overnight shift and start >= end
        if (!isOvernight && startMins >= endMins) {
          return {
            ...prev,
            start_time: newTime,
            end_time: adjustTime(newTime, 15)
          }
        }
      }
      
      // For end time, allow it to wrap to next day
      // No restrictions needed - user can create overnight shifts
      
      return {
        ...prev,
        [field]: newTime
      }
    })
  }

  const timeToMinutes = (timeStr: string): number => {
    const [hours, mins] = timeStr.split(':').map(Number)
    return hours * 60 + mins
  }

  const isEndTimeNextDay = (startTime: string, endTime: string): boolean => {
    const startMins = timeToMinutes(startTime)
    const endMins = timeToMinutes(endTime)
    return endMins <= startMins
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    
    setIsDragging(true)
    setDragStart(y)
    setDragEnd(y)
    
    e.preventDefault()
  }

  const handleWeekMouseDown = (e: React.MouseEvent, dayYmd: string) => {
    const target = e.target as HTMLElement
    // Only start dragging if clicking on the timeline area itself, not on a shift
    if (target.classList.contains('cal-week-timeline-area') || target.classList.contains('cal-week-hour-line')) {
      const rect = (target.closest('.cal-week-timeline-area') as HTMLElement)?.getBoundingClientRect()
      if (!rect) return
      
      const y = e.clientY - rect.top
      
      setWeekDragState({
        isDragging: true,
        dayYmd,
        startY: y,
        endY: y,
        timelineRef: target.closest('.cal-week-timeline-area') as HTMLElement
      })
      
      e.preventDefault()
    }
  }

  const handleWeekMouseMove = (e: React.MouseEvent) => {
    if (!weekDragState.isDragging || !weekDragState.timelineRef) return
    
    const rect = weekDragState.timelineRef.getBoundingClientRect()
    const y = e.clientY - rect.top
    const maxY = rect.height
    
    const constrainedY = Math.max(0, Math.min(y, maxY))
    setWeekDragState(prev => ({ ...prev, endY: constrainedY }))
  }

  const handleWeekMouseUp = (e: React.MouseEvent) => {
    if (!weekDragState.isDragging) return

    let finalY = weekDragState.endY
    let containerHeight = 840
    if (weekDragState.timelineRef) {
      const rect = weekDragState.timelineRef.getBoundingClientRect()
      const y = e.clientY - rect.top
      containerHeight = rect.height
      finalY = Math.max(0, Math.min(y, containerHeight))
    }

    setWeekDragState(prev => ({ ...prev, isDragging: false }))

    const startY = Math.min(weekDragState.startY, finalY)
    const endY = Math.max(weekDragState.startY, finalY)
    const minShiftDuration = (containerHeight / 1440) * 15 // 15 minutes in pixels
    const adjustedEndY = Math.max(endY, startY + minShiftDuration)
    
    const startTime = getTimeFromY(startY, containerHeight)
    const endTime = getTimeFromY(adjustedEndY, containerHeight)
    
    setNewShift({
      shift_date: weekDragState.dayYmd,
      start_time: startTime,
      end_time: endTime,
      carer_id: null,
      client_id: null,
      category: null,
      line_item_code_id: null,
      is_sleepover: false,
      is_public_holiday: false
    })
    
    setError(null) // Clear any previous errors when opening dialog
    setShowShiftDialog(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const maxY = rect.height
    
    const constrainedY = Math.max(0, Math.min(y, maxY))
    setDragEnd(constrainedY)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return

    // Capture the final mouse position on mouse-up to avoid relying on a possibly stale dragEnd.
    let finalY = dragEnd
    let containerHeight = 840
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      containerHeight = rect.height
      finalY = Math.max(0, Math.min(y, containerHeight))
    }

    setIsDragging(false)

    const startY = Math.min(dragStart, finalY)
    const endY = Math.max(dragStart, finalY)
    const minShiftDuration = (containerHeight / 1440) * 15 // 15 minutes in pixels
    const adjustedEndY = Math.max(endY, startY + minShiftDuration)
    
    const startTime = getTimeFromY(startY, containerHeight)
    const endTime = getTimeFromY(adjustedEndY, containerHeight)
    
    setNewShift({
      shift_date: toYmdLocal(currentDate),
      start_time: startTime,
      end_time: endTime,
      carer_id: null,
      client_id: null,
      category: null,
      line_item_code_id: null,
      is_sleepover: false,
      is_public_holiday: false
    })
    
    setError(null) // Clear any previous errors when opening dialog
    setShowShiftDialog(true)
  }

  // Helper to determine day type from date
  const getDayType = (date: Date): 'weekday' | 'saturday' | 'sunday' => {
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (dayOfWeek === 0) return 'sunday'
    if (dayOfWeek === 6) return 'saturday'
    return 'weekday'
  }

  const lineItemMatchesDayType = (li: LineItemCode, dayType: 'weekday' | 'saturday' | 'sunday') => {
    // If weekday fields are null (before DB migration), treat as weekday items
    switch (dayType) {
      case 'weekday':
        return li.weekday === true || (li.weekday == null && li.saturday !== true && li.sunday !== true)
      case 'saturday':
        return li.saturday === true
      case 'sunday':
        return li.sunday === true
      default:
        return false
    }
  }

  const getDayTypeFromYmd = (ymd: string): 'weekday' | 'saturday' | 'sunday' => {
    const d = parseYmdToLocalDate(ymd)
    return getDayType(d)
  }

  const listDaysInclusive = (fromYmd: string, toYmd: string): string[] => {
    const days: string[] = []
    if (!fromYmd || !toYmd) return days
    if (toYmd < fromYmd) return days

    const cursor = parseYmdToLocalDate(fromYmd)
    const end = parseYmdToLocalDate(toYmd)
    while (toYmdLocal(cursor) <= toYmdLocal(end)) {
      days.push(toYmdLocal(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }

  const carersWithShiftsInRange = useMemo(() => {
    const counts = new Map<number, number>()
    // Filter out HIREUP shifts when counting carer shifts
    for (const shift of rangeShifts) {
      const category = shift.category as string | null | undefined
      if (!category || category !== 'HIREUP') {
        counts.set(shift.carer_id, (counts.get(shift.carer_id) || 0) + 1)
      }
    }

    return carers
      .filter(c => counts.has(c.id))
      .map(c => ({ carer: c, count: counts.get(c.id) || 0 }))
      .sort((a, b) => a.carer.first_name.localeCompare(b.carer.first_name))
  }, [rangeShifts, carers])

  // Debug logging for week view
  useEffect(() => {
    if (viewMode === 'week') {
      console.log('🔍 Week view data:', {
        rangeShiftsCount: rangeShifts.length,
        currentDate: toYmdLocal(currentDate),
        mondayDate: toYmdLocal(getMonday(currentDate)),
        sundayDate: toYmdLocal(getSunday(currentDate)),
        selectedClientId,
        sampleShifts: rangeShifts.slice(0, 3).map(s => ({
          id: s.id,
          shift_date: s.shift_date,
          time_from: s.time_from,
          time_to: s.time_to,
          carer: s.carers?.first_name
        }))
      });
      
      // Debug each day
      const monday = getMonday(currentDate);
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(dayDate.getDate() + i);
        const dayYmd = toYmdLocal(dayDate);
        const dayShifts = rangeShifts.filter(s => s.shift_date === dayYmd);
        console.log(`📅 ${dayYmd}: ${dayShifts.length} shifts`, dayShifts.map(s => `${s.carers?.first_name} ${s.time_from}`));
      }
    }
  }, [viewMode, rangeShifts, currentDate])

  // Update document title based on view mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const newTitle = viewMode === 'week' ? 'Calendar - Week View' : 'Calendar - Day View'
      console.log(`📝 Setting page title to: ${newTitle}`)
      document.title = newTitle
    }
  }, [viewMode])

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const inferShiftFlags = (shift: Shift) => {
    const joinedLineItem = (shift as any).line_items as any | null | undefined
    const liFromCodeId = lineItemCodes.find(li => li.id === String((shift as any).line_item_code_id ?? ''))

    const isSleepover =
      Boolean((shift as any).is_sleepover) || Boolean(joinedLineItem?.sleepover) || Boolean(liFromCodeId?.sleepover)
    const isPublicHoliday =
      Boolean((shift as any).is_public_holiday) ||
      Boolean(joinedLineItem?.public_holiday) ||
      Boolean(liFromCodeId?.public_holiday)

    return { isSleepover, isPublicHoliday }
  }

  const getFontScaleForDurationMinutes = (durationMinutes: number) => {
    if (!Number.isFinite(durationMinutes)) return 1
    if (durationMinutes <= 45) return 0.5
    if (durationMinutes <= 60) return 0.7
    return 1
  }

  const isoToLocalHhmm = (iso: string): string => {
    const dt = new Date(iso)
    if (isNaN(dt.getTime())) return '00:00'
    return dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  // Fetch authoritative carer shift counts for the current date window and client filter
  const refreshInvoiceCarerCounts = async () => {
    try {
      const supabase = getSupabaseClient()
      const dayYmd = toYmdLocal(currentDate)
      const rangeFrom = dateFrom || dayYmd
      const rangeTo = dateTo || dayYmd

      let query = supabase
        .from('shifts')
        .select('carer_id')
        .gte('shift_date', rangeFrom)
        .lte('shift_date', rangeTo)
        .neq('category', 'HIREUP')

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to load shift counts', error)
        return
      }

      const counts = new Map<number, number>()
      for (const row of data || []) {
        counts.set(row.carer_id, (counts.get(row.carer_id) || 0) + 1)
      }

      const options = carers
        .filter(c => counts.has(c.id))
        .map(c => ({ carer: c, count: counts.get(c.id) || 0 }))
        .sort((a, b) => a.carer.first_name.localeCompare(b.carer.first_name))

      setInvoiceCarerOptions(options)
    } catch (err) {
      console.error('Failed to refresh invoice carer counts', err)
    }
  }

  function computeSidebarAggregates(range: Shift[]) {
    const totalsMap = new Map<
      number,
      { carerId: number; firstName: string; lastName: string; totalCost: number; totalHours: number }
    >()

    let overallHours = 0
    let overallCost = 0

    for (const s of range || []) {
      const carer = (s as any).carers as Carer | undefined
      const carerId = s.carer_id
      const existing = totalsMap.get(carerId)
      const cost = typeof s.cost === 'number' ? s.cost : Number((s as any).cost || 0)

      const from = new Date(s.time_from)
      const to = new Date(s.time_to)
      const durationMs =
        !isNaN(from.getTime()) && !isNaN(to.getTime()) ? Math.max(0, to.getTime() - from.getTime()) : 0
      const hours = durationMs / (60 * 60 * 1000)

      const isHireup = ((s as any).line_items as any)?.category === 'HIREUP' || (s as any).category === 'HIREUP'
      if (!isHireup) {
        overallCost += isNaN(cost) ? 0 : cost
        overallHours += isNaN(hours) ? 0 : hours
      }

      if (!existing) {
        totalsMap.set(carerId, {
          carerId,
          firstName: carer?.first_name || '',
          lastName: carer?.last_name || '',
          totalCost: isNaN(cost) ? 0 : cost,
          totalHours: isNaN(hours) ? 0 : hours,
        })
      } else {
        existing.totalCost += isNaN(cost) ? 0 : cost
        existing.totalHours += isNaN(hours) ? 0 : hours
      }
    }

    const carerTotals = Array.from(totalsMap.values())
      .map((t) => ({
        carerId: t.carerId,
        name: `${t.firstName} ${t.lastName}`.trim() || `Carer ${t.carerId}`,
        totalCost: Math.round(t.totalCost * 100) / 100,
        totalHours: Math.round(t.totalHours * 100) / 100,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

    // Overlap summary: count only overlapping hours between different carers
    // For each time point where 2+ different carers overlap, use a single shift's cost (no double-counting).
    // If HIREUP overlaps with another type, use the non-HIREUP cost.
    type Event = { t: number; kind: 'start' | 'end'; carerId: number; cost: number; isHireup: boolean }
    const events: Event[] = []

    const shiftsArray = range || []
    for (const s of shiftsArray) {
      const from = new Date(s.time_from)
      const to = new Date(s.time_to)
      const start = from.getTime()
      const end = to.getTime()
      if (isNaN(start) || isNaN(end) || end <= start) continue

      const cost = typeof s.cost === 'number' ? s.cost : Number((s as any).cost || 0)
      const isHireup = ((s as any).line_items as any)?.category === 'HIREUP' || (s as any).category === 'HIREUP'

      events.push({ t: start, kind: 'start', carerId: s.carer_id, cost, isHireup })
      events.push({ t: end, kind: 'end', carerId: s.carer_id, cost, isHireup })
    }

    events.sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t
      // process ends before starts at the same timestamp
      if (a.kind === b.kind) return 0
      return a.kind === 'end' ? -1 : 1
    })

    // Track which carers are active and their costs
    const activeCarers = new Map<number, { cost: number; isHireup: boolean }>()
    let overlapMs = 0
    let overlapCost = 0
    let prevT: number | null = null

    let i = 0
    while (i < events.length) {
      const t = events[i].t

      // Calculate overlap for the segment from prevT to t
      if (prevT !== null && t > prevT && activeCarers.size >= 2) {
        const segMs = t - prevT
        overlapMs += segMs

        // Choose ONE cost for this overlap segment:
        // - Prefer max non-HIREUP cost if any non-HIREUP shifts are active
        // - Otherwise use max cost overall
        const activeList = Array.from(activeCarers.values())
        const nonHireupCosts = activeList.filter((v) => !v.isHireup).map((v) => v.cost)
        const chosenCost = nonHireupCosts.length > 0 ? Math.max(...nonHireupCosts) : Math.max(...activeList.map((v) => v.cost))
        
        // Add only the chosen cost (not multiplied by segment duration)
        // We'll calculate the hourly portion below
        overlapCost += chosenCost
      }

      // Apply all events at time t
      while (i < events.length && events[i].t === t) {
        const ev = events[i]
        if (ev.kind === 'end') {
          activeCarers.delete(ev.carerId)
        } else {
          activeCarers.set(ev.carerId, { cost: ev.cost, isHireup: ev.isHireup })
        }
        i++
      }

      prevT = t
    }

    const overlapHours = Math.round((overlapMs / (60 * 60 * 1000)) * 100) / 100
    // overlapCost is now the sum of chosen costs for each overlap segment
    // If shifts have flat costs (not hourly), this is already correct
    const overlapCostRounded = Math.round(overlapCost * 100) / 100

    const overallSummary = {
      totalHours: Math.round(overallHours * 100) / 100,
      totalCost: Math.round(overallCost * 100) / 100,
    }

    return {
      carerTotals,
      overlapSummary: {
        overlapHours,
        overlapCost: overlapCostRounded,
      },
      overallTotals: overallSummary,
    }
  }

  const getLocalSpanMinutesForShift = (shift: Shift): { startMin: number; endMin: number } => {
    const from = new Date(shift.time_from)
    const to = new Date(shift.time_to)

    const startMin = !isNaN(from.getTime()) ? from.getHours() * 60 + from.getMinutes() : 0
    let endMin = !isNaN(to.getTime()) ? to.getHours() * 60 + to.getMinutes() : startMin + 15

    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      const startDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
      const endDay = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
      const dayDiff = Math.round((endDay - startDay) / (24 * 60 * 60 * 1000))
      if (dayDiff > 0) {
        endMin += dayDiff * 24 * 60
      } else if (endMin <= startMin) {
        // defensive: treat as overnight
        endMin += 24 * 60
      }
    } else {
      if (endMin <= startMin) endMin = startMin + 15
    }

    return { startMin, endMin }
  }

  const computeOverlapLayout = (dayShifts: Shift[]) => {
    type Item = { id: number; startMin: number; endMin: number }
    const items: Item[] = (dayShifts || []).map((s) => {
      const span = getLocalSpanMinutesForShift(s)
      return { id: s.id, startMin: span.startMin, endMin: span.endMin }
    })

    console.log('🔍 Computing layout for shifts:', items)

    items.sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin
      return b.endMin - a.endMin
    })

    const layout = new Map<number, { col: number; colCount: number }>()

    // Helper to check if two intervals overlap (not just touch)
    const overlaps = (a: Item, b: Item) => a.startMin < b.endMin && a.endMin > b.startMin

    // Build overlap graph and find connected components
    const graph = new Map<number, Set<number>>()
    for (let i = 0; i < items.length; i++) {
      graph.set(i, new Set())
    }
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (overlaps(items[i], items[j])) {
          console.log(`✅ Overlap detected: shift ${items[i].id} (${items[i].startMin}-${items[i].endMin}) overlaps with shift ${items[j].id} (${items[j].startMin}-${items[j].endMin})`)
          graph.get(i)!.add(j)
          graph.get(j)!.add(i)
        }
      }
    }

    // Find connected components using DFS
    const visited = new Set<number>()
    const components: number[][] = []
    
    const dfs = (node: number, component: number[]) => {
      visited.add(node)
      component.push(node)
      const neighbors = graph.get(node)
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, component)
          }
        }
      }
    }
    
    for (let i = 0; i < items.length; i++) {
      const nodeNeighbors = graph.get(i)
      if (!visited.has(i) && nodeNeighbors && nodeNeighbors.size > 0) {
        const component: number[] = []
        dfs(i, component)
        components.push(component)
        console.log('📦 Component found:', component.map(idx => items[idx].id))
      }
    }

    // Process each component (group of overlapping shifts)
    for (const component of components) {
      const groupItems = component.map(idx => items[idx]).sort((a, b) => {
        if (a.startMin !== b.startMin) return a.startMin - b.startMin
        return b.endMin - a.endMin
      })

      // Greedy column assignment
      const activeCols: Array<{ endMin: number; col: number; id: number }> = []
      let maxColsInGroup = 1

      for (const item of groupItems) {
        // Free columns that have ended - iterate backwards to safely remove
        for (let i = activeCols.length - 1; i >= 0; i--) {
          if (activeCols[i].endMin <= item.startMin) {
            activeCols.splice(i, 1)
          }
        }

        // Find the first available column
        const usedCols = new Set(activeCols.map(ac => ac.col))
        let col = 0
        while (usedCols.has(col)) col++

        // Calculate max columns needed for this time range
        const maxCols = activeCols.length + 1
        maxColsInGroup = Math.max(maxColsInGroup, maxCols)

        activeCols.push({ endMin: item.endMin, col, id: item.id })
        layout.set(item.id, { col, colCount: maxCols })
        console.log(`📍 Layout assigned: shift ${item.id} -> col ${col}, colCount ${maxCols}`)
      }

      // Update all shifts in this component to have the same max colCount
      for (const item of groupItems) {
        const existing = layout.get(item.id)!
        layout.set(item.id, { col: existing.col, colCount: maxColsInGroup })
        console.log(`🔄 Updated shift ${item.id} -> col ${existing.col}, colCount ${maxColsInGroup}`)
      }
    }

    console.log('📊 Final layout:', Array.from(layout.entries()))
    return layout
  }

  // Only compute layout for shifts that belong to the current day (not previous day overnight shifts)
  const dayLayout = useMemo(() => {
    const dayYmd = toYmdLocal(currentDate)
    const shiftsForCurrentDay = shifts.filter(s => s.shift_date === dayYmd)
    return computeOverlapLayout(shiftsForCurrentDay)
  }, [shifts, currentDate])

  // Check if a new shift with the given carer and times overlaps with any existing shift for the same carer
  const checkCarerOverlap = (carerId: number, startTime: string, endTime: string, shiftDate: string, excludeShiftId?: number): boolean => {
    // Use rangeShifts if available (has full date range), otherwise fall back to shifts (current day only)
    const shiftsToCheck = rangeShifts.length > 0 ? rangeShifts : shifts

    for (const s of shiftsToCheck) {
      // Skip if this is the shift being edited
      if (excludeShiftId && s.id === excludeShiftId) continue
      
      // Only check shifts for the same carer on the same date
      if (s.carer_id !== carerId || s.shift_date !== shiftDate) continue

      const existingStart = new Date(s.time_from).getTime()
      const existingEnd = new Date(s.time_to).getTime()
      
      const newStartDate = buildUtcIsoFromLocal(shiftDate, startTime)
      const newEndDate = buildUtcIsoFromLocal(shiftDate, endTime)
      let newStart = new Date(newStartDate).getTime()
      let newEnd = new Date(newEndDate).getTime()

      // Handle overnight shifts
      const [newHour, newMin] = startTime.split(':').map(Number)
      const [newEndHour, newEndMin] = endTime.split(':').map(Number)
      const newStartMinutes = newHour * 60 + newMin
      const newEndMinutes = newEndHour * 60 + newEndMin
      
      if (newEndMinutes <= newStartMinutes) {
        // This is an overnight shift, add one day to the end time
        const nextDayStr = addDaysToYmd(shiftDate, 1)
        const nextDayEndDate = buildUtcIsoFromLocal(nextDayStr, endTime)
        newEnd = new Date(nextDayEndDate).getTime()
      }

      // Check for overlap: shifts overlap if one starts before the other ends
      if (newStart < existingEnd && newEnd > existingStart) {
        return true // Overlap found
      }
    }
    return false // No overlap found
  }

  // Check if a new shift would cause 3 or more shifts to overlap at any point in time
  const checkTripleOverlap = (startTime: string, endTime: string, shiftDate: string, excludeShiftId?: number): boolean => {
    const [newHour, newMin] = startTime.split(':').map(Number)
    const [newEndHour, newEndMin] = endTime.split(':').map(Number)
    const newStartMinutes = newHour * 60 + newMin
    const newEndMinutes = newEndHour * 60 + newEndMin

    const newStartDate = buildUtcIsoFromLocal(shiftDate, startTime)
    const newEndDate = buildUtcIsoFromLocal(shiftDate, endTime)
    let newStart = new Date(newStartDate).getTime()
    let newEnd = new Date(newEndDate).getTime()

    // Handle overnight shifts for the new shift
    if (newEndMinutes <= newStartMinutes) {
      const nextDayStr = addDaysToYmd(shiftDate, 1)
      const nextDayEndDate = buildUtcIsoFromLocal(nextDayStr, endTime)
      newEnd = new Date(nextDayEndDate).getTime()
    }

    // Create events for all existing shifts on this date AND previous day (for overnight shifts)
    type OverlapEvent = { t: number; kind: 'start' | 'end' }
    const events: OverlapEvent[] = []

    // Calculate the start of the target day (00:00 in local time)
    const targetDayStart = new Date(buildUtcIsoFromLocal(shiftDate, '00:00')).getTime()
    const prevDayStr = addDaysToYmd(shiftDate, -1)

    // Use rangeShifts if available (has full date range), otherwise fall back to shifts (current day only)
    const shiftsToCheck = rangeShifts.length > 0 ? rangeShifts : shifts

    for (const s of shiftsToCheck) {
      if (excludeShiftId && s.id === excludeShiftId) continue
      
      const existingStart = new Date(s.time_from).getTime()
      const existingEnd = new Date(s.time_to).getTime()

      // Include shift if:
      // 1. It's on the same date, OR
      // 2. It's from the previous day AND extends past midnight into the target day
      if (s.shift_date === shiftDate || (s.shift_date === prevDayStr && existingEnd > targetDayStart)) {
        events.push({ t: existingStart, kind: 'start' })
        events.push({ t: existingEnd, kind: 'end' })
      }
    }

    // Add events for the new shift
    events.push({ t: newStart, kind: 'start' })
    events.push({ t: newEnd, kind: 'end' })

    // Sort events by time (ends before starts at same time)
    events.sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t
      return a.kind === 'end' ? -1 : 1
    })

    // Sweep through events and check max overlap count
    let activeCount = 0
    for (const ev of events) {
      if (ev.kind === 'start') {
        activeCount++
        if (activeCount >= 3) {
          return true // Triple+ overlap found
        }
      } else {
        activeCount--
      }
    }

    return false // No triple+ overlap
  }

  const pickLineItemForShift = (opts: {
    category: string
    dayType: 'weekday' | 'saturday' | 'sunday'
    isSleepover: boolean
    isPublicHoliday: boolean
  }): LineItemCode | null => {
    const matchingForShift = lineItemCodes
      .filter(li => li.category === opts.category)
      // Public holiday items are day-agnostic; otherwise honor weekday/sat/sun flags
      .filter(li => (opts.isPublicHoliday ? true : lineItemMatchesDayType(li, opts.dayType)))

    const pick = (items: LineItemCode[]) =>
      items
        .slice()
        .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { sensitivity: 'base' }))[0] || null

    if (opts.isSleepover) {
      const pool = matchingForShift.filter(li => li.sleepover === true)
      if (opts.isPublicHoliday) {
        return pick(pool.filter(li => li.public_holiday === true)) || pick(pool)
      }
      return pick(pool)
    }
    if (opts.isPublicHoliday) return pick(matchingForShift.filter(li => li.public_holiday === true && li.sleepover !== true))
    return pick(matchingForShift.filter(li => li.public_holiday !== true && li.sleepover !== true))
  }

  const computeCostForShiftParams = (opts: {
    shiftDateYmd: string
    category: string
    startTime: string
    endTime: string
    isSleepover: boolean
    isPublicHoliday: boolean
  }): number => {
    const dayType = getDayTypeFromYmd(opts.shiftDateYmd)

    const parseToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    let selStart = parseToMinutes(opts.startTime)
    let selEnd = parseToMinutes(opts.endTime)
    if (selEnd <= selStart) selEnd += 24 * 60

    const baseMatchingLineItems = lineItemCodes.filter(li => {
      if (li.category !== opts.category) return false
      // Public holiday rates ignore weekday/sat/sun flags because any date can be a PH
      return opts.isPublicHoliday ? true : lineItemMatchesDayType(li, dayType)
    })

    if (opts.isSleepover) {
      const sleepoverPool = baseMatchingLineItems.filter(li => li.sleepover === true)
      const sleepoverItem = opts.isPublicHoliday
        ? sleepoverPool.find(li => li.public_holiday === true) || sleepoverPool[0]
        : sleepoverPool[0]
      const rate = (sleepoverItem?.billed_rate as unknown as number) || 0
      return Math.round(rate * 100) / 100
    }

    const matchingLineItems = baseMatchingLineItems.filter(li => {
      if (opts.isPublicHoliday) return li.public_holiday === true && li.sleepover !== true
      return li.public_holiday !== true && li.sleepover !== true
    })

    let total = 0
    for (const li of matchingLineItems) {
      const hasWindow = !!li.time_from && !!li.time_to

      const addOverlap = (windowStart: number, windowEnd: number) => {
        const overlapStart = Math.max(selStart, windowStart)
        const overlapEnd = Math.min(selEnd, windowEnd)
        const overlapMinutes = Math.max(0, overlapEnd - overlapStart)
        if (overlapMinutes <= 0) return

        const hours = Math.round((overlapMinutes / 60) * 100) / 100
        const rate = (li.billed_rate as unknown as number) || 0
        total += Math.round(hours * rate * 100) / 100
      }

      if (!hasWindow) {
        // No time window means the rate applies to the whole day
        addOverlap(0, 24 * 60)
        continue
      }

      let liStart = parseToMinutes(li.time_from || '00:00')
      let liEnd = parseToMinutes(li.time_to || '23:59')

      if (liEnd <= liStart) {
        // Wrap-around window (e.g. 22:00-02:00)
        addOverlap(liStart, 24 * 60)
        addOverlap(0, liEnd)
      } else {
        addOverlap(liStart, liEnd)
      }
    }

    return Math.round(total * 100) / 100
  }

  const handleConfirmCopyShift = async () => {
    if (!editingShift) {
      setCopyShiftError('No shift selected')
      return
    }
    if (!dateFrom || !dateTo) {
      setCopyShiftError('Set Date from and Date to first')
      return
    }
    if (copyShiftSelected.length === 0) {
      setCopyShiftError('Select at least one day')
      return
    }

    setCopyShiftIsWorking(true)
    setCopyShiftError(null)

    try {
      const supabase = getSupabaseClient()
      const sourceShift = editingShift
      const startTime = isoToLocalHhmm(sourceShift.time_from)
      const endTime = isoToLocalHhmm(sourceShift.time_to)

      const inserts: any[] = []
      const daysWithOverlaps: string[] = []

      for (const targetYmd of copyShiftSelected) {
        // Load existing shifts for this target day AND the previous day (to catch overnight shifts)
        const prevTargetDay = new Date(parseYmdToLocalDate(targetYmd))
        prevTargetDay.setDate(prevTargetDay.getDate() - 1)
        const prevTargetYmd = toYmdLocal(prevTargetDay)
        
        const [currentDayShiftsRes, prevDayShiftsRes] = await Promise.all([
          supabase.from('shifts').select('*').eq('shift_date', targetYmd),
          supabase.from('shifts').select('*').eq('shift_date', prevTargetYmd)
        ])
        
        // For previous day shifts, only include those that extend into the target day (end time > target day start)
        const targetDayStart = buildUtcIsoFromLocal(targetYmd, '00:00')
        const prevDayShifts = (prevDayShiftsRes.data || []).filter(shift => {
          const endTime = new Date(shift.time_to).getTime()
          const targetStart = new Date(targetDayStart).getTime()
          return endTime > targetStart
        })
        
        const allExistingShifts = [...(currentDayShiftsRes.data || []), ...prevDayShifts]
        const originalExistingShifts = [...allExistingShifts]

        const startDateTime = buildUtcIsoFromLocal(targetYmd, startTime)
        let endDateTime = buildUtcIsoFromLocal(targetYmd, endTime)

        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin
        if (endMinutes <= startMinutes) {
          const nextDayStr = addDaysToYmd(targetYmd, 1)
          endDateTime = buildUtcIsoFromLocal(nextDayStr, endTime)
        }

        // Check for triple overlap
        const newStart = new Date(startDateTime).getTime()
        const newEnd = new Date(endDateTime).getTime()
        
        let overlapCount = 0
        for (const existing of originalExistingShifts) {
          const existingStart = new Date(existing.time_from).getTime()
          const existingEnd = new Date(existing.time_to).getTime()
          
          if (newStart < existingEnd && newEnd > existingStart) {
            overlapCount++
          }
        }

        // Also check overlaps with shifts already being inserted in this batch (same target day only)
        for (const insertedShift of inserts) {
          if (insertedShift.shift_date === targetYmd) {
            const insertedStart = new Date(insertedShift.time_from).getTime()
            const insertedEnd = new Date(insertedShift.time_to).getTime()
            
            if (newStart < insertedEnd && newEnd > insertedStart) {
              overlapCount++
            }
          }
        }
        
        // Block if would cause 3+ concurrent shifts
        if (overlapCount >= 2) {
          if (!daysWithOverlaps.includes(targetYmd)) {
            daysWithOverlaps.push(targetYmd)
          }
          continue
        }

        let cost: number
        let lineItemCodeId: string | null = null
        const category = (sourceShift as any).category || (sourceShift as any).line_items?.category

        if (category === 'HIREUP') {
          cost = Number(sourceShift.cost || 0)
          lineItemCodeId = null
        } else {
          const isSleepover = !!sourceShift.line_items?.sleepover
          const isPublicHoliday = !!sourceShift.line_items?.public_holiday
          const dayType = getDayTypeFromYmd(targetYmd)
          
          const targetLineItem = pickLineItemForShift({
            category: category || '',
            dayType,
            isSleepover,
            isPublicHoliday
          })

          if (!targetLineItem) {
            throw new Error(`No line item found for ${category} on ${targetYmd}`)
          }

          cost = computeCostForShiftParams({
            shiftDateYmd: targetYmd,
            category: category || '',
            startTime,
            endTime,
            isSleepover,
            isPublicHoliday
          })
          lineItemCodeId = targetLineItem.id
        }

        const newInsert = {
          shift_date: targetYmd,
          time_from: startDateTime,
          time_to: endDateTime,
          carer_id: sourceShift.carer_id,
          client_id: sourceShift.client_id,
          line_item_code_id: lineItemCodeId,
          category: category,
          cost
        }

        inserts.push(newInsert)
      }

      if (daysWithOverlaps.length > 0) {
        const daysList = daysWithOverlaps.map(d => {
          const date = parseYmdToLocalDate(d)
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        }).join(', ')
        setCopyShiftError(`Cannot copy to the following days due to triple overlap: ${daysList}`)
        return
      }

      if (inserts.length === 0) {
        setCopyShiftError('No shifts could be copied (all would cause triple overlaps)')
        return
      }

      const { error: insertError } = await supabase.from('shifts').insert(inserts)
      if (insertError) throw insertError

      await fetchData()
      setShowCopyShiftDialog(false)
      setCopyShiftSelected([])
      setCopyShiftError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('❌ Copy shift error:', err)
      setCopyShiftError(msg)
    } finally {
      setCopyShiftIsWorking(false)
    }
  }

  const handleConfirmCopyDay = async () => {
    const srcYmd = toYmdLocal(currentDate)
    if (!dateFrom || !dateTo) {
      setCopyDayError('Set Date from and Date to first')
      return
    }
    if (copyDaySelected.length === 0) {
      setCopyDayError('Select at least one day')
      return
    }

    // Use ONLY the shifts for the current day (not including previous day shifts)
    // The shifts state includes previous day's overnight shifts, but we only want to copy today's shifts
    const sourceShifts = shifts.filter(s => s.shift_date === srcYmd)
    console.log(`📋 Source shifts from ${srcYmd}:`, sourceShifts.length, 'shifts')
    sourceShifts.forEach((s, idx) => {
      console.log(`  ${idx}: ${(s as any).carers?.first_name} ${isoToLocalHhmm(s.time_from)}-${isoToLocalHhmm(s.time_to)} (id: ${s.id})`)
    })
    
    if (sourceShifts.length === 0) {
      setCopyDayError('No shifts on the current day to copy')
      return
    }

    setCopyDayIsWorking(true)
    setCopyDayError(null)

    try {
      const supabase = getSupabaseClient()

      const daysWithOverlaps: string[] = []
      const allInserts: any[] = []

      for (const targetYmd of copyDaySelected) {
        // Fresh inserts array for each target day - don't check against other days' inserts
        const inserts: any[] = []
        // Load existing shifts for this target day AND the previous day (to catch overnight shifts)
        const prevTargetDay = new Date(parseYmdToLocalDate(targetYmd))
        prevTargetDay.setDate(prevTargetDay.getDate() - 1)
        const prevTargetYmd = toYmdLocal(prevTargetDay)
        
        const [currentDayShiftsRes, prevDayShiftsRes] = await Promise.all([
          supabase.from('shifts').select('*').eq('shift_date', targetYmd).eq('client_id', selectedClientId),
          supabase.from('shifts').select('*').eq('shift_date', prevTargetYmd).eq('client_id', selectedClientId)
        ])
        
        // For previous day shifts, only include those that extend into the target day (end time > target day start)
        const targetDayStart = buildUtcIsoFromLocal(targetYmd, '00:00')
        const prevDayShifts = (prevDayShiftsRes.data || []).filter(shift => {
          const endTime = new Date(shift.time_to).getTime()
          const targetStart = new Date(targetDayStart).getTime()
          return endTime > targetStart
        })
        
        // Merge shifts from target day and previous day (only those that extend into target day)
        const allExistingShifts = [...(currentDayShiftsRes.data || []), ...prevDayShifts]
        
        console.log(`🎯 Target day ${targetYmd}:`)
        console.log(`   - Current day shifts: ${currentDayShiftsRes.data?.length || 0}`, currentDayShiftsRes.data)
        console.log(`   - Previous day shifts extending into target: ${prevDayShifts.length}`, prevDayShifts)
        console.log(`   - Total existing shifts to check: ${allExistingShifts.length}`, allExistingShifts)
        
        console.log(`🎯 Target day ${targetYmd} for client ${selectedClientId}: Found ${allExistingShifts.length} existing shifts (${currentDayShiftsRes.data?.length || 0} from ${targetYmd} + ${prevDayShiftsRes.data?.length || 0} from previous day ${prevTargetYmd})`, allExistingShifts)
        
        // Keep original existing shifts separate from shifts being added in this operation
        const originalExistingShifts = [...allExistingShifts]
        const targetDayShifts = [...originalExistingShifts]

        for (const s of sourceShifts) {
          const lineItemId = String((s as any).line_item_code_id ?? '')
          const li = lineItemCodes.find(x => x.id === lineItemId)

          // Get category from shift record first (for HIREUP), then from line_items join, then from lineItemCodes
          const category = (s as any).category || (s as any).line_items?.category || li?.category
          if (!category) continue

          const startTime = isoToLocalHhmm(s.time_from)
          const endTime = isoToLocalHhmm(s.time_to)

          const startDateTime = buildUtcIsoFromLocal(targetYmd, startTime)
          let endDateTime = buildUtcIsoFromLocal(targetYmd, endTime)

          const [startHour, startMin] = startTime.split(':').map(Number)
          const [endHour, endMin] = endTime.split(':').map(Number)
          const startMinutes = startHour * 60 + startMin
          const endMinutes = endHour * 60 + endMin
          if (endMinutes <= startMinutes) {
            const nextDayStr = addDaysToYmd(targetYmd, 1)
            endDateTime = buildUtcIsoFromLocal(nextDayStr, endTime)
          }

          // Check for triple overlap - only against ORIGINAL existing shifts, not shifts being copied in this operation
          const newStart = new Date(startDateTime).getTime()
          const newEnd = new Date(endDateTime).getTime()
          
          let overlapCount = 0
          for (const existing of originalExistingShifts) {
            const existingStart = new Date(existing.time_from).getTime()
            const existingEnd = new Date(existing.time_to).getTime()
            
            // Check if intervals overlap (exclusive: touching boundaries don't count as overlap)
            if (newStart < existingEnd && newEnd > existingStart) {
              overlapCount++
              console.log(`⚠️ Overlap detected: New shift (${startTime}-${endTime} on ${targetYmd}) overlaps with existing shift ${existing.id} (${new Date(existing.time_from).toISOString()}-${new Date(existing.time_to).toISOString()})`)
            }
          }

          // Also check overlaps with shifts already being inserted in this batch
          for (const insertedShift of inserts) {
            // Only check shifts for the same target day
            if (insertedShift.shift_date === targetYmd) {
              const insertedStart = new Date(insertedShift.time_from).getTime()
              const insertedEnd = new Date(insertedShift.time_to).getTime()
              
              if (newStart < insertedEnd && newEnd > insertedStart) {
                overlapCount++
                console.log(`⚠️ Overlap detected with batch shift: New shift (${startTime}-${endTime} on ${targetYmd}) overlaps with batch shift (${new Date(insertedShift.time_from).toISOString()}-${new Date(insertedShift.time_to).toISOString()})`)
              }
            }
          }
          
          console.log(`📊 Overlap count for shift being copied (${startTime}-${endTime} on ${targetYmd}): ${overlapCount}`)
          
          // Block if new shift would overlap with 2+ existing shifts (creating 3+ concurrent shifts)
          if (overlapCount >= 2) {
            console.log(`🚫 BLOCKING copy due to triple overlap (overlapCount=${overlapCount})`)
            if (!daysWithOverlaps.includes(targetYmd)) {
              daysWithOverlaps.push(targetYmd)
            }
            continue // Skip this shift
          }

          let cost: number
          let lineItemCodeId: string | null = null

          // Handle HIREUP shifts specially
          if (category === 'HIREUP') {
            cost = Number(s.cost || 0)
            lineItemCodeId = null
          } else {
            const isSleepover = !!li?.sleepover
            const isPublicHoliday = !!li?.public_holiday

            const dayType = getDayTypeFromYmd(targetYmd)
            const targetLineItem = pickLineItemForShift({
              category,
              dayType,
              isSleepover,
              isPublicHoliday
            })

            if (!targetLineItem) {
              throw new Error(
                isSleepover
                  ? `No sleepover line item found for ${category} (${dayType})`
                  : isPublicHoliday
                    ? `No public holiday line item found for ${category} (${dayType})`
                    : `No standard line item found for ${category} (${dayType})`
              )
            }

            cost = computeCostForShiftParams({
              shiftDateYmd: targetYmd,
              category,
              startTime,
              endTime,
              isSleepover,
              isPublicHoliday
            })
            lineItemCodeId = targetLineItem.id
          }

          const newInsert = {
            shift_date: targetYmd,
            time_from: startDateTime,
            time_to: endDateTime,
            carer_id: s.carer_id,
            client_id: s.client_id,
            line_item_code_id: lineItemCodeId,
            category: category,
            cost
          }

          console.log(`📝 Adding to inserts array for ${targetYmd}: ${startTime}-${endTime}`)
          console.log(`   time_from: ${startDateTime}`)
          console.log(`   time_to: ${endDateTime}`)
          inserts.push(newInsert)
          targetDayShifts.push(newInsert as any)
        }
        
        console.log(`✅ Completed target day ${targetYmd}. Inserts array now has ${inserts.length} items`)
        console.log(`📋 Current inserts array:`, inserts.map(i => ({ date: i.shift_date, time: `${isoToLocalHhmm(i.time_from)}-${isoToLocalHhmm(i.time_to)}` })))
        
        // Add this day's inserts to the total
        allInserts.push(...inserts)
      }

      if (daysWithOverlaps.length > 0) {
        const daysList = daysWithOverlaps.map(d => {
          const date = parseYmdToLocalDate(d)
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        }).join(', ')
        setCopyDayError(`Cannot copy to the following days due to triple overlap: ${daysList}`)
        return
      }

      if (allInserts.length === 0) {
        setCopyDayError('No shifts could be copied (all would cause triple overlaps)')
        return
      }

      const { error: insertError } = await supabase.from('shifts').insert(allInserts)
      if (insertError) throw insertError

      setShowCopyDayDialog(false)
      setCopyDaySelected([])
      setCopyDayError(null)

      // Refresh day + range data
      await fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to copy shifts'
      setCopyDayError(msg)
    } finally {
      setCopyDayIsWorking(false)
    }
  }

  const handleConfirmCopyWeek = async () => {
    const srcMonday = getMonday(currentDate)
    const srcSunday = getSunday(currentDate)
    const srcWeekStart = toYmdLocal(srcMonday)
    const srcWeekEnd = toYmdLocal(srcSunday)

    if (!dateFrom || !dateTo) {
      setCopyWeekError('Set Date from and Date to first')
      return
    }
    if (copyWeekSelected.length === 0) {
      setCopyWeekError('Select at least one week')
      return
    }

    // Get all shifts for the source week
    const sourceWeekShifts = rangeShifts.filter(s => s.shift_date >= srcWeekStart && s.shift_date <= srcWeekEnd)
    
    if (sourceWeekShifts.length === 0) {
      setCopyWeekError('No shifts in the current week to copy')
      return
    }

    setCopyWeekIsWorking(true)
    setCopyWeekError(null)

    try {
      const supabase = getSupabaseClient()
      const allInserts: any[] = []
      const weeksWithOverlaps: string[] = []

      // For each target week
      for (const targetWeekStart of copyWeekSelected) {
        // Parse the target week start date
        const [year, month, day] = targetWeekStart.split('-').map(Number)
        const targetMonday = new Date(year, month - 1, day)
        const targetSunday = new Date(targetMonday)
        targetSunday.setDate(targetSunday.getDate() + 6)

        // Copy each day of the week
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const srcDate = new Date(srcMonday)
          srcDate.setDate(srcDate.getDate() + dayOffset)
          const srcYmd = toYmdLocal(srcDate)

          const targetDate = new Date(targetMonday)
          targetDate.setDate(targetDate.getDate() + dayOffset)
          const targetYmd = toYmdLocal(targetDate)

          // Get shifts for this day of the source week
          const sourceDayShifts = sourceWeekShifts.filter(s => s.shift_date === srcYmd)
          if (sourceDayShifts.length === 0) continue

          // Load existing shifts for the target day
          const prevTargetDay = new Date(targetDate)
          prevTargetDay.setDate(prevTargetDay.getDate() - 1)
          const prevTargetYmd = toYmdLocal(prevTargetDay)

          const [currentDayShiftsRes, prevDayShiftsRes] = await Promise.all([
            supabase.from('shifts').select('*').eq('shift_date', targetYmd).eq('client_id', selectedClientId),
            supabase.from('shifts').select('*').eq('shift_date', prevTargetYmd).eq('client_id', selectedClientId)
          ])

          const targetDayStart = buildUtcIsoFromLocal(targetYmd, '00:00')
          const prevDayShifts = (prevDayShiftsRes.data || []).filter(shift => {
            const endTime = new Date(shift.time_to).getTime()
            const targetStart = new Date(targetDayStart).getTime()
            return endTime > targetStart
          })

          const originalExistingShifts = [...(currentDayShiftsRes.data || []), ...prevDayShifts]
          let dayHasOverlapError = false

          for (const s of sourceDayShifts) {
            const lineItemId = String((s as any).line_item_code_id ?? '')
            const li = lineItemCodes.find(x => x.id === lineItemId)
            const category = (s as any).category || (s as any).line_items?.category || li?.category
            if (!category) continue

            const startTime = isoToLocalHhmm(s.time_from)
            const endTime = isoToLocalHhmm(s.time_to)

            const startDateTime = buildUtcIsoFromLocal(targetYmd, startTime)
            let endDateTime = buildUtcIsoFromLocal(targetYmd, endTime)

            const [startHour, startMin] = startTime.split(':').map(Number)
            const [endHour, endMin] = endTime.split(':').map(Number)
            const startMinutes = startHour * 60 + startMin
            const endMinutes = endHour * 60 + endMin
            if (endMinutes <= startMinutes) {
              const nextDayStr = addDaysToYmd(targetYmd, 1)
              endDateTime = buildUtcIsoFromLocal(nextDayStr, endTime)
            }

            const newStart = new Date(startDateTime).getTime()
            const newEnd = new Date(endDateTime).getTime()

            let overlapCount = 0
            for (const existing of originalExistingShifts) {
              const existingStart = new Date(existing.time_from).getTime()
              const existingEnd = new Date(existing.time_to).getTime()
              if (newStart < existingEnd && newEnd > existingStart) {
                overlapCount++
              }
            }

            for (const insertedShift of allInserts) {
              if (insertedShift.shift_date === targetYmd) {
                const insertedStart = new Date(insertedShift.time_from).getTime()
                const insertedEnd = new Date(insertedShift.time_to).getTime()
                if (newStart < insertedEnd && newEnd > insertedStart) {
                  overlapCount++
                }
              }
            }

            if (overlapCount >= 2) {
              if (!weeksWithOverlaps.includes(targetWeekStart)) {
                weeksWithOverlaps.push(targetWeekStart)
              }
              dayHasOverlapError = true
              continue
            }

            let cost: number
            let lineItemCodeId: string | null = null

            if (category === 'HIREUP') {
              cost = Number(s.cost || 0)
              lineItemCodeId = null
            } else {
              const isSleepover = !!li?.sleepover
              const isPublicHoliday = !!li?.public_holiday
              const dayType = getDayTypeFromYmd(targetYmd)
              const targetLineItem = pickLineItemForShift({
                category,
                dayType,
                isSleepover,
                isPublicHoliday
              })

              if (!targetLineItem) {
                throw new Error(`No line item found for ${category} (${dayType})`)
              }

              cost = computeCostForShiftParams({
                shiftDateYmd: targetYmd,
                category,
                startTime,
                endTime,
                isSleepover,
                isPublicHoliday
              })
              lineItemCodeId = targetLineItem.id
            }

            allInserts.push({
              shift_date: targetYmd,
              time_from: startDateTime,
              time_to: endDateTime,
              carer_id: s.carer_id,
              client_id: s.client_id,
              line_item_code_id: lineItemCodeId,
              category: category,
              cost
            })
          }
        }
      }

      if (weeksWithOverlaps.length > 0) {
        const weeksList = weeksWithOverlaps.map(d => {
          const date = parseYmdToLocalDate(d)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
        }).join(', ')
        setCopyWeekError(`Cannot copy to the following weeks due to triple overlap: ${weeksList}`)
        return
      }

      if (allInserts.length === 0) {
        setCopyWeekError('No shifts could be copied (all would cause triple overlaps)')
        return
      }

      const { error: insertError } = await supabase.from('shifts').insert(allInserts)
      if (insertError) throw insertError

      setShowCopyWeekDialog(false)
      setCopyWeekSelected([])
      setCopyWeekError(null)

      await fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to copy week'
      setCopyWeekError(msg)
    } finally {
      setCopyWeekIsWorking(false)
    }
  }

  // Compute breakdown of overlapping line items and total cost
  const computeCostBreakdown = () => {
    // result rows: { code, description, frameFrom, frameTo, hours, rate, total, isSleepover }
    const rows: Array<{
      code: string
      description: string
      frameFrom: string
      frameTo: string
      hours: number
      rate: number
      total: number
      isSleepover: boolean
    }> = []

    if (!newShift.category || !newShift.start_time || !newShift.end_time) {
      return { rows, total: 0 }
    }

    // Determine day type from the shift's actual date (not currentDate, in case we're viewing a different day)
    const getDayTypeForOffset = (offset: number) => {
      const shiftBaseDate = new Date(newShift.shift_date)
      const d = new Date(shiftBaseDate)
      d.setDate(d.getDate() + offset)
      return getDayType(d)
    }

    // helper to parse HH:MM to minutes since 00:00
    const parseToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    const minutesToLabel = (mins: number, dayOffset: number) => {
      const normalized = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60)
      const hh = String(Math.floor(normalized / 60)).padStart(2, '0')
      const mm = String(normalized % 60).padStart(2, '0')
      return `${hh}:${mm}${dayOffset > 0 ? ` (+${dayOffset}d)` : ''}`
    }

    let selStart = parseToMinutes(newShift.start_time)
    let selEnd = parseToMinutes(newShift.end_time)
    // if selection crosses midnight (end <= start) treat end as next day
    if (selEnd <= selStart) selEnd += 24 * 60

    // Break the selection into day segments so each day's rates and windows are applied correctly
    type Segment = { dayOffset: number; start: number; end: number }
    const segments: Segment[] = []
    let cursor = selStart
    while (cursor < selEnd) {
      const dayOffset = Math.floor(cursor / (24 * 60))
      const dayEnd = (dayOffset + 1) * 24 * 60
      const segEnd = Math.min(selEnd, dayEnd)
      segments.push({
        dayOffset,
        start: cursor - dayOffset * 24 * 60,
        end: segEnd - dayOffset * 24 * 60
      })
      cursor = segEnd
    }

    // HIREUP: flat user-entered cost, no time windows, no shift type toggles
    if (newShift.category === 'HIREUP') {
      const rate = Number(newShift.hireup_cost || 0)
      if (!Number.isFinite(rate) || rate <= 0) {
        return { rows, total: 0 }
      }

      const endLabel = isEndTimeNextDay(newShift.start_time, newShift.end_time)
        ? `${newShift.end_time} (+1d)`
        : newShift.end_time

      rows.push({
        code: 'HIREUP',
        description: 'HIREUP Shift',
        frameFrom: newShift.start_time,
        frameTo: endLabel,
        hours: 0,
        rate,
        total: rate,
        isSleepover: false
      })

      return { rows, total: rate }
    }

    // If shift is explicitly a sleepover, charge a flat sleepover rate (no time windows)
    if (newShift.is_sleepover) {
      // Get day type for the shift's base date
      const dayType = getDayTypeForOffset(0)
      
      // Filter line items by category AND day type
      const baseMatchingLineItems = lineItemCodes.filter(li => {
        if (li.category !== newShift.category) return false
        // Public holiday rates are day-agnostic; otherwise respect weekday/sat/sun flags
        return newShift.is_public_holiday ? true : lineItemMatchesDayType(li, dayType)
      })
      
      const sleepoverPool = baseMatchingLineItems.filter(li => li.sleepover === true)
      const sleepoverItem = newShift.is_public_holiday
        ? sleepoverPool.find(li => li.public_holiday === true) || sleepoverPool.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { sensitivity: 'base' }))[0]
        : sleepoverPool.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { sensitivity: 'base' }))[0]

      if (!sleepoverItem) {
        return { rows, total: 0 }
      }

      const rate = (sleepoverItem.billed_rate as unknown as number) || 0
      const total = Math.round(rate * 100) / 100

      const endLabel = isEndTimeNextDay(newShift.start_time, newShift.end_time)
        ? `${newShift.end_time} (+1d)`
        : newShift.end_time

      rows.push({
        code: sleepoverItem.code || String(sleepoverItem.id || ''),
        description: sleepoverItem.description || 'Sleepover',
        frameFrom: newShift.start_time,
        frameTo: endLabel,
        hours: 0,
        rate,
        total,
        isSleepover: true
      })

      return { rows, total }
    }

    for (const segment of segments) {
      const dayType = getDayTypeForOffset(segment.dayOffset)

      // Filter line items by category AND day type, then by shift type
      const baseMatchingLineItems = lineItemCodes.filter(li => {
        if (li.category !== newShift.category) return false
        // Public holiday sleepovers should not be filtered by weekday/sat/sun flags
        return newShift.is_public_holiday ? true : lineItemMatchesDayType(li, dayType)
      })

      console.log(`💰 Cost calculation - dayType: ${dayType}, category: ${newShift.category}, matching line items:`, baseMatchingLineItems.length)
      console.log(`💰 All line items for category:`, lineItemCodes.filter(li => li.category === newShift.category))

      const matchingLineItems = baseMatchingLineItems.filter(li => {
        // Public holiday shift uses only PH line items (excluding sleepover)
        if (newShift.is_public_holiday) {
          return li.public_holiday === true && li.sleepover !== true
        }
        // Standard shift excludes PH and sleepover line items
        return li.public_holiday !== true && li.sleepover !== true
      })

      console.log(`💰 After shift type filter:`, matchingLineItems.length, matchingLineItems)

      for (const li of matchingLineItems) {
        const hasWindow = !!li.time_from && !!li.time_to

        const addOverlapRow = (startMinutes: number, endMinutes: number) => {
          const overlapStart = Math.max(segment.start, startMinutes)
          const overlapEnd = Math.min(segment.end, endMinutes)
          const overlapMinutes = Math.max(0, overlapEnd - overlapStart)
          if (overlapMinutes <= 0) return

          const hours = Math.round((overlapMinutes / 60) * 100) / 100
          const rate = (li.billed_rate as unknown as number) || 0
          const total = Math.round(hours * rate * 100) / 100

          rows.push({
            code: li.code || String(li.id || ''),
            description: li.description || '',
            frameFrom: minutesToLabel(overlapStart + segment.dayOffset * 24 * 60, segment.dayOffset),
            frameTo: minutesToLabel(overlapEnd + segment.dayOffset * 24 * 60, segment.dayOffset),
            hours,
            rate,
            total,
            isSleepover: false
          })
        }

        if (!hasWindow) {
          // Time-agnostic items apply to the full day
          addOverlapRow(0, 24 * 60)
          continue
        }

        let liStart = parseToMinutes(li.time_from || '00:00')
        let liEnd = parseToMinutes(li.time_to || '23:59')

        // handle wrap-around (e.g., 20:00 -> 00:00)
        if (liEnd <= liStart) {
          // Split into two parts within the day: [liStart, 1440) and [0, liEnd)
          addOverlapRow(liStart, 24 * 60)
          addOverlapRow(0, liEnd)
        } else {
          addOverlapRow(liStart, liEnd)
        }
      }
    }

    const total = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100
    return { rows, total }
  }

  // backward-compatible total getter used previously
  const calculateCost = (): number => {
    return computeCostBreakdown().total
  }

  const handleSaveShift = async () => {
    const callId = Date.now() + '-' + Math.random()
    console.log('🔵 handleSaveShift CALLED - callId:', callId)
    
    try {
      console.log('Starting handleSaveShift - callId:', callId)
      
      // Validate that carer is selected
      if (!newShift.carer_id) {
        setError('Please select a carer')
        return
      }

      // Validate that client is selected
      if (!selectedClientId) {
        setError('Please select a client from the top menu')
        return
      }
      
      // Validate that the same carer doesn't have overlapping shifts
      const hasOverlap = checkCarerOverlap(
        newShift.carer_id,
        newShift.start_time,
        newShift.end_time,
        newShift.shift_date,
        editingShift?.id // Exclude the current shift if editing
      )
      
      if (hasOverlap) {
        setError('This carer already has a shift that overlaps with the selected time. Carers can only have one shift at a time.')
        return
      }

      // Validate that no more than 2 shifts overlap at any point
      const hasTripleOverlap = checkTripleOverlap(
        newShift.start_time,
        newShift.end_time,
        newShift.shift_date,
        editingShift?.id // Exclude the current shift if editing
      )

      if (hasTripleOverlap) {
        setError('This shift would cause 3 or more shifts to overlap. Maximum 2 overlapping shifts allowed.')
        return
      }
      
      const supabase = getSupabaseClient()
      
      // Require cost for HIREUP
      if (newShift.category === 'HIREUP') {
        const hireupCost = Number(newShift.hireup_cost)
        if (!Number.isFinite(hireupCost) || hireupCost <= 0) {
          setError('Enter a valid cost for HIREUP')
          return
        }
      }

      const totalCost = calculateCost()
      
      // Find the correct line item code ID based on category + day type + shift type
      const dayType = getDayTypeFromYmd(newShift.shift_date)

      const matchingForShift = lineItemCodes
        .filter(li => li.category === newShift.category)
        // Public holiday items are day-agnostic; otherwise honor weekday/sat/sun flags
        .filter(li => (newShift.is_public_holiday ? true : lineItemMatchesDayType(li, dayType)))

      const lineItem = (() => {
        if (newShift.category === 'HIREUP') return null
        if (newShift.is_sleepover) {
          return matchingForShift
            .filter(li => li.sleepover === true)
            .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { sensitivity: 'base' }))[0]
        }
        if (newShift.is_public_holiday) {
          return matchingForShift
            .filter(li => li.public_holiday === true && li.sleepover !== true)
            .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { sensitivity: 'base' }))[0]
        }
        return matchingForShift
          .filter(li => li.public_holiday !== true && li.sleepover !== true)
          .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), undefined, { sensitivity: 'base' }))[0]
      })()

      const category = newShift.category as string | null | undefined
      if (!lineItem && category && category !== 'HIREUP') {
        if (newShift.is_sleepover) setError('No sleepover line item found for the selected category/day')
        else if (newShift.is_public_holiday) setError('No public holiday line item found for the selected category/day')
        else setError('There are no line item codes for this category covering the selected time frame. Please [add line item code] or select another time for the shift')
        return
      }
      
      if (lineItem) {
        console.log('📝 Line item found for save:', {
          id: lineItem.id,
          category: lineItem.category,
          idType: typeof lineItem.id
        })
      }
      
      // Prepare the shift data with proper TIMESTAMPTZ format
      const startDateTime = buildUtcIsoFromLocal(newShift.shift_date, newShift.start_time)
      let endDateTime = buildUtcIsoFromLocal(newShift.shift_date, newShift.end_time)
      
      // Handle overnight shifts: if end time is earlier than start time, add one day
      const [startHour, startMin] = newShift.start_time.split(':').map(Number)
      const [endHour, endMin] = newShift.end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      
      if (endMinutes <= startMinutes) {
        // This is an overnight shift, add one day to the end time
        const nextDayStr = addDaysToYmd(newShift.shift_date, 1)
        endDateTime = buildUtcIsoFromLocal(nextDayStr, newShift.end_time)
      }
      
      const shiftData = {
        shift_date: newShift.shift_date,
        time_from: startDateTime,
        time_to: endDateTime,
        carer_id: newShift.carer_id,
        client_id: selectedClientId,
        line_item_code_id: lineItem ? lineItem.id : null, // Keep as string (UUID) - don't convert to Number
        category: newShift.category, // Save the category directly to the shift
        cost: totalCost,
        is_sleepover: Boolean(newShift.is_sleepover),
        is_public_holiday: Boolean(newShift.is_public_holiday)
      }
      
      console.log('Attempting to save shift with data:', shiftData)
      console.log('Line item found:', lineItem)
      
      // Execute insert or update
      let result
      if (editingShift) {
        console.log('Updating existing shift:', editingShift.id)
        result = await supabase
          .from('shifts')
          .update(shiftData)
          .eq('id', editingShift.id)
          .select()
      } else {
        console.log('Creating new shift with data:', shiftData)
        result = await supabase.from('shifts').insert(shiftData).select()
        console.log('Insert result:', result)
      }
      
      const { data, error } = result
      
      if (error) {
        console.error('Detailed Supabase error:', error)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Error code:', error.code)
        throw error
      }
      
      console.log('Shift saved successfully:', data)
      setShowShiftDialog(false)
      resetDrag()
      
      // Refresh shifts data to show the new shift
      const dayYmd = toYmdLocal(currentDate)
      const rangeFrom = dateFrom || dayYmd
      const rangeTo = dateTo || dayYmd

      const [refreshShiftsRes, refreshClientsRes, refreshRangeShiftsRes] = await Promise.all([
        supabase.from('shifts').select(`
          *, 
          carers(id, first_name, last_name, email, color), 
          line_items(id, code, category, description, billed_rate)
        `).eq('shift_date', toYmdLocal(currentDate)).order('time_from'),
        supabase.from('clients').select('*'),
        supabase.from('shifts').select(`
          *,
          carers(id, first_name, last_name, email, color),
          line_items(id, code, category, description, billed_rate)
        `).gte('shift_date', rangeFrom).lte('shift_date', rangeTo)
      ])
      
      if (refreshShiftsRes.error) {
        console.error('Error refreshing shifts:', refreshShiftsRes.error)
      } else {
        // Manually join clients data with shifts
        const clientsMap = new Map((refreshClientsRes.data || []).map(client => [client.id, client]))
        const refreshedShiftsWithClients = (refreshShiftsRes.data || []).map(shift => ({
          ...shift,
          clients: shift.client_id ? clientsMap.get(shift.client_id) : null
        }))
        
        // Filter shifts by selected client
        const filteredRefreshShifts = refreshedShiftsWithClients.filter(
          s => !selectedClientId || s.client_id === selectedClientId
        )
        
        setShifts(filteredRefreshShifts)
        console.log('Shifts refreshed:', refreshedShiftsWithClients?.length)
        console.log('📊 Refreshed shifts data:', refreshedShiftsWithClients)
        console.log('📊 Sample refreshed shift:', refreshedShiftsWithClients?.[0])
      }

      if (!refreshRangeShiftsRes.error) {
        // Filter range shifts by selected client
        const filteredRefreshRangeShifts = (refreshRangeShiftsRes.data || []).filter(
          s => !selectedClientId || s.client_id === selectedClientId
        )
        setRangeShifts(filteredRefreshRangeShifts)
        const { carerTotals, overlapSummary, overallTotals } = computeSidebarAggregates(filteredRefreshRangeShifts)
        setCarerTotals(carerTotals)
        setOverlapSummary(carerTotals.length === 0 ? null : overlapSummary)
        setOverallTotals(overallTotals)
      }
      
      setError(null) // Clear any previous errors
    } catch (err) {
      console.error('Error saving shift:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error details:', err)
      setError(`Failed to save shift: ${errorMessage}`)
    }
  }

  // Handle deleting a shift
  const handleDeleteShift = async () => {
    if (!editingShift || !confirm('Are you sure you want to delete this shift?')) return
    
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('shifts').delete().eq('id', editingShift.id)
      
      if (error) {
        console.error('Delete error:', error)
        setError(`Failed to delete shift: ${error.message}`)
        return
      }
      
      // Remove from local state
      setShifts(prev => prev.filter(s => s.id !== editingShift.id))
      
      setShowShiftDialog(false)
      resetDrag()
      setError(null)

      // Refresh range totals/sidebar
      fetchData()
    } catch (err) {
      console.error('Error deleting shift:', err)
      setError('Failed to delete shift')
    }
  }

  const resetDrag = () => {
    setDragStart(0)
    setDragEnd(0)
    setNewShift({
      shift_date: '',
      start_time: '',
      end_time: '',
      carer_id: null,
      client_id: null,
      category: null,
      line_item_code_id: null,
      is_sleepover: false,
      is_public_holiday: false
    })
    setEditingShift(null)
  }

  // Drag handlers for shift movement and resizing
  const handleShiftMouseDown = (e: React.MouseEvent, shift: Shift, dragType: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation()
    e.preventDefault()
    
    const startTime = new Date(shift.time_from).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(shift.time_to).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    
    setDragState({
      isDragging: dragType === 'move',
      isResizing: dragType.startsWith('resize'),
      shiftId: shift.id,
      dragType,
      startY: e.clientY,
      startTime,
      endTime,
      originalShift: shift
    })
  }

  // Update shift times in database
  const updateShiftTimes = async (shiftId: number, newStartTime: string, newEndTime: string) => {
    try {
      const supabase = getSupabaseClient()
      
      // Get the shift's date
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift) return

      const shiftDate = shift.shift_date
      
      // Validate same carer overlap
      const hasCarerOverlap = checkCarerOverlap(
        shift.carer_id,
        newStartTime,
        newEndTime,
        shiftDate,
        shiftId // Exclude the current shift being edited
      )
      
      if (hasCarerOverlap) {
        setError('This carer already has a shift that overlaps with the selected time. Carers can only have one shift at a time.')
        return
      }

      // Validate triple overlap
      const hasTripleOverlap = checkTripleOverlap(
        newStartTime,
        newEndTime,
        shiftDate,
        shiftId // Exclude the current shift being edited
      )

      if (hasTripleOverlap) {
        setError('This shift would cause 3 or more shifts to overlap. Maximum 2 overlapping shifts allowed.')
        return
      }
      
      // Handle overnight shifts
      const startMinutes = timeStringToMinutes(newStartTime)
      const endMinutes = timeStringToMinutes(newEndTime)
      
      let startDateTime = buildUtcIsoFromLocal(shiftDate, newStartTime)
      let endDateTime = buildUtcIsoFromLocal(shiftDate, newEndTime)
      
      if (endMinutes <= startMinutes) {
        // Overnight shift - add one day to end time
        const nextDayStr = addDaysToYmd(shiftDate, 1)
        endDateTime = buildUtcIsoFromLocal(nextDayStr, newEndTime)
      }
      
      const { error } = await supabase
        .from('shifts')
        .update({
          time_from: startDateTime,
          time_to: endDateTime
        })
        .eq('id', shiftId)
      
      if (error) {
        console.error('Error updating shift times:', error)
        setError('Failed to update shift times')
      } else {
        // Refresh shifts to show updated times
        fetchData()
      }
    } catch (error) {
      console.error('Error in updateShiftTimes:', error)
      setError('Failed to update shift times')
    }
  }

  // Handle editing existing shift
  const handleEditShift = (shift: Shift) => {
    console.log('📝 Editing shift:', shift)
    console.log('📝 Shift details:', {
      time_from: shift.time_from,
      time_to: shift.time_to,
      client_id: shift.client_id,
      line_items: shift.line_items,
      line_item_code_id: shift.line_item_code_id
    })
    
    // Convert shift time back to local time format
    // Handle UTC times properly - the database stores UTC times with +00:00
    const fromTime = new Date(shift.time_from)
    const toTime = new Date(shift.time_to)
    
    console.log('📝 Raw times from database:', {
      time_from: shift.time_from,
      time_to: shift.time_to,
      parsed_from: fromTime.toString(),
      parsed_to: toTime.toString(),
      fromTime_UTC_hours: fromTime.getUTCHours(),
      fromTime_local_hours: fromTime.getHours(),
      timezone_offset: fromTime.getTimezoneOffset()
    })
    
    // Get local hours and minutes (JavaScript automatically converts UTC to local)
    // Use toLocaleTimeString to ensure proper formatting for HTML time input
    const fromTimeString = fromTime.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    const toTimeString = toTime.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    
    console.log('📝 Converted times for form:', {
      start_time: fromTimeString,
      end_time: toTimeString,
      note: 'Using toLocaleTimeString for proper time input formatting'
    });

    // Handle category - prefer category stored directly on shift (for HIREUP), fallback to line item
    let selectedLineItemId: string | number | null = null
    let selectedCategory: string | null = null
    
    // Check if shift has category stored directly (HIREUP case)
    if ((shift as any).category) {
      selectedCategory = (shift as any).category
      console.log('📝 Using category from shift record:', selectedCategory)
      
      // For HIREUP, don't set line_item_code_id
      if (selectedCategory === 'HIREUP') {
        selectedLineItemId = null
      } else {
        // For non-HIREUP with stored category, try to find matching line item
        const lineItem = lineItemCodes.find(li => li.category === selectedCategory)
        if (lineItem) {
          selectedLineItemId = lineItem.id
        }
      }
    } else if (shift.line_item_code_id) {
      // If no category on shift, fall back to line item lookup
      const lineItem = lineItemCodes.find(li => li.id === shift.line_item_code_id.toString())
      if (lineItem) {
        selectedLineItemId = lineItem.id
        selectedCategory = lineItem.category
      }
    }
    
    // If still no valid category found, use the first available line item as default
    if (!selectedCategory && lineItemCodes.length > 0) {
      const firstLineItem = lineItemCodes[0]
      selectedLineItemId = firstLineItem.id
      selectedCategory = firstLineItem.category
      console.log('📝 No valid category found, using default:', firstLineItem)
    }

    console.log('📝 Category and line item selection:', {
      shift_category: (shift as any).category,
      original_line_item_code_id: shift.line_item_code_id,
      selected_line_item_id: selectedLineItemId,
      selected_category: selectedCategory
    })

    // Handle missing client_id - could be null due to database relationship issues
    let clientId = shift.client_id || null
    
    // If no client_id and we have clients available, default to first one to prevent "Select Client"
    if (!clientId && clients.length > 0) {
      clientId = clients[0].id
      console.log('📝 No client_id found, using default:', clients[0])
    }
    
    console.log('📝 Client ID analysis:', {
      shift_client_id: shift.client_id,
      clients_available: clients.length,
      final_client_id: clientId
    })

    const { isSleepover, isPublicHoliday } = inferShiftFlags(shift)

    const newShiftData = {
      shift_date: shift.shift_date,
      start_time: fromTimeString,
      end_time: toTimeString,
      carer_id: shift.carer_id,
      client_id: clientId,
      category: selectedCategory,
      line_item_code_id: selectedLineItemId,
      is_sleepover: isSleepover,
      is_public_holiday: isPublicHoliday,
      hireup_cost: selectedCategory === 'HIREUP' ? Number(shift.cost ?? 0) || null : null
    }
    
    console.log('📝 Setting newShift to:', newShiftData)
    
    setNewShift(newShiftData)
    setEditingShift(shift)
    setShowShiftDialog(true)
  }

  const getDragStyle = () => {
    if (!isDragging) return { display: 'none' }
    
    const startY = Math.min(dragStart, dragEnd)
    const endY = Math.max(dragStart, dragEnd)
    const height = Math.max(endY - startY, QUARTER_HOUR_HEIGHT)
    
    return {
      position: 'absolute' as const,
      top: startY,
      left: 0,
      right: 0,
      height: height,
      background: 'rgba(59, 130, 246, 0.3)',
      border: '2px solid #3b82f6',
      borderRadius: '4px',
      pointerEvents: 'none' as const,
      zIndex: 10
    }
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    return monday;
  }

  const getSunday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
    return sunday;
  }

  const renderErrorMessage = (errorText: string) => {
    // Check if error contains link marker [text]
    const linkPattern = /\[([^\]]+)\]/
    const match = errorText.match(linkPattern)
    
    if (match) {
      const linkText = match[1]
      const parts = errorText.split(linkPattern)
      
      return (
        <>
          {parts[0]}
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setShowShiftDialog(false)
              resetDrag()
              router.push('/line-item-codes')
            }}
            style={{
              color: '#2563eb',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {linkText}
          </a>
          {parts[2]}
        </>
      )
    }
    
    return errorText
  }

      const handleOpenInvoiceDialog = () => {
        // Check if date range is specified
        if (!dateFrom || !dateTo) {
          setError('Please specify date range first')
          return
        }
        
        setInvoiceError(null)
        setShowActionsMenu(false)
        setInvoiceDate(toYmdLocal(new Date()))

        // Seed options from in-memory counts while we fetch authoritative counts
        setInvoiceCarerOptions(carersWithShiftsInRange)
        const firstCarerId = carersWithShiftsInRange[0]?.carer.id
        setInvoiceCarerIds(firstCarerId ? [firstCarerId] : [])
        setInvoiceNumber(prev => prev || 'INV-')
        setShowInvoiceDialog(true)

        void refreshInvoiceCarerCounts()
      }

      const handleGenerateInvoice = async () => {
        if (invoiceCarerIds.length !== 1) {
          setInvoiceError('Select one carer to generate an invoice.')
          return
        }

        const trimmedInvoiceNumber = invoiceNumber.trim()
        if (!trimmedInvoiceNumber) {
          setInvoiceError('Invoice number is required.')
          return
        }
        
        // Validate invoice number format (alphanumeric, hyphens, underscores only)
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedInvoiceNumber)) {
          setInvoiceError('Invoice number can only contain letters, numbers, hyphens, and underscores.')
          return
        }

        const fallbackDate = toYmdLocal(currentDate)
        const timezoneOffset = new Date().getTimezoneOffset() // Browser's UTC offset in minutes
        const payload = {
          invoiceDate: invoiceDate || fallbackDate,
          invoiceNumber: invoiceNumber.trim(),
          carerIds: invoiceCarerIds,
          clientId: selectedClientId || undefined,
          dateFrom: dateFrom || fallbackDate,
          dateTo: dateTo || fallbackDate,
          timezoneOffset: -timezoneOffset // Negate because getTimezoneOffset returns negative for UTC+ zones
        }

        try {
          setInvoiceIsGenerating(true)
          setInvoiceError(null)
          setInvoiceSuccess(null)

          const res = await fetch('/api/generate-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (!res.ok) {
            const details = await res.json().catch(() => ({} as any))
            throw new Error(details?.error || 'Failed to generate invoice.')
          }

          const json = await res.json()
          
          // Calculate due date (invoice date + 7 days)
          const invDate = new Date(invoiceDate || fallbackDate)
          const dDate = new Date(invDate)
          dDate.setDate(dDate.getDate() + 7)
          
          // Format dates as DD/MM/YYYY
          const formatDate = (d: Date) => {
            const dd = String(d.getDate()).padStart(2, '0')
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const yyyy = d.getFullYear()
            return `${dd}/${mm}/${yyyy}`
          }
          
          // Store file data for user to download
          if (json.file?.data) {
            setInvoiceSuccess({
              fileName: json.file.name,
              fileData: json.file.data,
              mimeType: json.file.mimeType,
              invoiceDate: formatDate(invDate),
              dueDate: formatDate(dDate)
            })
          }

          setInvoiceError(null)
          setInvoiceNumber('')
          setInvoiceCarerIds([])
          
          // Refresh invoice list if it was loaded
          if (typeof window !== 'undefined') {
            // Dispatch custom event to notify invoices page to refresh
            window.dispatchEvent(new CustomEvent('invoiceGenerated'))
          }
        } catch (err) {
          setInvoiceError(err instanceof Error ? err.message : 'Failed to generate invoice.')
          setInvoiceSuccess(null)
        } finally {
          setInvoiceIsGenerating(false)
        }
      }

      const handleDownloadInvoice = () => {
        if (!invoiceSuccess) return
        
        const binaryString = atob(invoiceSuccess.fileData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: invoiceSuccess.mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = invoiceSuccess.fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        setInvoiceSuccess(null)
      }

  const handleCopyDayClick = () => {
    setCopyDayError(null)
    if (!dateFrom || !dateTo) {
      setCopyDayError('Set Date from and Date to first')
      setShowCopyDayDialog(true)
      return
    }

    const srcYmd = toYmdLocal(currentDate)
    void listDaysInclusive(dateFrom, dateTo)
      .filter(d => d !== srcYmd)

    setCopyDaySelected([])
    setShowCopyDayDialog(true)
  }

  const handleCopyWeekClick = () => {
    setCopyWeekError(null)
    if (!dateFrom || !dateTo) {
      setCopyWeekError('Set Date from and Date to first')
      setShowCopyWeekDialog(true)
      return
    }

    setCopyWeekSelected([])
    setShowCopyWeekDialog(true)
  }

  const handleDeleteAllShiftsForDay = async (dayYmd: string) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('shifts').delete().eq('shift_date', dayYmd).eq('client_id', selectedClientId)
      
      if (error) throw error
      
      setDeleteAllShiftsDateConfirm(null)
      await fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete shifts'
      setError(msg)
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  })

  return (
    <div className="calendar-container">
      {/* Show loading spinner while data is being fetched */}
      {isLoading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(125, 211, 252, 0.2)',
            borderTop: '4px solid #7dd3fc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            fontSize: '18px',
            color: 'var(--text)',
            fontWeight: 500
          }}>
            Loading calendar...
          </div>
        </div>
      )}

      {/* Check if required data is missing (only after loading is complete) */}
      {!isLoading && clients.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontSize: '18px',
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          margin: '20px'
        }}>
          ❌ Please add your first Client for the Calendar to work
        </div>
      )}
      
      {!isLoading && carers.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontSize: '18px',
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          margin: '20px'
        }}>
          ❌ Please add your first Carer for the Calendar to work
        </div>
      )}
      
      {!isLoading && lineItemCodes.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontSize: '18px',
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          margin: '20px'
        }}>
          ❌ Please add your first Line Item Code for the Calendar to work
        </div>
      )}

      {/* Only show calendar controls and content if all required data exists and loading is complete */}
      {!isLoading && clients.length > 0 && carers.length > 0 && lineItemCodes.length > 0 && (
        <>
      <div className="cal-header">
        <h1>{viewMode === 'week' ? 'Calendar - Week View' : 'Calendar - Day View'}</h1>

        <div className="cal-range-controls">
          <label className="cal-range-field">
            <span className="cal-range-label">Date from</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo ? addDaysToYmd(dateTo, -1) : undefined}
              onChange={(e) => {
                const nextFrom = normalizeDateInput(e.target.value)
                setDateRangeError(null)
                setDateFrom(nextFrom)

                try {
                  if (nextFrom) localStorage.setItem('calendar.dateFrom', nextFrom)
                  else localStorage.removeItem('calendar.dateFrom')
                } catch {
                  // ignore
                }

                if (dateTo && nextFrom && dateTo <= nextFrom) {
                  setDateTo('')
                  try {
                    localStorage.removeItem('calendar.dateTo')
                  } catch {
                    // ignore
                  }
                }

                if (nextFrom && toYmdLocal(currentDate) < nextFrom) {
                  setCurrentDate(parseYmdToLocalDate(nextFrom))
                }
              }}
            />
          </label>

          <label className="cal-range-field">
            <span className="cal-range-label">Date to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom ? addDaysToYmd(dateFrom, 1) : undefined}
              onChange={(e) => {
                const nextTo = normalizeDateInput(e.target.value)
                if (dateFrom && nextTo && nextTo <= dateFrom) {
                  setDateRangeError('Date to must be after Date from')
                  return
                }

                setDateRangeError(null)
                setDateTo(nextTo)

                try {
                  if (nextTo) localStorage.setItem('calendar.dateTo', nextTo)
                  else localStorage.removeItem('calendar.dateTo')
                } catch {
                  // ignore
                }

                if (nextTo && toYmdLocal(currentDate) > nextTo) {
                  setCurrentDate(parseYmdToLocalDate(nextTo))
                }
              }}
            />
          </label>
        </div>

        {dateRangeError && <div className="cal-range-error">{dateRangeError}</div>}

        <div className="cal-range-controls">
          <label className="cal-range-field">
            <span className="cal-range-label">Client</span>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cal-date-nav">
          <button
            disabled={!!dateFrom && toYmdLocal(new Date(currentDate.getTime() - (viewMode === 'day' ? 24 : 7 * 24) * 60 * 60 * 1000)) < dateFrom}
            onClick={() => {
              const decrement = viewMode === 'day' ? 24 : 7 * 24;
              const prev = new Date(currentDate.getTime() - decrement * 60 * 60 * 1000)
              if (dateFrom && toYmdLocal(prev) < dateFrom) return
              setCurrentDate(prev)
            }}
          >
            {viewMode === 'day' ? '← Previous Day' : '← Previous Week'}
          </button>
          <span className="cal-current-date">
            {viewMode === 'day' 
              ? formatDate(currentDate)
              : `${formatDate(getMonday(currentDate))} - ${formatDate(getSunday(currentDate))}`
            }
          </span>
          <button
            disabled={!!dateTo && toYmdLocal(new Date(currentDate.getTime() + (viewMode === 'day' ? 24 : 7 * 24) * 60 * 60 * 1000)) > dateTo}
            onClick={() => {
              const increment = viewMode === 'day' ? 24 : 7 * 24;
              const next = new Date(currentDate.getTime() + increment * 60 * 60 * 1000)
              if (dateTo && toYmdLocal(next) > dateTo) return
              setCurrentDate(next)
            }}
          >
            {viewMode === 'day' ? 'Next Day →' : 'Next Week →'}
          </button>
        </div>
        <div className="cal-button-group">
          <button onClick={() => setCurrentDate(new Date())}>
            {viewMode === 'day' ? 'Today' : 'Current Week'}
          </button>
          <button 
            onClick={() => {
              const newMode = viewMode === 'day' ? 'week' : 'day'
              console.log(`🔘 Switching view from ${viewMode} to ${newMode}`)
              setViewMode(newMode)
            }}
            className="view-toggle-btn"
          >
            {viewMode === 'day' ? 'Week View' : 'Day View'}
          </button>
        </div>
        <div className="cal-actions">
          <button
            className="cal-actions-btn"
            onClick={() => setShowActionsMenu((v) => !v)}
            disabled={!!dateRangeError}
          >
            Actions ▾
          </button>
          {showActionsMenu && (
            <div className="cal-actions-menu">
              {viewMode === 'day' && (
                <button
                  className="cal-actions-item"
                  onClick={() => {
                    setShowActionsMenu(false)
                    handleCopyDayClick()
                  }}
                >
                  Copy day
                </button>
              )}
              {viewMode === 'week' && (
                <button
                  className="cal-actions-item"
                  onClick={() => {
                    setShowActionsMenu(false)
                    handleCopyWeekClick()
                  }}
                >
                  Copy week
                </button>
              )}
              <button
                className="cal-actions-item"
                onClick={() => {
                  handleOpenInvoiceDialog()
                }}
              >
                Generate invoice
              </button>
            </div>
          )}
        </div>
      </div>

      {showCopyDayDialog && (
        <div className="cal-dialog-overlay">
          <div className="cal-copy-dialog">
            <h3>Copy day</h3>
            <div style={{ marginBottom: 8, color: '#374151', fontSize: 14 }}>
              Copy shifts from <strong>{formatDate(currentDate)}</strong> to selected days.
            </div>

            {(!dateFrom || !dateTo) ? (
              <div style={{ color: '#dc2626', marginTop: 8 }}>
                Set Date from and Date to first.
              </div>
            ) : (
              <div className="cal-copy-days">
                {listDaysInclusive(dateFrom, dateTo)
                  .filter(d => d !== toYmdLocal(currentDate))
                  .map((ymd) => {
                    const checked = copyDaySelected.includes(ymd)
                    const label = parseYmdToLocalDate(ymd).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                    return (
                      <label key={ymd} className="cal-copy-day">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...copyDaySelected, ymd]
                              : copyDaySelected.filter(x => x !== ymd)
                            setCopyDaySelected(next)
                            setCopyDayError(null)
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    )
                  })}
              </div>
            )}

            {copyDayError && (
              <div className="cal-error-toast" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginTop: 10 }}>
                Error: {copyDayError}
              </div>
            )}

            <div className="cal-dialog-buttons" style={{ marginTop: 16 }}>
              <button
                onClick={() => {
                  setShowCopyDayDialog(false)
                  setCopyDaySelected([])
                  setCopyDayError(null)
                }}
                disabled={copyDayIsWorking}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCopyDay}
                disabled={copyDayIsWorking || !dateFrom || !dateTo || copyDaySelected.length === 0}
              >
                {copyDayIsWorking ? 'Copying…' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCopyWeekDialog && (
        <div className="cal-dialog-overlay">
          <div className="cal-copy-dialog">
            <h3>Copy week</h3>
            <div style={{ marginBottom: 8, color: '#374151', fontSize: 14 }}>
              Copy all shifts from <strong>{parseYmdToLocalDate(toYmdLocal(getMonday(currentDate))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {parseYmdToLocalDate(toYmdLocal(getSunday(currentDate))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong> to selected weeks.
            </div>

            {(!dateFrom || !dateTo) ? (
              <div style={{ color: '#dc2626', marginTop: 8 }}>
                Set Date from and Date to first.
              </div>
            ) : (
              <div className="cal-copy-days">
                {(() => {
                  const weeks: { start: string; label: string }[] = []
                  const srcMonday = getMonday(currentDate)
                  let currentMonday = new Date(srcMonday)
                  currentMonday.setDate(currentMonday.getDate() + 7) // Start from next week

                  const endDate = parseYmdToLocalDate(dateTo)
                  const oneYearFromNow = new Date(srcMonday)
                  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
                  const maxDate = endDate > oneYearFromNow ? oneYearFromNow : endDate

                  while (currentMonday <= maxDate) {
                    const mondayYmd = toYmdLocal(currentMonday)
                    const sunday = new Date(currentMonday)
                    sunday.setDate(sunday.getDate() + 6)
                    const label = `${currentMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    weeks.push({ start: mondayYmd, label })
                    currentMonday.setDate(currentMonday.getDate() + 7)
                  }

                  return weeks.map((week) => {
                    const checked = copyWeekSelected.includes(week.start)
                    return (
                      <label key={week.start} className="cal-copy-day">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...copyWeekSelected, week.start]
                              : copyWeekSelected.filter(x => x !== week.start)
                            setCopyWeekSelected(next)
                            setCopyWeekError(null)
                          }}
                        />
                        <span>{week.label}</span>
                      </label>
                    )
                  })
                })()}
              </div>
            )}

            {copyWeekError && (
              <div className="cal-error-toast" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginTop: 10 }}>
                Error: {copyWeekError}
              </div>
            )}

            <div className="cal-dialog-buttons" style={{ marginTop: 16 }}>
              <button
                onClick={() => {
                  setShowCopyWeekDialog(false)
                  setCopyWeekSelected([])
                  setCopyWeekError(null)
                }}
                disabled={copyWeekIsWorking}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCopyWeek}
                disabled={copyWeekIsWorking || !dateFrom || !dateTo || copyWeekSelected.length === 0}
              >
                {copyWeekIsWorking ? 'Copying…' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCopyShiftDialog && (
        <div className="cal-dialog-overlay" style={{ zIndex: 1001 }}>
          <div className="cal-copy-dialog">
            <h3>Copy Shift</h3>
            <div style={{ marginBottom: 8, color: '#374151', fontSize: 14 }}>
              Copy shift to selected days (same time: <strong>{isoToLocalHhmm(editingShift?.time_from || '')}-{isoToLocalHhmm(editingShift?.time_to || '')}</strong>).
            </div>

            {(!dateFrom || !dateTo) ? (
              <div style={{ color: '#dc2626', marginTop: 8 }}>
                Set Date from and Date to first.
              </div>
            ) : (
              <div className="cal-copy-days">
                {listDaysInclusive(dateFrom, dateTo)
                  .filter(d => d !== editingShift?.shift_date)
                  .map((ymd) => {
                    const checked = copyShiftSelected.includes(ymd)
                    const label = parseYmdToLocalDate(ymd).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                    return (
                      <label key={ymd} className="cal-copy-day">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...copyShiftSelected, ymd]
                              : copyShiftSelected.filter(x => x !== ymd)
                            setCopyShiftSelected(next)
                            setCopyShiftError(null)
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    )
                  })}
              </div>
            )}

            {copyShiftError && (
              <div className="cal-error-toast" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginTop: 10 }}>
                Error: {copyShiftError}
              </div>
            )}

            <div className="cal-dialog-buttons" style={{ marginTop: 16 }}>
              <button
                onClick={() => {
                  setShowCopyShiftDialog(false)
                  setCopyShiftSelected([])
                  setCopyShiftError(null)
                }}
                disabled={copyShiftIsWorking}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCopyShift}
                disabled={copyShiftIsWorking || !dateFrom || !dateTo || copyShiftSelected.length === 0}
              >
                {copyShiftIsWorking ? 'Copying…' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoiceDialog && (
        <div className="cal-dialog-overlay">
          <div className="cal-copy-dialog">
            <h3>Generate invoice</h3>
            <div style={{ marginBottom: 10, color: '#374151', fontSize: 14 }}>
              Uses shifts from <strong>{dateFrom || toYmdLocal(currentDate)}</strong> to <strong>{dateTo || toYmdLocal(currentDate)}</strong>.
            </div>

            <div className="cal-range-controls" style={{ gap: 12 }}>
              <label className="cal-range-field" style={{ flex: 1 }}>
                <span className="cal-range-label">Invoice date</span>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(normalizeDateInput(e.target.value))}
                />
              </label>

              <label className="cal-range-field" style={{ flex: 1 }}>
                <span className="cal-range-label">Invoice number</span>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value)
                    setInvoiceError(null)
                  }}
                  placeholder="Enter invoice number"
                />
              </label>
            </div>

            <div className="cal-range-controls" style={{ marginTop: 12 }}>
              <label className="cal-range-field" style={{ width: '100%' }}>
                <span className="cal-range-label">Carer (multi-select)</span>
                {(invoiceCarerOptions.length || carersWithShiftsInRange.length) === 0 ? (
                  <div style={{ color: '#6b7280', fontSize: 14 }}>
                    No carers have shifts in the selected period.
                  </div>
                ) : (
                  <select
                    multiple
                    size={Math.min(6, Math.max(3, (invoiceCarerOptions.length || carersWithShiftsInRange.length)))}
                    value={invoiceCarerIds.map(String)}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                      setInvoiceCarerIds(selected)
                      setInvoiceError(null)
                    }}
                  >
                    {(invoiceCarerOptions.length ? invoiceCarerOptions : carersWithShiftsInRange).map(({ carer, count }) => (
                      <option key={carer.id} value={carer.id}>
                        {carer.first_name} {carer.last_name} ({count} shift{count === 1 ? '' : 's'})
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {invoiceError && (
              <div className="cal-error-toast" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginTop: 10 }}>
                Error: {invoiceError}
              </div>
            )}

            {invoiceSuccess && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#065f46',
                borderRadius: '4px',
                border: '1px solid #059669',
                marginTop: '1rem',
                color: '#d1fae5'
              }}>
                <p style={{ margin: '0 0 0.75rem 0', fontWeight: 'bold' }}>✓ Invoice generated successfully!</p>
                {invoiceSuccess.invoiceDate && invoiceSuccess.dueDate && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    <div>Invoice Date: <strong>{invoiceSuccess.invoiceDate}</strong></div>
                    <div>Due Date: <strong>{invoiceSuccess.dueDate}</strong></div>
                  </div>
                )}
                <button
                  onClick={handleDownloadInvoice}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Download {invoiceSuccess.fileName}
                </button>
              </div>
            )}

            <div className="cal-dialog-buttons" style={{ marginTop: 16 }}>
              <button
                onClick={() => {
                  setShowInvoiceDialog(false)
                  setInvoiceError(null)
                }}
                disabled={invoiceIsGenerating}
              >
                Close
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={invoiceIsGenerating || !dateFrom || !dateTo || ((invoiceCarerOptions.length || carersWithShiftsInRange.length) === 0)}
              >
                {invoiceIsGenerating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAllShiftsDateConfirm && (
        <div className="cal-dialog-overlay">
          <div className="cal-dialog" style={{ maxWidth: '400px' }}>
            <h3>Delete all shifts?</h3>
            <div style={{ marginBottom: 16, color: '#374151', fontSize: 14 }}>
              Are you sure? This operation will delete all shifts for <strong>{parseYmdToLocalDate(deleteAllShiftsDateConfirm).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>.
            </div>
            <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              This action cannot be undone.
            </div>
            <div className="cal-dialog-buttons">
              <button
                onClick={() => setDeleteAllShiftsDateConfirm(null)}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAllShiftsForDay(deleteAllShiftsDateConfirm)}
                style={{ backgroundColor: '#ef4444' }}
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error toast - appears on top of everything */}
      {error && !showShiftDialog && (
        <div className="cal-error-toast" onClick={() => setError(null)} style={{ cursor: 'pointer' }}>
          Error: {renderErrorMessage(error)}
        </div>
      )}

      {viewMode === 'week' ? (
        // Week View with Timeline
        <>
          <div className="cal-week-view">
          <div className="cal-week-hours-column">
            {hours.map((hour, index) => (
              <div key={index} className="cal-week-hour-label">
                {hour}
              </div>
            ))}
          </div>
          
          <div className="cal-week-timeline-container">
            {Array.from({ length: 7 }, (_, i) => {
              const dayDate = new Date(getMonday(currentDate));
              dayDate.setDate(dayDate.getDate() + i);
              const dayYmd = toYmdLocal(dayDate);
              const dayShifts = rangeShifts
                .filter(s => {
                  // Match shifts by shift_date (database field, may be off by 1 day)
                  // OR by time_from date (actual start date)
                  const fromTime = new Date(s.time_from)
                  const timeFromDate = toYmdLocal(fromTime)
                  
                  return s.shift_date === dayYmd || timeFromDate === dayYmd
                })
                .sort((a, b) => a.time_from.localeCompare(b.time_from));
              
              return (
                <div key={dayYmd} className="cal-week-day-timeline">
                  <div className="cal-week-day-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setDeleteAllShiftsDateConfirm(dayYmd)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.75em',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        marginRight: '4px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                      title="Delete all shifts for this day"
                    >
                      Delete all
                    </button>
                  </div>
                  
                  <div 
                    className="cal-week-timeline-area"
                    onMouseDown={(e) => handleWeekMouseDown(e, dayYmd)}
                    onMouseMove={handleWeekMouseMove}
                    onMouseUp={handleWeekMouseUp}
                    onMouseLeave={handleWeekMouseUp}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="cal-week-hour-line" style={{ top: `${(i / 24) * 100}%` }} />
                    ))}
                    
                    {dayShifts.length === 0 && (
                      <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85em' }}>
                        No shifts for this day
                      </div>
                    )}
                    
                    {dayShifts.map((shift, shiftIndex) => {
                      // Use the same time parsing as day view
                      const span = getLocalSpanMinutesForShift(shift);
                      const startMinutes = span.startMin;
                      const endMinutes = span.endMin;

                      const durationMinutes = Math.max(0, endMinutes - startMinutes)
                      const fontScale = getFontScaleForDurationMinutes(durationMinutes)
                      
                      // Convert minutes to percentage of day (1440 minutes = 100%)
                      const topPercent = (startMinutes / 1440) * 100;
                      const heightPercent = ((endMinutes - startMinutes) / 1440) * 100;
                      
                      // Get display times for the shift (handling overnight)
                      const from = new Date(shift.time_from);
                      const to = new Date(shift.time_to);
                      const startTime = !isNaN(from.getTime()) ? from.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '00:00';
                      const endTime = !isNaN(to.getTime()) ? to.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '00:00';
                      
                      // Find overlapping shifts at same time
                      const overlappingShifts = dayShifts.filter((s) => {
                        const sSpan = getLocalSpanMinutesForShift(s);
                        // Check if overlaps with current shift
                        return !(sSpan.endMin <= startMinutes || sSpan.startMin >= endMinutes);
                      });
                      
                      const overlapCount = overlappingShifts.length;
                      const overlapIndex = overlappingShifts.findIndex(s => s.id === shift.id);
                      const shiftWidth = (100 / overlapCount) - 1;
                      const shiftLeft = overlapIndex * (100 / overlapCount);
                      
                      // Convert hex to rgba for consistent opacity
                      const carerColor = shift.carers?.color || '#3b82f6';
                      const hexToRgba = (hex: string, alpha: number = 0.7) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                      };
                      
                      // Check for special shift types
                      const isHireup = ((shift as any).line_items as any)?.category === 'HIREUP' || (shift as any).category === 'HIREUP'
                      const { isSleepover: isSleepoverShift, isPublicHoliday: isPublicHolidayShift } = inferShiftFlags(shift)
                      
                      const highlightColor = isHireup
                        ? '#dc2626'
                        : isSleepoverShift
                          ? '#7c3aed'
                          : isPublicHolidayShift
                            ? '#16a34a'
                            : null
                      
                      const borderStyle = highlightColor ? `2px solid ${highlightColor}` : `1px solid rgba(200,200,200,0.2)`
                      const shadowStyle = highlightColor ? `0 0 0 2px ${highlightColor}` : 'none'
                      
                      return (
                        <div
                          key={shift.id}
                          className="cal-week-shift-block"
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPercent}%`,
                            left: `${shiftLeft}%`,
                            width: `${shiftWidth}%`,
                            backgroundColor: carerColor,
                            border: borderStyle,
                            boxShadow: shadowStyle,
                            fontSize: `${fontScale}em`
                          }}
                          onClick={() => {
                            handleEditShift(shift)
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.85em', marginBottom: '2px', lineHeight: 1.2 }}>
                            {startTime}-{endTime}: {shift.carers?.first_name || 'Unknown'}{shift.carers?.last_name ? ` ${shift.carers.last_name}` : ''}
                          </div>
                          <div style={{ fontSize: '0.75em', marginBottom: '2px', lineHeight: 1.2 }}>
                            ${(shift.cost || 0).toFixed(2)}
                            {(isSleepoverShift || isPublicHolidayShift || isHireup) && (
                              <>
                                {' '}
                                {isSleepoverShift ? '(SLEEPOVER)' : ''}
                                {isSleepoverShift && isPublicHolidayShift ? ' ' : ''}
                                {isPublicHolidayShift ? '(PUBLIC HOLIDAY)' : ''}
                                {(isSleepoverShift || isPublicHolidayShift) && isHireup ? ' ' : ''}
                                {isHireup ? '(HIREUP)' : ''}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        // Day View
        <div className="cal-main-container">
        <div className="cal-hours-column">
          {hours.map((hour, index) => (
            <div key={index} className="cal-hour-label">
              {hour}
            </div>
          ))}
        </div>
        
        <div 
          className="cal-timeline-area"
          ref={timelineRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="cal-hour-line" style={{ top: `${(i / 24) * 100}%` }} />
          ))}
          
          {Array.from({ length: 24 * 4 }, (_, i) => (
            <div 
              key={i} 
              className="cal-quarter-line" 
              style={{ 
                top: `${(i / (24 * 4)) * 100}%`,
                opacity: i % 4 === 0 ? 1 : 0.3
              }} 
            />
          ))}
          
          <div style={getDragStyle()} />
          
          {/* Existing Shifts */}
          {(() => {
            // Process shifts: split overnight shifts into two visual parts
            const processedShifts: Array<{
              shift: typeof shifts[0]
              displayStartTime: string
              displayEndTime: string
              isOvernightPart: 'full' | 'today' | 'nextDay'
            }> = []
            
            const dayYmd = toYmdLocal(currentDate)
            
            shifts.forEach(shift => {
              const startTime = new Date(shift.time_from).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })
              const endTime = new Date(shift.time_to).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })
              
              const shiftDate = shift.shift_date
              const isOvernightShift = isEndTimeNextDay(startTime, endTime)
              
              if (isOvernightShift) {
                // Split into two parts
                // Part 1: Start time to midnight (for the shift's date)
                if (shiftDate === dayYmd) {
                  processedShifts.push({
                    shift,
                    displayStartTime: startTime,
                    displayEndTime: '00:00',
                    isOvernightPart: 'today'
                  })
                }
                
                // Part 2: Midnight to end time (for the next day)
                const nextDay = new Date(shift.shift_date)
                nextDay.setDate(nextDay.getDate() + 1)
                const nextDayYmd = toYmdLocal(nextDay)
                
                // Only show on next day if end time is NOT exactly midnight (00:00)
                if (nextDayYmd === dayYmd && endTime !== '00:00') {
                  processedShifts.push({
                    shift,
                    displayStartTime: '00:00',
                    displayEndTime: endTime,
                    isOvernightPart: 'nextDay'
                  })
                }
              } else {
                // Normal shift (same day)
                if (shiftDate === dayYmd) {
                  processedShifts.push({
                    shift,
                    displayStartTime: startTime,
                    displayEndTime: endTime,
                    isOvernightPart: 'full'
                  })
                }
              }
            })
            
            return processedShifts.map((item, idx) => {
              const { shift, displayStartTime, displayEndTime, isOvernightPart } = item
              
              const startY = getYFromTime(`2000-01-01 ${displayStartTime}:00`)
              const endY =
                isOvernightPart === 'today' && displayEndTime === '00:00'
                  ? 1440
                  : getYFromTime(`2000-01-01 ${displayEndTime}:00`)

              const durationMinutes = Math.max(0, endY - startY)
              const fontScale = getFontScaleForDurationMinutes(durationMinutes)
              const baseTileFontPx = 20.4 * fontScale
              const line1FontPx = 22.1 * fontScale
              const line2FontPx = 20.4 * fontScale
              
              // Convert minutes to percentage of day (1440 minutes = 100%)
              const topPercent = (startY / 1440) * 100
              const heightPercent = ((endY - startY) / 1440) * 100

            // For split overnight shifts, use a unique layout key per part
            // But for the layout map lookup, we always use the shift ID since layout is per shift
            const layout = dayLayout.get(shift.id) || { col: 0, colCount: 1 }
            const pct = 100 / Math.max(1, layout.colCount)
            const leftPct = layout.col * pct
            const rightPct = (layout.colCount - layout.col - 1) * pct
            
            // Get carer color: use assigned color, or fallback to consistent color based on carer ID
            const carerColor = (shift.carers as any)?.color || 
                               DEFAULT_CARER_COLORS[shift.carer_id % DEFAULT_CARER_COLORS.length]
            
            // Check if this is a HIREUP shift
            const isHireup = ((shift as any).line_items as any)?.category === 'HIREUP' || (shift as any).category === 'HIREUP'
            const { isSleepover: isSleepoverShift, isPublicHoliday: isPublicHolidayShift } = inferShiftFlags(shift)

            const displayCategory = (shift as any).category || (shift as any).line_items?.category || 'Unknown Category'
            const displayDescription = (shift as any).line_items?.description || displayCategory
            
            // Convert hex to rgba for background
            const hexToRgba = (hex: string, alpha: number = 0.7) => {
              const r = parseInt(hex.slice(1, 3), 16)
              const g = parseInt(hex.slice(3, 5), 16) 
              const b = parseInt(hex.slice(5, 7), 16)
              return `rgba(${r}, ${g}, ${b}, ${alpha})`
            }
            
            const span = getLocalSpanMinutesForShift(shift)
            const shiftHours = Math.max(0, Math.round(((span.endMin - span.startMin) / 60) * 100) / 100)

            const highlightColor = isHireup
              ? '#dc2626'
              : isSleepoverShift
                ? '#7c3aed'
                : isPublicHolidayShift
                  ? '#16a34a'
                  : null

            const borderStyle = highlightColor ? `0.5px solid ${highlightColor}` : `2px solid ${hexToRgba(carerColor, 0.5)}`
            const shadowStyle = highlightColor ? `0 0 0 1px ${highlightColor}, inset 0 0 0 1px ${highlightColor}` : 'none'

            return (
              <div
                key={`${shift.id}-${isOvernightPart}-${idx}`}
                data-shift-id={shift.id}
                className="shift-rectangle"
                style={{
                  position: 'absolute',
                  top: `${topPercent}%`,
                  left: `calc(${leftPct}% + 8px)`,
                  right: `calc(${rightPct}% + 8px)`,
                  height: `${heightPercent}%`,
                  background: carerColor,
                  border: borderStyle,
                  boxShadow: shadowStyle,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#fff',
                  fontSize: `${baseTileFontPx}px`,
                  fontWeight: '600',
                  zIndex: 5,
                  overflow: 'hidden',
                  cursor: dragState.isDragging || dragState.isResizing ? 'grabbing' : 'grab',
                  userSelect: 'none'
                }}
                title={`${shift.carers?.first_name || 'Unknown'} ${shift.carers?.last_name || ''} - ${displayCategory} - $${shift.cost?.toFixed(2) || '0.00'}${isOvernightPart !== 'full' ? ' (overnight shift)' : ''}`}
                onMouseDown={(e) => handleShiftMouseDown(e, shift, 'move')}
                onClick={(e) => {
                  // Only trigger edit if we're not in the middle of a drag operation
                  if (!dragState.isDragging && !dragState.isResizing) {
                    handleEditShift(shift)
                  }
                }}
              >
                {/* Top resize handle */}
                <div
                  className="resize-handle"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    cursor: 'ns-resize',
                    backgroundColor: 'rgba(255,255,255,0.4)',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleShiftMouseDown(e, shift, 'resize-top')}
                />
                
                <div style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  pointerEvents: 'none',
                  fontSize: `${line1FontPx}px`,
                  fontWeight: 700
                }}>
                  {displayStartTime} - {displayEndTime}, {shift.carers?.first_name || 'Unknown'}{shift.carers?.last_name ? ` ${shift.carers.last_name}` : ''} - ${(shift.cost || 0).toFixed(2)}
                  {(isSleepoverShift || isPublicHolidayShift || isHireup) && (
                    <>
                      {' '}
                      {isSleepoverShift ? '(SLEEPOVER)' : ''}
                      {isSleepoverShift && isPublicHolidayShift ? ' ' : ''}
                      {isPublicHolidayShift ? '(PUBLIC HOLIDAY)' : ''}
                      {(isSleepoverShift || isPublicHolidayShift) && isHireup ? ' ' : ''}
                      {isHireup ? '(HIREUP)' : ''}
                    </>
                  )}
                </div>
                {!isHireup && (
                  <div style={{
                    fontSize: `${line2FontPx}px`,
                    opacity: 0.95,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pointerEvents: 'none'
                  }}>
                    {`${shift.line_items?.code || displayCategory}: ${shift.line_items?.description || displayDescription}`}
                  </div>
                )}
                
                {/* Bottom resize handle */}
                <div
                  className="resize-handle"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    cursor: 'ns-resize',
                    backgroundColor: 'rgba(255,255,255,0.4)',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleShiftMouseDown(e, shift, 'resize-bottom')}
                />
              </div>
            )
            })
          })()}
        </div>
      </div>
      )}

      {dateFrom && dateTo && (
        <div className="cal-footer">
          {carerTotals.length === 0 ? (
            <span className="cal-footer-muted">No totals yet</span>
          ) : (
            (() => {
              const colCount = Math.max(1, carerTotals.length + 1)
              return (
                <div
                  className="cal-footer-grid"
                  style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
                >
                  {carerTotals.map((c, idx) => (
                    <div
                      key={c.carerId}
                      className={`cal-footer-cell ${idx === 0 ? 'first-cell' : ''}`}
                    >
                      <span className="cal-footer-label">{c.name}</span>
                      <span className="cal-footer-value">{c.totalHours.toFixed(2)}h · ${c.totalCost.toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="cal-footer-cell overlap-cell">
                    <span className="cal-footer-label">Overlap</span>
                    <span className="cal-footer-value">
                      {(overlapSummary?.overlapHours ?? 0).toFixed(2)}h · ${(overlapSummary?.overlapCost ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div
                    className="cal-footer-cell cal-footer-overall"
                    style={{ gridColumn: `1 / span ${colCount}` }}
                  >
                    <span className="cal-footer-label">Overall (excl. HIREUP)</span>
                    <span className="cal-footer-value">{overallTotals.totalHours.toFixed(2)}h</span>
                    <span className="cal-footer-divider">·</span>
                    <span className="cal-footer-value">${overallTotals.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              )
            })()
          )}
        </div>
      )}

      {/* Shift Creation Dialog */}
      {showShiftDialog && (
        <>
          {/* Error Toast - appears on top of dialog */}
          {error && (
            <div className="cal-error-toast" onClick={() => setError(null)} style={{ cursor: 'pointer' }}>
              Error: {renderErrorMessage(error)}
            </div>
          )}
          
          <div className="cal-dialog-overlay">
            <div className="cal-dialog">
              <h3>{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>
            
            {/* Date Field */}
            <div className="cal-form-group">
              <label>Date:</label>
              <input
                type="date"
                value={newShift.shift_date}
                onChange={(e) => {
                  const newDate = e.target.value
                  // Clear validation error when date changes - user will see error on save if needed
                  setError(null)
                  setNewShift(prev => ({...prev, shift_date: newDate}))
                }}
              />
            </div>

            {/* Time Adjustment Controls */}
            <div className="cal-time-controls">
              <div className="cal-time-group">
                <label>Start Time:</label>
                <div className="cal-time-input-group">
                  <button 
                    type="button"
                    className="cal-time-btn"
                    onClick={() => handleTimeAdjustment('start_time', -15)}
                  >
                    -15m
                  </button>
                  <span className="cal-time-display">{newShift.start_time}</span>
                  <button 
                    type="button"
                    className="cal-time-btn"
                    onClick={() => handleTimeAdjustment('start_time', 15)}
                  >
                    +15m
                  </button>
                </div>
              </div>
              
              <div className="cal-time-group">
                <label>End Time:</label>
                <div className="cal-time-input-group">
                  <button 
                    type="button"
                    className="cal-time-btn"
                    onClick={() => handleTimeAdjustment('end_time', -15)}
                  >
                    -15m
                  </button>
                  <span className="cal-time-display">
                    {newShift.end_time}
                    {isEndTimeNextDay(newShift.start_time, newShift.end_time) && (
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>+1 day</span>
                    )}
                  </span>
                  <button 
                    type="button"
                    className="cal-time-btn"
                    onClick={() => handleTimeAdjustment('end_time', 15)}
                  >
                    +15m
                  </button>
                </div>
              </div>
            </div>
            
            <div className="cal-form-group">
              <label>Carer:</label>
              <select 
                value={newShift.carer_id || ''} 
                onChange={(e) => setNewShift(prev => ({...prev, carer_id: Number(e.target.value) || null}))}
              >
                <option value="">Select Carer</option>
                {carers.map(carer => (
                  <option key={carer.id} value={carer.id}>
                    {carer.first_name} {carer.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cal-form-group">
              <label>Client:</label>
              <input
                type="text"
                readOnly
                value={(() => {
                  const clientId = newShift.client_id ?? selectedClientId
                  const client = clientId ? clients.find((c) => c.id === clientId) : null
                  return client ? `${client.first_name} ${client.last_name}` : '—'
                })()}
              />
            </div>

            <div className="cal-form-group">
              <label>Line Item Category:</label>
              <select 
                value={newShift.category || ''} 
                onChange={(e) => setNewShift(prev => ({...prev, category: e.target.value || null, is_sleepover: false, is_public_holiday: false}))}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {newShift.category === 'HIREUP' ? (
              <div className="cal-form-group">
                <label>Hireup Cost:</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newShift.hireup_cost ?? ''}
                  onChange={(e) => setNewShift((prev) => ({ ...prev, hireup_cost: e.target.value === '' ? null : Number(e.target.value) }))}
                  placeholder="Enter cost"
                />
              </div>
            ) : (
              <div className="cal-form-group">
                <label>Shift Type:</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={newShift.is_sleepover}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setNewShift(prev => ({
                          ...prev,
                          is_sleepover: checked
                        }))
                      }}
                    />
                    Sleepover
                  </label>

                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={newShift.is_public_holiday}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setNewShift(prev => ({
                          ...prev,
                          is_public_holiday: checked
                        }))
                      }}
                    />
                    Public holiday
                  </label>
                </div>
              </div>
            )}

            {/* Cost breakdown by line item code */}
            {(() => {
              const breakdown = computeCostBreakdown()
              return (
                <div>
                  {breakdown.rows.length > 0 ? (
                    <div className="cal-breakdown">
                      <div className="cal-breakdown-header">
                        <div>Line item code</div>
                        <div>Description</div>
                        <div>Time frame</div>
                        <div>No of hours</div>
                        <div>Rate</div>
                        <div>Total</div>
                      </div>
                      {breakdown.rows.map((r, idx) => (
                        <div key={idx} className="cal-breakdown-row">
                          <div>{r.code}</div>
                          <div>{r.description}</div>
                          <div>{r.frameFrom} - {r.frameTo}</div>
                          <div>{r.isSleepover ? 'SLEEPOVER' : r.hours.toFixed(2)}</div>
                          <div>${r.rate.toFixed(2)}</div>
                          <div>${r.total.toFixed(2)}</div>
                        </div>
                      ))}
                      <div className="cal-breakdown-total">
                        <strong>Shift total: ${breakdown.total.toFixed(2)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="cal-cost-display">
                      <strong>Total Cost: ${breakdown.total.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="cal-dialog-buttons">
              <button onClick={() => { setShowShiftDialog(false); resetDrag(); }}>Close</button>
              {editingShift && (
                <>
                  <button 
                    onClick={() => {
                      setCopyShiftSelected([])
                      setCopyShiftError(null)
                      setShowCopyShiftDialog(true)
                    }}
                    style={{ backgroundColor: '#8b5cf6', borderColor: '#7c3aed' }}
                  >
                    Copy Shift
                  </button>
                  <button 
                    onClick={handleDeleteShift}
                    style={{ backgroundColor: '#ef4444', borderColor: '#dc2626' }}
                  >
                    Delete
                  </button>
                </>
              )}
              <button 
                onClick={handleSaveShift} 
                disabled={!newShift.carer_id || !newShift.category}
              >
                {editingShift ? 'Update Shift' : 'Save Shift'}
              </button>
            </div>
          </div>
        </div>
        </>
      )}
      </>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .calendar-container {
          padding: 10px;
          padding-bottom: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          height: 100vh;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: hidden;
          box-sizing: border-box;
        }

        .cal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .cal-date-nav {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .cal-actions {
          position: relative;
          display: inline-block;
        }

        .cal-actions-btn {
          position: relative;
          padding-right: 28px;
        }

        .cal-actions-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: #0f1724;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          padding: 6px;
          min-width: 160px;
          z-index: 200;
        }

        .cal-actions-item {
          width: 100%;
          text-align: center;
          background: transparent;
          border: none;
          color: #e6eef6;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .cal-actions-item:hover {
          background: rgba(125,211,252,0.08);
        }

        .cal-current-date {
          font-size: 18px;
          font-weight: 600;
          min-width: 300px;
          text-align: center;
        }

        .cal-main-container {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          flex: 1;
          min-height: 0;
          overflow: hidden;
          overflow-x: hidden;
          margin-bottom: 0;
        }

        .cal-footer {
          position: fixed;
          left: calc(clamp(220px, 18vw, 320px) - 120px); /* shift further left to fully cover the hours gutter */
          width: calc(100% - clamp(220px, 18vw, 320px) + 120px);
          right: 0;
          bottom: 0;
          min-height: 48px;
          padding: 8px 18px;
          background: #0f1724;
          color: var(--text);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: stretch;
          gap: 6px;
          box-sizing: border-box;
          z-index: 100;
          box-shadow: 0 -8px 20px rgba(0,0,0,0.22);
        }

        .cal-footer-grid {
          display: grid;
          grid-auto-rows: auto;
          row-gap: 6px;
          column-gap: 0;
          align-items: center;
          border-top: none;
        }

        .cal-footer-cell {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 2px 8px;
          text-align: center;
          min-width: 0;
          box-sizing: border-box;
          border-left: 1px solid rgba(255,255,255,0.65);
          border-top: none;
          border-bottom: none;
        }

        .cal-footer-cell.first-cell {
          border-left: none;
        }

        .cal-footer-cell.overlap-cell {
          border-left: 1px solid rgba(255,255,255,0.65);
          color: #fecaca;
        }

        .cal-footer-cell.overlap-cell .cal-footer-label,
        .cal-footer-cell.overlap-cell .cal-footer-value {
          color: #fecaca;
        }

        .cal-footer-label {
          font-weight: 700;
        }

        .cal-footer-value {
          color: #f8fafc;
          font-variant-numeric: tabular-nums;
        }

        .cal-footer-divider {
          color: var(--muted);
        }

        .cal-footer-overall {
          border-left: none;
          border-top: none;
          padding-top: 8px;
          margin-top: 0;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 900;
          justify-content: center;
          text-align: center;
        }

        .cal-footer-overall .cal-footer-value {
          font-size: 1.3rem;
          font-weight: 900;
        }

        .cal-footer-muted {
          color: var(--muted);
        }

        .cal-hours-column {
          width: 80px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          transform: scaleY(0.88);
          transform-origin: top;
        }

        .cal-hour-label {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-size: 20px;
          color: var(--muted);
          font-weight: 500;
          border-bottom: 1px solid var(--border);
          padding-top: 1px;
          white-space: nowrap;
        }

        .cal-timeline-area {
          flex: 1;
          position: relative;
          height: 100%;
          cursor: crosshair;
          background: var(--card);
          user-select: none;
          transform: scaleY(0.88);
          transform-origin: top;
        }

        .cal-hour-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--border);
          z-index: 2;
          pointer-events: none;
        }

        .cal-quarter-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          z-index: 1;
          pointer-events: none;
        }

        button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        button:hover {
          background: #f9fafb;
        }

        .cal-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .cal-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .cal-error-toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #fee2e2;
          color: #dc2626;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100000;
          max-width: 600px;
          font-weight: 500;
        }

        .cal-dialog {
          background: white;
          padding: 30px;
          border-radius: 12px;
          width: 800px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 80vh;
          overflow-y: auto;
        }

        .cal-copy-dialog {
          background: white;
          padding: 24px;
          border-radius: 12px;
          width: 420px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 80vh;
          overflow-y: auto;
          color: #111827;
        }

        .cal-copy-dialog h3 {
          margin: 0 0 8px 0;
          color: #111827;
          font-weight: 800;
        }

        .cal-copy-days {
          margin-top: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px;
          max-height: 320px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #111827;
          opacity: 1;
        }

        .cal-copy-day {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          color: #111827;
          font-weight: 600;
          opacity: 1;
        }

        .cal-copy-day span {
          color: #111827;
          opacity: 1;
        }

        .cal-copy-day:hover {
          background: #f9fafb;
        }

        .cal-form-group {
          margin-bottom: 20px;
        }

        .cal-form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }

        .cal-form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .cal-form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .cal-form-group input[readonly] {
          background: #f3f4f6;
          color: #111827;
          cursor: not-allowed;
          opacity: 1;
        }

        .cal-cost-display {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          color: #059669;
          font-size: 18px;
        }

        .cal-time-controls {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          background: #f9fafb;
        }

        .cal-time-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .cal-time-group:last-child {
          margin-bottom: 0;
        }

        .cal-time-group label {
          font-weight: 500;
          color: #374151;
          margin-bottom: 0;
          min-width: 80px;
        }

        .cal-time-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cal-time-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .cal-time-btn:hover {
          background: #2563eb;
        }

        .cal-time-btn:active {
          transform: translateY(1px);
        }

        .cal-time-display {
          background: white;
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
          font-weight: 600;
          min-width: 60px;
          text-align: center;
          color: #1f2937;
        }

        .cal-breakdown {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 16px;
          background: #ffffff;
          font-size: 13px;
          color: #1f2937 !important;
        }

        .cal-breakdown-header,
        .cal-breakdown-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr 1fr 0.8fr 0.8fr;
          gap: 8px;
          align-items: center;
          padding: 6px 4px;
          color: #1f2937 !important;
        }

        .cal-breakdown-header {
          font-weight: 700;
          color: #111827 !important;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 6px;
        }

        .cal-breakdown-header div {
          color: #111827 !important;
        }

        .cal-breakdown-row {
          color: #1f2937 !important;
          font-weight: 500;
        }

        .cal-breakdown-row div {
          color: #1f2937 !important;
        }

        .cal-breakdown-row:nth-child(even) {
          background: #fafafa;
        }

        .cal-breakdown-total {
          margin-top: 8px;
          text-align: right;
          color: #1f2937 !important;
          font-weight: bold;
        }

        .cal-dialog-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cal-dialog-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .cal-dialog-buttons button:first-child {
          background: #f3f4f6;
          color: #374151;
        }

        .cal-dialog-buttons button:first-child:hover {
          background: #e5e7eb;
        }

        .cal-dialog-buttons button:last-child {
          background: #3b82f6;
          color: white;
        }

        .cal-dialog-buttons button:last-child:hover {
          background: #2563eb;
        }

        .cal-dialog-buttons button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .view-toggle-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .view-toggle-btn:hover {
          background: #f9fafb;
        }

        .cal-week-container {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 0;
        }

        .cal-week-view {
          display: flex;
          gap: 0;
          overflow-x: auto;
          height: calc(100vh - 210px);
        }

        .cal-week-hours-column {
          width: 80px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          padding-right: 8px;
          display: flex;
          flex-direction: column;
        }

        .cal-week-hour-label {
          height: ${HOUR_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 4px;
          font-size: 20px;
          color: var(--muted);
          font-weight: 500;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .cal-week-timeline-container {
          display: flex;
          gap: 1px;
          flex: 1;
          background-color: var(--border);
          padding: 0;
          overflow-x: auto;
        }

        .cal-week-day-timeline {
          flex: 1;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          background-color: var(--surface);
        }

        .cal-week-day-header {
          font-weight: 600;
          text-align: center;
          padding: 12px 8px;
          border-bottom: 2px solid var(--border);
          color: var(--text);
          flex-shrink: 0;
          font-size: 0.9em;
        }

        .cal-week-timeline-area {
          flex: 1;
          position: relative;
          height: 1440px;
          background-color: var(--surface);
          border-right: 1px solid var(--border);
        }

        .cal-week-hour-line {
          position: absolute;
          width: 100%;
          height: 1px;
          background-color: var(--border);
          left: 0;
        }

        .cal-week-shift-block {
          position: absolute;
          padding: 6px;
          border-radius: 4px;
          border-left: 4px solid;
          background-color: #3b82f6;
          color: white;
          cursor: pointer;
          overflow: hidden;
          transition: opacity 0.2s;
          font-size: 1.04em;
          line-height: 1.2;
          box-sizing: border-box;
          z-index: 5;
        }

        .cal-week-shift-block:hover {
          opacity: 0.9;
          z-index: 10;
        }

        .cal-button-group {
          display: flex;
          gap: 8px;
        }

        .cal-button-group button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
          text-align: center;
        }

        .cal-button-group button:hover {
          background: #f9fafb;
        }
      `}</style>
    </div>
  )
}
