import { NextRequest, NextResponse } from 'next/server'
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
  summaryOrder: string[]
  selectedClients: string[]
  selectedCarers: string[]
  syncMode: 'automatic' | 'manual'
  manualDateFrom?: string
  manualDateTo?: string
  googleCalendarConnected: boolean
  googleCalendarId?: string
}

interface Shift {
  id: number
  shift_date: string
  start_time: string
  end_time: string
  hours: number
  carer_id: number
  client_id: number
  line_item_code_id: string | number | null
  cost: number
  google_event_id?: string
  carers?: {
    first_name: string
    last_name: string
  }
  clients?: {
    first_name: string
    last_name: string
  }
  line_items?: {
    code: string
    description: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { settings, dateFrom, dateTo, accessToken } = await request.json() as {
      settings: SyncSettings
      dateFrom?: string
      dateTo?: string
      accessToken?: string
    }

    // Validate access token
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 })
    }

    // Validate settings
    const hasAtLeastOneField = Object.values(settings.summaryFields).some(v => v)
    if (!hasAtLeastOneField) {
      return NextResponse.json({ error: 'At least one summary field required' }, { status: 400 })
    }

    if (settings.selectedClients.length === 0) {
      return NextResponse.json({ error: 'At least one client required' }, { status: 400 })
    }

    if (settings.selectedCarers.length === 0) {
      return NextResponse.json({ error: 'At least one carer required' }, { status: 400 })
    }

    // Fetch shifts based on filters
    const supabase = getSupabaseClient()
    let query = supabase
      .from('shifts')
      .select(`
        *,
        carers:carer_id(first_name, last_name),
        clients:client_id(first_name, last_name),
        line_items:line_item_code_id(code, description)
      `)
      .in('client_id', settings.selectedClients)
      .in('carer_id', settings.selectedCarers)

    // Apply date range if in manual mode or if dates provided
    if (dateFrom) {
      query = query.gte('shift_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('shift_date', dateTo)
    }

    const { data: shifts, error } = await query

    if (error) {
      console.error('Error fetching shifts:', error)
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
    }

    if (!shifts || shifts.length === 0) {
      return NextResponse.json({ count: 0, message: 'No shifts found matching criteria' })
    }

    // Format and sync each shift
    const syncedShifts: string[] = []
    for (const shift of shifts as Shift[]) {
      try {
        // Build event summary based on settings
        const summaryParts: string[] = []
        
        for (const field of settings.summaryOrder) {
          if (!settings.summaryFields[field as keyof typeof settings.summaryFields]) continue

          switch (field) {
            case 'carerName':
              if (shift.carers) {
                summaryParts.push(`${shift.carers.first_name} ${shift.carers.last_name}`)
              }
              break
            case 'clientName':
              if (shift.clients) {
                summaryParts.push(`${shift.clients.first_name} ${shift.clients.last_name}`)
              }
              break
            case 'lineItemCode':
              if (shift.line_items) {
                summaryParts.push(shift.line_items.code)
              }
              break
            case 'description':
              if (shift.line_items) {
                summaryParts.push(shift.line_items.description)
              }
              break
            case 'shiftCost':
              summaryParts.push(`$${shift.cost.toFixed(2)}`)
              break
            case 'hours':
              summaryParts.push(`${shift.hours}h`)
              break
          }
        }

        const eventSummary = summaryParts.join(' | ')

        // Build event start/end times (Google Calendar requires ISO format)
        const startDateTime = `${shift.shift_date}T${shift.start_time}`
        const endDateTime = `${shift.shift_date}T${shift.end_time}`

        // Check if event already exists
        let googleEventId = shift.google_event_id

        if (googleEventId) {
          // Update existing event
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                summary: eventSummary,
                start: {
                  dateTime: startDateTime,
                  timeZone: 'Australia/Sydney' // Adjust timezone as needed
                },
                end: {
                  dateTime: endDateTime,
                  timeZone: 'Australia/Sydney'
                }
              })
            }
          )

          if (!updateResponse.ok) {
            console.error(`Failed to update event for shift ${shift.id}`)
            continue
          }
        } else {
          // Create new event
          const createResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                summary: eventSummary,
                start: {
                  dateTime: startDateTime,
                  timeZone: 'Australia/Sydney'
                },
                end: {
                  dateTime: endDateTime,
                  timeZone: 'Australia/Sydney'
                }
              })
            }
          )

          if (!createResponse.ok) {
            console.error(`Failed to create event for shift ${shift.id}`)
            continue
          }

          const eventData = await createResponse.json()
          googleEventId = eventData.id

          // Update shift with google_event_id
          await supabase
            .from('shifts')
            .update({
              google_event_id: googleEventId,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', shift.id)
        }
        
        syncedShifts.push(eventSummary)
      } catch (shiftError) {
        console.error(`Error syncing shift ${shift.id}:`, shiftError)
      }
    }

    return NextResponse.json({
      success: true,
      count: syncedShifts.length,
      message: `Successfully synced ${syncedShifts.length} shifts`
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
