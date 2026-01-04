import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs/promises'
import { Database } from '@/app/lib/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

interface InvoiceRequestBody {
  invoiceDate: string
  invoiceNumber: string
  carerId?: number
  carerIds?: number[]
  clientId?: number
  dateFrom?: string
  dateTo?: string
}

const squareTokenRegex = /\[([^\]]+)\]/g

function replaceTokens(text: string, values: Record<string, string>): string {
  return text.replace(squareTokenRegex, (_, rawKey) => {
    const key = rawKey.trim().toUpperCase()
    return values[key] ?? ''
  })
}

function findHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]): number | null {
  for (let i = 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    const values = row.values
    const hasAll = headers.every(header =>
      values.some(v => typeof v === 'string' && v.toLowerCase().includes(header.toLowerCase()))
    )
    if (hasAll) return i
  }
  return null
}

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  let body: InvoiceRequestBody
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const invoiceDate = body.invoiceDate || new Date().toISOString().slice(0, 10)
  const invoiceNumber = body.invoiceNumber?.trim()
  const carerIds = (body.carerIds && body.carerIds.length > 0) ? body.carerIds : (body.carerId ? [body.carerId] : [])
  const clientId = body.clientId
  const dateFrom = body.dateFrom || invoiceDate
  const dateTo = body.dateTo || invoiceDate

  if (!carerIds.length) {
    return NextResponse.json({ error: 'carerId is required.' }, { status: 400 })
  }

  if (!invoiceNumber) {
    return NextResponse.json({ error: 'Invoice number is required.' }, { status: 400 })
  }

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: carers, error: carerError } = await supabase
      .from('carers')
      .select('*')
      .in('id', carerIds)

    if (carerError || !carers?.length) {
      return NextResponse.json({ error: 'Carer not found.' }, { status: 404 })
    }

    const { data: shifts, error: shiftError } = await supabase
      .from('shifts')
      .select(`
        id,
        shift_date,
        time_from,
        time_to,
        cost,
        carer_id,
        line_item_code_id,
        category,
        clients:client_id(id, first_name, last_name, address, ndis_number),
        line_items:line_item_code_id(id, code, description, billed_rate)
      `)
      .in('carer_id', carerIds)
      .gte('shift_date', dateFrom)
      .lte('shift_date', dateTo)
      .order('shift_date', { ascending: true })
      .order('time_from', { ascending: true })

    if (shiftError) {
      console.error('Failed to load shifts', shiftError)
      return NextResponse.json({ error: 'Failed to load shifts.' }, { status: 500 })
    }

    const { data: client } = clientId
      ? await supabase.from('clients').select('*').eq('id', clientId).maybeSingle()
      : { data: null }

    const carerById = new Map(carers.map(c => [c.id, c]))

    const primaryCarer = carerById.get(carerIds[0]!)
    
    // Choose template based on whether carer has a logo
    const templateFilename = primaryCarer?.logo_url ? 'Invoice_template.xlsx' : 'Invoice_template_nologo.xlsx'
    const templatePath = path.join(process.cwd(), templateFilename)
    
    const workbook = new ExcelJS.Workbook()
    const templateBuffer = await fs.readFile(templatePath)
    await workbook.xlsx.load(templateBuffer)
    const sheet = workbook.worksheets[0]
    const dueDate = (() => {
      const d = new Date(invoiceDate)
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 7)
        return d.toISOString().slice(0, 10)
      }
      return invoiceDate
    })()

    const clientAddress = client?.address || ''
    const clientAddressLines = clientAddress.split('\n')
    const clientAddr1 = clientAddressLines[0] || clientAddress
    const clientAddr2 = clientAddressLines[1] || ''
    const replacements: Record<string, string> = {
      'CARER\'S NAME': primaryCarer ? `${primaryCarer.first_name} ${primaryCarer.last_name}` : '',
      "CARER'S NAME": primaryCarer ? `${primaryCarer.first_name} ${primaryCarer.last_name}` : '',
      "CARER'S ADDRESS LINE 1": primaryCarer?.address || '',
      "CARER'S ADDRESS LINE 2": '',
      "CARER'S MOBILE": primaryCarer?.phone_number || '',
      "CARER'S EMAIL": primaryCarer?.email || '',
      'INVOICE NUMBER': invoiceNumber,
      'INVOICE DATE': invoiceDate,
      'INVOICE DATE + 7': dueDate,
      "CARER'S ABN": primaryCarer?.abn || '',
      "CARER'S BANK ACCOUNT NAME": primaryCarer?.account_name || '',
      "CARER'S BSB": primaryCarer?.bsb || '',
      "CARER'S BANK ACCOUNT NUMBER": primaryCarer?.account_number || '',
      "DATE FROM": dateFrom,
      "DATE TO": dateTo,
      "CLIENT'S NAME": client ? `${client.first_name} ${client.last_name}` : '',
      "CLIENT'S NDIS NUMBER": client?.ndis_number ? String(client.ndis_number) : '',
      "CLIENT'S ADDRESS LINE 1": clientAddr1,
      "CLIENT'S ADDRESS LINE 2": clientAddr2
    }

    sheet.eachRow({ includeEmpty: true }, row => {
      if (row.number === 8) return
      row.eachCell({ includeEmpty: true }, cell => {
        if (typeof cell.value === 'string') {
          cell.value = replaceTokens(cell.value, replacements)
        }
      })
    })

    // Insert carer's logo if available
    if (primaryCarer?.logo_url) {
      try {
        const logoResponse = await fetch(primaryCarer.logo_url)
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer()
          const logoExtension = primaryCarer.logo_url.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
          
          // Extract image dimensions to preserve aspect ratio
          let imgWidth = 100
          let imgHeight = 100
          const buf = Buffer.from(logoBuffer)
          
          // Simple PNG/JPEG dimension extraction without external dependencies
          if (logoExtension === 'png') {
            // PNG: width at bytes 16-20, height at bytes 20-24 (big-endian)
            if (buf.length >= 24) {
              imgWidth = buf.readUInt32BE(16)
              imgHeight = buf.readUInt32BE(20)
            }
          } else if (logoExtension === 'jpeg') {
            // JPEG: more complex, look for SOF marker
            let i = 2
            while (i < buf.length - 9) {
              if (buf[i] === 0xff && (buf[i + 1] & 0xf0) === 0xc0) {
                imgHeight = (buf[i + 5] << 8) | buf[i + 6]
                imgWidth = (buf[i + 7] << 8) | buf[i + 8]
                break
              }
              i += 2
            }
          }
          
          // Scale to fit B2:D7 (3 columns ≈ 120px). Height is computed from rows 2-7 to align bottom to row 7
          const maxWidth = 200
          const rowHeightsPoints = [2, 3, 4, 5, 6, 7].reduce((sum, r) => {
            const h = sheet.getRow(r).height
            return sum + (typeof h === 'number' ? h : 15) // default Excel row height ≈ 15pt
          }, 0)
          const targetHeightPixels = Math.round(rowHeightsPoints * 1.333) // points → pixels
          const maxHeight = targetHeightPixels
          let scaledWidth = maxWidth
          let scaledHeight = maxHeight
          
          if (imgWidth && imgHeight) {
            const aspectRatio = imgHeight / imgWidth
            const heightForWidth = maxWidth * aspectRatio
            if (heightForWidth > maxHeight) {
              scaledHeight = maxHeight
              scaledWidth = Math.round(maxHeight / aspectRatio)
            } else {
              scaledHeight = Math.round(heightForWidth)
            }
          }
          
          const imageId = workbook.addImage({
            buffer: buf,
            extension: logoExtension
          })
          
          // Place logo with upper left corner at B2, maintaining original aspect ratio
          sheet.addImage(imageId, {
            tl: { col: 1, row: 1 },
            ext: { width: scaledWidth, height: scaledHeight }
          })
        }
      } catch (err) {
        console.error('Failed to insert logo:', err)
      }
    }

    // Find the header row with "Date", "Time from", "Time to", etc.
    const headerRowNumber = (() => {
      for (let i = 1; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i)
        const values = row.values || []
        const hasDateCol = values.some(v => typeof v === 'string' && v.toLowerCase().includes('date'))
        const hasTimeCol = values.some(v => typeof v === 'string' && v.toLowerCase().includes('time'))
        if (hasDateCol && hasTimeCol) return i
      }
      return null
    })()

    const dataStartRow = headerRowNumber ? headerRowNumber + 1 : 19

    // Sort by datetime: shift_date, then time_from (earliest to latest)
    const sortedShifts = (shifts || []).slice().sort((a, b) => {
      if (a.shift_date !== b.shift_date) return a.shift_date.localeCompare(b.shift_date)
      return a.time_from.localeCompare(b.time_from)
    })

    const getHours = (from: string, to: string) => {
      const start = new Date(`${from.includes('T') ? from : `${from}`}`)
      const end = new Date(`${to.includes('T') ? to : `${to}`}`)
      const diffMs = end.getTime() - start.getTime()
      const hours = diffMs / (1000 * 60 * 60)
      return Number.isFinite(hours) ? Math.max(0, hours) : 0
    }

    const formatDateValue = (d: string) => {
      const dateObj = new Date(d)
      return Number.isNaN(dateObj.getTime()) ? d : dateObj
    }

    const parseTimeToDate = (t: string) => {
      if (!t) return ''
      const timePart = t.includes('T') ? t.split('T')[1]?.slice(0, 8) : t
      const iso = `1970-01-01T${timePart}`
      const dt = new Date(iso)
      return Number.isNaN(dt.getTime()) ? t : dt
    }

    // Clear placeholder rows in the template
    for (let i = dataStartRow; i <= Math.min(dataStartRow + 20, sheet.rowCount); i++) {
      const row = sheet.getRow(i)
      row.getCell(2).value = null
      row.getCell(3).value = null
      row.getCell(4).value = null
      row.getCell(5).value = null
      row.getCell(6).value = null
      row.getCell(8).value = null
      row.getCell(9).value = null
      row.getCell(10).value = null
      row.getCell(12).value = null
      row.commit()
    }

    if (sortedShifts.length === 0) {
      const row = sheet.getRow(dataStartRow)
      row.getCell(3).value = 'No shifts found'
      row.getCell(4).value = `${dateFrom} - ${dateTo}`
      row.commit()
    } else {
      let totalAmount = 0

      sortedShifts.forEach((shift, idx) => {
        const lineItemDesc = shift.line_items?.description || ''
        const lineItemCode = shift.line_items?.code || ''
        const hours = getHours(shift.time_from, shift.time_to)
        const rate = shift.line_items?.billed_rate ?? ''
        const amount = typeof shift.cost === 'number' ? shift.cost : (typeof rate === 'number' ? (rate as number) * hours : '')
        
        if (typeof amount === 'number') {
          totalAmount += amount
        }

        const row = sheet.getRow(dataStartRow + idx)
        const rowNumber = dataStartRow + idx
        
        // Helper to check if cells are already merged
        const isMerged = (range: string) => {
          try {
            const existing = sheet._merges[range]
            return !!existing
          } catch {
            return false
          }
        }
        
        // Merge cells F-G (Description) and J-K (Unit Price) for this row if not already merged
        const fgRange = `F${rowNumber}:G${rowNumber}`
        const jkRange = `J${rowNumber}:K${rowNumber}`
        
        if (!isMerged(fgRange)) {
          try { sheet.mergeCells(fgRange) } catch (e) { /* already merged */ }
        }
        if (!isMerged(jkRange)) {
          try { sheet.mergeCells(jkRange) } catch (e) { /* already merged */ }
        }
        
        // Column B: DOW formula
        row.getCell(2).value = { formula: `TEXT(C${rowNumber},"ddd")` }
        row.getCell(2).alignment = { horizontal: 'center' }
        row.getCell(2).font = { size: 10, bold: true }

        const dateValue = formatDateValue(shift.shift_date)
        row.getCell(3).value = dateValue
        row.getCell(3).numFmt = 'dd/mm/yyyy'
        row.getCell(3).alignment = { horizontal: 'center' }
        row.getCell(3).font = { size: 9 }

        const fromValue = parseTimeToDate(shift.time_from)
        row.getCell(4).value = fromValue
        row.getCell(4).numFmt = 'hh:mm AM/PM'
        row.getCell(4).alignment = { horizontal: 'center' }
        row.getCell(4).font = { size: 9 }

        const toValue = parseTimeToDate(shift.time_to)
        row.getCell(5).value = toValue
        row.getCell(5).numFmt = 'hh:mm AM/PM'
        row.getCell(5).alignment = { horizontal: 'center' }
        row.getCell(5).font = { size: 9 }

        row.getCell(6).value = lineItemDesc
        row.getCell(6).alignment = { horizontal: 'left' }
        row.getCell(6).font = { size: 9 }

        row.getCell(8).value = lineItemCode
        row.getCell(8).alignment = { horizontal: 'center' }
        row.getCell(8).font = { size: 9 }

        row.getCell(9).value = hours > 0 ? hours : ''
        row.getCell(9).alignment = { horizontal: 'center' }
        row.getCell(9).font = { size: 10 }

        // Unit Price (merged F-G and J-K above)
        row.getCell(10).value = rate || ''
        row.getCell(10).alignment = { horizontal: 'center' }
        row.getCell(10).font = { size: 10 }

        row.getCell(12).value = amount || ''
        row.getCell(12).alignment = { horizontal: 'center' }
        row.getCell(12).font = { size: 10 }

        // Apply borders to all cells in the row
        for (let col = 2; col <= 12; col++) {
          const cell = row.getCell(col)
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
        row.commit()
      })

        // Apply thick borders around each day block (outer edges thick, internal grid thin)
      const dayGroups: Array<{ start: number; end: number }> = []
      if (sortedShifts.length > 0) {
        let groupStart = dataStartRow
        let prevDate = sortedShifts[0].shift_date
        sortedShifts.forEach((shift, idx) => {
          const rowNumber = dataStartRow + idx
          if (shift.shift_date !== prevDate) {
            dayGroups.push({ start: groupStart, end: rowNumber - 1 })
            groupStart = rowNumber
            prevDate = shift.shift_date
          }
          if (idx === sortedShifts.length - 1) {
            dayGroups.push({ start: groupStart, end: rowNumber })
          }
        })

        const applyDayBorders = (g: { start: number; end: number }) => {
          for (let r = g.start; r <= g.end; r++) {
            const row = sheet.getRow(r)
            const isFirst = r === g.start
            const isLast = r === g.end
            for (let col = 2; col <= 12; col++) {
              const cell = row.getCell(col)
              const topBorder = isFirst ? { style: 'medium' } : { style: 'thin' }
              const bottomBorder = isLast ? { style: 'medium' } : { style: 'thin' }
              const leftBorder = col === 2 ? { style: 'medium' } : (col === 3 ? { style: 'thin' } : { style: 'thin' })
              const rightBorder = col === 12 ? { style: 'medium' } : (col === 2 ? { style: 'medium' } : { style: 'thin' })
              cell.border = { top: topBorder, bottom: bottomBorder, left: leftBorder, right: rightBorder }
            }
            row.commit()
          }
        }

        dayGroups.forEach(applyDayBorders)

        // Merge DOW cells for same consecutive dates; only rotate text if multiple shifts
        dayGroups.forEach(g => {
          const row = sheet.getRow(g.start)
          const cell = row.getCell(2)
          
          if (g.start === g.end) {
            // Single row for this day: center text normally (no rotation)
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          } else {
            // Multiple rows for this day: merge DOW cells and rotate 90 degrees
            try {
              sheet.mergeCells(`B${g.start}:B${g.end}`)
            } catch (e) {
              /* already merged */
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 }
          }
          row.commit()
        })
      }

      // Add TOTALS row (with thick outline, thin internal grid not applicable since single row)
      const totalsRow = sheet.getRow(dataStartRow + sortedShifts.length)
      const totalsRowNumber = dataStartRow + sortedShifts.length
      
      // Merge cells for totals row if not already merged
      const totalsJkRange = `J${totalsRowNumber}:K${totalsRowNumber}`
      try { sheet.mergeCells(totalsJkRange) } catch (e) { /* already merged */ }
      
      // Unit Price cells (J-K merged above)
      totalsRow.getCell(10).value = 'Total:'
      totalsRow.getCell(10).font = { bold: true, size: 10 }
      totalsRow.getCell(10).alignment = { horizontal: 'right' }
      
      totalsRow.getCell(12).value = totalAmount
      totalsRow.getCell(12).font = { bold: true, size: 10 }
      totalsRow.getCell(12).alignment = { horizontal: 'center' }
      
      // Clear borders for totals row first
      for (let col = 1; col <= sheet.columnCount; col++) {
        totalsRow.getCell(col).border = undefined
      }
      // Step 3: B-L top border thick
      for (let col = 2; col <= 12; col++) {
        const cell = totalsRow.getCell(col)
        cell.border = {
          top: { style: 'medium' },
          bottom: undefined,
          left: undefined,
          right: undefined
        }
      }
      // Step 4 & 5: cells K (11) and L (12) all borders, thick box (except thin right border on K between Total: and value)
      const cellK = totalsRow.getCell(11)
      cellK.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'medium' },
        right: { style: 'thin' }
      }
      
      const cellL = totalsRow.getCell(12)
      cellL.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'medium' }
      }
      totalsRow.commit()
    }

    // Make Client's name bold in header (cell C9)
    try {
      const clientNameCell = sheet.getCell('C9')
      clientNameCell.font = { ...(clientNameCell.font || {}), bold: true }
    } catch {}

    const buffer = await workbook.xlsx.writeBuffer()
    const filename = `Invoice_${primaryCarer?.last_name || 'carer'}_${invoiceDate}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err) {
    console.error('Invoice generation failed', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to generate invoice: ${errorMessage}` }, { status: 500 })
  }
}
