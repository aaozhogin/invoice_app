'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

interface Shift {
  id: number
  time_from: string
  time_to: string
  carer_id: number
  client_id?: number
  line_item_code_id: number
  cost: number
  shift_date: string
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

const HOUR_HEIGHT = 60
const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4

interface NewShift {
  shift_date: string
  start_time: string
  end_time: string
  carer_id: number | null
  client_id: number | null
  category: string | null
  line_item_code_id: string | null
}

export default function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [carers, setCarers] = useState<Carer[]>([])
  const [lineItemCodes, setLineItemCodes] = useState<LineItemCode[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [shifts, setShifts] = useState<Shift[]>([]) // Add shifts state
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  
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
  const [showShiftDialog, setShowShiftDialog] = useState(false)
  const [newShift, setNewShift] = useState<NewShift>({
    shift_date: '',
    start_time: '',
    end_time: '',
    carer_id: null,
    client_id: null,
    category: null,
    line_item_code_id: null
  })
  const [error, setError] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [currentDate])

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
      
      const [carersRes, lineItemCodesRes, clientsRes, shiftsRes] = await Promise.all([
        supabase.from('carers').select('*, color').order('first_name'),
        supabase.from('line_items').select('id, code, category, description, time_from, time_to, billed_rate, weekday, saturday, sunday, sleepover').order('category'),
        supabase.from('clients').select('*').order('first_name'),
        // Use a simplified query without the problematic clients join
        supabase.from('shifts').select(`
          *, 
          carers(id, first_name, last_name, email, color), 
          line_items(id, code, category, description, billed_rate)
        `).eq('shift_date', currentDate.toISOString().split('T')[0]).order('time_from')
      ])

      console.log('📊 Raw responses:', { carersRes, lineItemCodesRes, clientsRes, shiftsRes })

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

      console.log('✅ Setting state with data:', {
        carers: carersRes.data?.length,
        lineItemCodes: lineItemCodesRes.data?.length,
        clients: clientsRes.data?.length,
        shifts: shiftsRes.data?.length
      })

      setCarers(carersRes.data || [])
      setLineItemCodes(lineItemCodesRes.data || [])
      setClients(clientsRes.data || [])
      
      // Manually join clients data with shifts
      const clientsMap = new Map((clientsRes.data || []).map(client => [client.id, client]))
      const shiftsWithClients = (shiftsRes.data || []).map(shift => ({
        ...shift,
        clients: shift.client_id ? clientsMap.get(shift.client_id) : null
      }))
      
      setShifts(shiftsWithClients)
      
      console.log('📊 Loaded shifts data:', shiftsWithClients)
      console.log('📊 Sample shift:', JSON.stringify(shiftsWithClients?.[0], null, 2))
      console.log('📊 Shift carers data:', shiftsWithClients?.[0]?.carers)
      console.log('📊 Shift line_items data:', shiftsWithClients?.[0]?.line_items)
      console.log('📊 Shift clients data:', shiftsWithClients?.[0]?.clients)
      
      console.log('Loaded line item codes:', lineItemCodesRes.data)
      // Debug: Log the line items data
      console.log('Line items data:', lineItemCodesRes.data)
      
      // Extract unique categories from line items
      const uniqueCategories = Array.from(new Set(lineItemCodesRes.data?.map(item => item.category).filter(Boolean) || []))
      setCategories(uniqueCategories)
      
      console.log('📈 Final state set successfully!')
      setError(null)
    } catch (err) {
      console.error('💥 Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Convert time string (HH:mm:ss or timestamp) to Y position
  const getYFromTime = (timeStr: string): number => {
    let timeOnly: string
    
    // Handle both timestamp format (2024-01-01T14:30:00) and time format (14:30:00)
    if (timeStr.includes('T')) {
      timeOnly = timeStr.split('T')[1].split('.')[0] // Extract time part and remove milliseconds
    } else {
      timeOnly = timeStr
    }
    
    const [hours, minutes] = timeOnly.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    return (totalMinutes / 15) * 15 // Convert to Y position (15px per quarter hour)
  }

  // Convert Y position to time (snap to 15-minute intervals)
  const getTimeFromY = (y: number): string => {
    const totalMinutes = (y / HOUR_HEIGHT) * 60
    const snappedMinutes = Math.round(totalMinutes / 15) * 15
    const hours = Math.floor(snappedMinutes / 60)
    const minutes = snappedMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Helper function to add/subtract 15 minutes
  const adjustTime = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number)
    const totalMinutes = hours * 60 + mins + minutes
    
    // Keep within 0-1440 minutes (24 hours)
    const constrainedMinutes = Math.max(0, Math.min(totalMinutes, 1440 - 15))
    
    const newHours = Math.floor(constrainedMinutes / 60)
    const newMins = constrainedMinutes % 60
    
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
  }

  const handleTimeAdjustment = (field: 'start_time' | 'end_time', adjustment: number) => {
    setNewShift(prev => {
      const newTime = adjustTime(prev[field], adjustment)
      
      // Ensure start time is before end time
      if (field === 'start_time') {
        const start = new Date(`2000-01-01 ${newTime}`)
        const end = new Date(`2000-01-01 ${prev.end_time}`)
        if (start >= end) {
          // Auto-adjust end time to be 15 minutes after start
          return {
            ...prev,
            start_time: newTime,
            end_time: adjustTime(newTime, 15)
          }
        }
      } else if (field === 'end_time') {
        const start = new Date(`2000-01-01 ${prev.start_time}`)
        const end = new Date(`2000-01-01 ${newTime}`)
        if (end <= start) {
          // Don't allow end time to be before or equal to start time
          return prev
        }
      }
      
      return {
        ...prev,
        [field]: newTime
      }
    })
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    
    const constrainedY = Math.max(0, Math.min(y, HOUR_HEIGHT * 24))
    setDragEnd(constrainedY)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    const startY = Math.min(dragStart, dragEnd)
    const endY = Math.max(dragStart, dragEnd)
    const adjustedEndY = Math.max(endY, startY + QUARTER_HOUR_HEIGHT)
    
    const startTime = getTimeFromY(startY)
    const endTime = getTimeFromY(adjustedEndY)
    
    setNewShift({
      shift_date: currentDate.toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      carer_id: null,
      client_id: null,
      category: null,
      line_item_code_id: null
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

  // Compute breakdown of overlapping line items and total cost
  const computeCostBreakdown = () => {
    // result rows: { code, frameFrom, frameTo, hours, rate, total, isSleepover }
    const rows: Array<{
      code: string
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

    // Determine day type from selected date
    const dayType = getDayType(currentDate)

    // helper to parse HH:MM to minutes since 00:00
    const parseToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    let selStart = parseToMinutes(newShift.start_time)
    let selEnd = parseToMinutes(newShift.end_time)
    // if selection crosses midnight (end <= start) treat end as next day
    if (selEnd <= selStart) selEnd += 24 * 60

    // Filter line items by category AND day type
    const matchingLineItems = lineItemCodes.filter(li => {
      if (li.category !== newShift.category) return false
      
      // Check if line item matches the day type
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
    })

    for (const li of matchingLineItems) {
      // line item time fields may be stored as time strings like '01:00' etc.
      if (!li.time_from || !li.time_to) continue

      let liStart = parseToMinutes(li.time_from)
      let liEnd = parseToMinutes(li.time_to)
      // handle wrap-around (e.g., 20:00 -> 00:00)
      if (liEnd <= liStart) liEnd += 24 * 60

      // compute overlap between [selStart, selEnd) and [liStart, liEnd)
      const overlapStart = Math.max(selStart, liStart)
      const overlapEnd = Math.min(selEnd, liEnd)
      const overlapMinutes = Math.max(0, overlapEnd - overlapStart)
      if (overlapMinutes <= 0) continue

      const hours = Math.round((overlapMinutes / 60) * 100) / 100
      const rate = (li.billed_rate as unknown as number) || 0
      
      // Special handling for sleepover line items - flat rate regardless of hours
      const total = li.sleepover 
        ? Math.round(rate * 100) / 100  // Flat rate for sleepover
        : Math.round(hours * rate * 100) / 100  // Hourly rate for others

      rows.push({
        code: li.code || String(li.id || ''),
        frameFrom: // convert minutes back to displayable HH:MM but clipped to the overlap
          `${String(Math.floor((overlapStart % (24*60)) / 60)).padStart(2, '0')}:${String(overlapStart % 60).padStart(2, '0')}`,
        frameTo:
          `${String(Math.floor((overlapEnd % (24*60)) / 60)).padStart(2, '0')}:${String(overlapEnd % 60).padStart(2, '0')}`,
        hours,
        rate,
        total,
        isSleepover: !!li.sleepover
      })
    }

    const total = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100
    return { rows, total }
  }

  // backward-compatible total getter used previously
  const calculateCost = (): number => {
    return computeCostBreakdown().total
  }

  const handleSaveShift = async () => {
    try {
      console.log('Starting handleSaveShift')
      
      // Test database connectivity and table existence first
      const supabase = getSupabaseClient()
      console.log('Testing database connectivity...')
      
      // Test line_items table (should exist)
      const { data: lineItemsTest, error: lineItemsError } = await supabase.from('line_items').select('*').limit(1)
      console.log('Line items table test:', { lineItemsTest, lineItemsError })
      
      // Test shifts table
      const { data: shiftsTest, error: shiftsError } = await supabase.from('shifts').select('*').limit(1)
      console.log('Shifts table test:', { shiftsTest, shiftsError })
      
      // If shifts table doesn't exist, try other common names
      if (shiftsError) {
        console.log('Trying alternative table names...')
        const { data: shiftTest, error: shiftError } = await supabase.from('shift').select('*').limit(1)
        console.log('Shift table test:', { shiftTest, shiftError })
        
        const { data: workShiftsTest, error: workShiftsError } = await supabase.from('work_shifts').select('*').limit(1)
        console.log('Work shifts table test:', { workShiftsTest, workShiftsError })
      }
      
      if (shiftsError && shiftsError.message?.includes('does not exist')) {
        console.error('Shifts table does not exist! Need to create it first.')
        throw new Error('Shifts table does not exist in database')
      }
      
      const totalCost = calculateCost()
      
      // Find the line item code ID based on the selected category
      const lineItem = lineItemCodes.find(li => li.category === newShift.category)
      if (!lineItem) {
        setError('Selected category not found')
        return
      }
      
      console.log('📝 Line item found for save:', {
        id: lineItem.id,
        category: lineItem.category,
        idType: typeof lineItem.id
      })
      
      // Prepare the shift data with proper TIMESTAMPTZ format
      const startDateTime = `${newShift.shift_date}T${newShift.start_time}:00`
      let endDateTime = `${newShift.shift_date}T${newShift.end_time}:00`
      
      // Handle overnight shifts: if end time is earlier than start time, add one day
      const [startHour, startMin] = newShift.start_time.split(':').map(Number)
      const [endHour, endMin] = newShift.end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      
      if (endMinutes <= startMinutes) {
        // This is an overnight shift, add one day to the end time
        const nextDay = new Date(newShift.shift_date)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDayStr = nextDay.toISOString().split('T')[0]
        endDateTime = `${nextDayStr}T${newShift.end_time}:00`
      }
      
      const shiftData = {
        shift_date: newShift.shift_date,
        time_from: startDateTime,
        time_to: endDateTime,
        carer_id: newShift.carer_id,
        // client_id: newShift.client_id, // Temporarily removed - column doesn't exist in database
        line_item_code_id: lineItem.id, // Keep as string (UUID) - don't convert to Number
        cost: totalCost
      }
      
      console.log('Attempting to save shift with data:', shiftData)
      console.log('Line item found:', lineItem)
      
      // First, test if we can query the shifts table
      const { data: testData, error: testError } = await supabase.from('shifts').select('*').limit(1)
      console.log('Shifts table test query result:', { testData, testError })
      
      if (testError) {
        console.error('Cannot access shifts table:', testError)
        throw new Error(`Shifts table error: ${testError.message}`)
      }
      
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
        console.log('Creating new shift')
        result = await supabase.from('shifts').insert(shiftData).select()
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
      const [refreshShiftsRes, refreshClientsRes] = await Promise.all([
        supabase.from('shifts').select(`
          *, 
          carers(id, first_name, last_name, email), 
          line_items(id, code, category, description, billed_rate)
        `).eq('shift_date', currentDate.toISOString().split('T')[0]).order('time_from'),
        supabase.from('clients').select('*')
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
        
        setShifts(refreshedShiftsWithClients)
        console.log('Shifts refreshed:', refreshedShiftsWithClients?.length)
        console.log('📊 Refreshed shifts data:', refreshedShiftsWithClients)
        console.log('📊 Sample refreshed shift:', refreshedShiftsWithClients?.[0])
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
      line_item_code_id: null
    })
    setEditingShift(null)
  }

  // Time conversion utilities
  const timeStringToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  const minutesToTimeString = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
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
      
      const shiftDate = new Date(shift.shift_date).toISOString().split('T')[0]
      
      // Handle overnight shifts
      const startMinutes = timeStringToMinutes(newStartTime)
      const endMinutes = timeStringToMinutes(newEndTime)
      
      let startDateTime = `${shiftDate}T${newStartTime}:00`
      let endDateTime = `${shiftDate}T${newEndTime}:00`
      
      if (endMinutes <= startMinutes) {
        // Overnight shift - add one day to end time
        const nextDay = new Date(shiftDate)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDayStr = nextDay.toISOString().split('T')[0]
        endDateTime = `${nextDayStr}T${newEndTime}:00`
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

    // Handle missing line_item_code_id - find the first available line item if null
    let selectedLineItemId = null
    let selectedCategory = null
    
    if (shift.line_item_code_id) {
      // If shift has a line item, find it
      const lineItem = lineItemCodes.find(li => li.id === shift.line_item_code_id.toString())
      if (lineItem) {
        selectedLineItemId = lineItem.id
        selectedCategory = lineItem.category
      }
    }
    
    // If no valid line item found, use the first available one as default
    if (!selectedLineItemId && lineItemCodes.length > 0) {
      const firstLineItem = lineItemCodes[0]
      selectedLineItemId = firstLineItem.id
      selectedCategory = firstLineItem.category
      console.log('📝 No valid line item found, using default:', firstLineItem)
    }

    console.log('📝 Line item selection:', {
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

    const newShiftData = {
      shift_date: shift.shift_date,
      start_time: fromTimeString,
      end_time: toTimeString,
      carer_id: shift.carer_id,
      client_id: clientId,
      category: selectedCategory,
      line_item_code_id: selectedLineItemId
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

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  })

  return (
    <div className="calendar-container">
      <div className="cal-header">
        <h1>Calendar - Day View</h1>
        <div className="cal-date-nav">
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000))}>
            ← Previous Day
          </button>
          <span className="cal-current-date">{formatDate(currentDate)}</span>
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000))}>
            Next Day →
          </button>
        </div>
        <button onClick={() => setCurrentDate(new Date())}>Today</button>
      </div>

      {error && (
        <div className="cal-error">
          Error: {error}
        </div>
      )}

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
            <div key={i} className="cal-hour-line" style={{ top: i * HOUR_HEIGHT }} />
          ))}
          
          {Array.from({ length: 24 * 4 }, (_, i) => (
            <div 
              key={i} 
              className="cal-quarter-line" 
              style={{ 
                top: i * QUARTER_HOUR_HEIGHT,
                opacity: i % 4 === 0 ? 1 : 0.3
              }} 
            />
          ))}
          
          <div style={getDragStyle()} />
          
          {/* Existing Shifts */}
          {shifts.map((shift) => {
            const startY = getYFromTime(shift.time_from)
            const endY = getYFromTime(shift.time_to)
            const height = Math.max(endY - startY, QUARTER_HOUR_HEIGHT)
            
            // Get carer color: use assigned color, or fallback to consistent color based on carer ID
            const carerColor = (shift.carers as any)?.color || 
                               DEFAULT_CARER_COLORS[shift.carer_id % DEFAULT_CARER_COLORS.length]
            
            // Convert hex to rgba for background
            const hexToRgba = (hex: string, alpha: number = 0.7) => {
              const r = parseInt(hex.slice(1, 3), 16)
              const g = parseInt(hex.slice(3, 5), 16) 
              const b = parseInt(hex.slice(5, 7), 16)
              return `rgba(${r}, ${g}, ${b}, ${alpha})`
            }
            
            return (
              <div
                key={shift.id}
                data-shift-id={shift.id}
                className="shift-rectangle"
                style={{
                  position: 'absolute',
                  top: startY,
                  left: 8,
                  right: 8,
                  height: height,
                  background: hexToRgba(carerColor, 0.7),
                  border: `2px solid ${carerColor}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  zIndex: 5,
                  overflow: 'hidden',
                  cursor: dragState.isDragging || dragState.isResizing ? 'grabbing' : 'grab',
                  userSelect: 'none'
                }}
                title={`${shift.carers?.first_name || 'Unknown'} ${shift.carers?.last_name || ''} - ${shift.line_items?.category || 'Unknown'} - $${shift.cost?.toFixed(2) || '0.00'}`}
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
                  pointerEvents: 'none'
                }}>
                  {shift.carers?.first_name || 'Unknown'} {shift.carers?.last_name || ''} - ${(shift.cost || 0).toFixed(2)}
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  opacity: 0.9,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  pointerEvents: 'none'
                }}>
                  {shift.line_item_code_id ? 
                    `${shift.line_items?.code ? `${shift.line_items.code} - ` : ''}${shift.line_items?.category || 'Unknown Category'}` 
                    : 'Multiple Line Items - ' + (shift.line_items?.category || 'Unknown Category')
                  }
                </div>
                
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
          })}
        </div>
      </div>

      {/* Shift Creation Dialog */}
      {showShiftDialog && (
        <div className="cal-dialog-overlay">
          <div className="cal-dialog">
            <h3>{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>
            
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
                  <span className="cal-time-display">{newShift.end_time}</span>
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
              <select 
                value={newShift.client_id || ''} 
                onChange={(e) => setNewShift(prev => ({...prev, client_id: Number(e.target.value) || null}))}
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cal-form-group">
              <label>Line Item Category:</label>
              <select 
                value={newShift.category || ''} 
                onChange={(e) => setNewShift(prev => ({...prev, category: e.target.value || null}))}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost breakdown by line item code */}
            {(() => {
              const breakdown = computeCostBreakdown()
              return (
                <div>
                  {breakdown.rows.length > 0 ? (
                    <div className="cal-breakdown">
                      <div className="cal-breakdown-header">
                        <div>Line item code</div>
                        <div>Time frame</div>
                        <div>No of hours</div>
                        <div>Rate</div>
                        <div>Total</div>
                      </div>
                      {breakdown.rows.map((r, idx) => (
                        <div key={idx} className="cal-breakdown-row">
                          <div>{r.code}</div>
                          <div>{r.frameFrom} - {r.frameTo}</div>
                          <div>{r.isSleepover ? 'SLEEPOVER' : r.hours}</div>
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
              <button onClick={() => { setShowShiftDialog(false); resetDrag(); }}>Cancel</button>
              {editingShift && (
                <button 
                  onClick={handleDeleteShift}
                  style={{ backgroundColor: '#ef4444', borderColor: '#dc2626' }}
                >
                  Delete
                </button>
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
      )}

      <style jsx>{`
        .calendar-container {
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          height: 100vh;
          overflow: hidden;
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

        .cal-current-date {
          font-size: 18px;
          font-weight: 600;
          min-width: 300px;
          text-align: center;
        }

        .cal-main-container {
          display: flex;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          height: calc(100vh - 140px);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .cal-hours-column {
          width: 80px;
          background: #f8f9fa;
          border-right: 1px solid #e0e0e0;
          flex-shrink: 0;
          height: ${HOUR_HEIGHT * 24}px;
        }

        .cal-hour-label {
          height: ${HOUR_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #666;
          font-weight: 500;
          border-bottom: 1px solid #e0e0e0;
        }

        .cal-timeline-area {
          flex: 1;
          position: relative;
          height: ${HOUR_HEIGHT * 24}px;
          cursor: crosshair;
          background: #fafbfc;
          user-select: none;
        }

        .cal-hour-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: #d1d5db;
          z-index: 2;
          pointer-events: none;
        }

        .cal-quarter-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: #e5e7eb;
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

        .cal-dialog {
          background: white;
          padding: 30px;
          border-radius: 12px;
          width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 80vh;
          overflow-y: auto;
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
          grid-template-columns: 1.6fr 1.6fr 1fr 1fr 1fr;
          gap: 8px;
          align-items: center;
          padding: 6px 4px;
          color: #1f2937 !important;
        }

        .cal-breakdown-header {
          font-weight: 600;
          color: #374151 !important;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 6px;
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
      `}</style>
    </div>
  )
}
