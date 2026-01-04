# Invoice App - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Core Features](#core-features)
5. [Business Rules](#business-rules)
6. [API Endpoints](#api-endpoints)
7. [Key Algorithms](#key-algorithms)
8. [UI Components](#ui-components)

---

## Overview

The Invoice App is a comprehensive shift management and invoicing system for care services. It manages carers, clients, shifts, line item codes (billing rates), and generates invoices based on worked shifts.

**Tech Stack:**
- Frontend: Next.js 14 (React, TypeScript)
- Backend: Supabase (PostgreSQL)
- Styling: Custom CSS with Tailwind utilities
- PDF Generation: ExcelJS for Excel invoice templates

**Key Capabilities:**
- Visual calendar interface (Day view and Week view)
- Shift CRUD operations with drag-and-drop
- Multi-carer shift management
- Triple overlap prevention (maximum 2 concurrent shifts)
- Copy day/shift functionality
- Invoice generation per carer
- Line item code matching based on day type and shift flags

---

## Architecture

### Directory Structure
```
app/
├── calendar/              # Main calendar page
│   ├── CalendarClient.tsx # 4700+ line client component
│   └── page.tsx          # Server component wrapper
├── carers/               # Carer management
├── clients/              # Client management
├── invoices/             # Invoice history
├── line-item-codes/      # Billing rate management
├── shifts/               # Shifts list page
├── api/                  # API routes
│   ├── generate-invoice/ # Invoice generation endpoint
│   ├── download-invoice/ # Invoice download endpoint
│   ├── list-invoices/    # List all invoices
│   └── delete-invoice/   # Delete invoice record
├── lib/
│   ├── supabaseClient.ts # Supabase client singleton
│   └── types/            # TypeScript type definitions
└── CalendarSidebarContext.tsx # Shared state for sidebar totals

components/
├── Header.tsx            # Top navigation bar
└── SidebarClient.tsx     # Left sidebar menu

migrations/               # Database migration SQL files
public/                   # Static assets including invoice template
```

### State Management
- **Local State:** React useState hooks in components
- **Context:** CalendarSidebarContext for sharing totals between calendar and sidebar
- **Persistence:** localStorage for currentDate and selectedClientId
- **Server State:** Supabase real-time queries (manual refresh after mutations)

---

## Data Models

### Core Tables

#### `carers`
Represents care workers who perform shifts.
```typescript
interface Carer {
  id: number                  // Primary key
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  address?: string
  abn?: string               // Australian Business Number
  bsb?: string               // Bank BSB
  account_number?: string
  account_name?: string
  color?: string             // Hex color for UI (#3b82f6, etc.)
  billed_rates: number       // Unused legacy field
  created_at: timestamp
  updated_at: timestamp
}
```

#### `clients`
Represents care recipients.
```typescript
interface Client {
  id: number                  // Primary key
  first_name: string
  last_name: string
  ndis_number: number        // National Disability Insurance Scheme ID
  address?: string
  created_at: timestamp
  updated_at: timestamp
}
```

#### `line_items` (also called line_item_codes)
Defines billing rates for different types of shifts.
```typescript
interface LineItemCode {
  id: string                  // UUID primary key
  code?: string              // e.g., "01_014_0107_1_1"
  description: string
  category: string           // "CORE", "HIREUP", etc.
  billed_rate: number        // Rate per hour in AUD
  time_from?: string         // HH:MM format (deprecated)
  time_to?: string           // HH:MM format (deprecated)
  max_rate?: number          // Maximum billable rate
  weekday?: boolean          // Applies on weekdays (Mon-Fri)
  saturday?: boolean         // Applies on Saturdays
  sunday?: boolean           // Applies on Sundays
  sleepover?: boolean        // Sleepover shift rate
  public_holiday?: boolean   // Public holiday rate
  created_at: timestamp
  updated_at: timestamp
}
```

**Line Item Matching Logic:**
1. Match by `category`
2. Filter by day type (weekday/saturday/sunday) using flags
3. Filter by `sleepover` or `public_holiday` flags
4. Public holiday items ignore day-of-week flags
5. Sort by `code` alphabetically and take first match

#### `shifts`
Represents work shifts assigned to carers for clients.
```typescript
interface Shift {
  id: number                  // Primary key
  shift_date: string         // YYYY-MM-DD format (date of shift start)
  time_from: timestamp       // ISO 8601 timestamp (UTC)
  time_to: timestamp         // ISO 8601 timestamp (UTC)
  carer_id: number           // Foreign key -> carers.id
  client_id: number          // Foreign key -> clients.id
  line_item_code_id: string  // Foreign key -> line_items.id (nullable for HIREUP)
  category: string           // "CORE", "HIREUP", etc.
  cost: number               // Calculated total cost in AUD
  is_sleepover: boolean      // Sleepover shift flag
  is_public_holiday: boolean // Public holiday flag
  created_at: timestamp
  updated_at: timestamp
}
```

**Important Notes:**
- `time_from` and `time_to` are stored in UTC
- `shift_date` represents the calendar date the shift belongs to (not necessarily when it starts)
- Overnight shifts have `time_to` on the next day but keep the original `shift_date`
- Cost is pre-calculated and stored (not computed on the fly)

#### `invoices`
Records of generated invoices.
```typescript
interface Invoice {
  id: string                  // UUID primary key
  invoice_number: string     // User-provided invoice ID
  invoice_date: string       // YYYY-MM-DD
  date_from: string          // YYYY-MM-DD (shift date range start)
  date_to: string            // YYYY-MM-DD (shift date range end)
  carer_id: number           // Foreign key -> carers.id
  client_id: number          // Foreign key -> clients.id
  file_name: string          // Generated filename
  file_path: string          // API path to download
  total_amount?: number      // Total invoice amount (optional)
  created_at: timestamp
}
```

---

## Core Features

### 1. Calendar View

**Day View:**
- Shows 24-hour timeline (00:00 to 24:00)
- Displays shifts as colored blocks
- Height proportional to duration (35px per hour)
- Color-coded by carer
- Supports drag-and-drop to move shifts
- Resize handles to adjust start/end times
- Shows overnight shifts extending past midnight

**Week View:**
- Shows Monday to Sunday in columns
- Same timeline visualization per day
- Shifts displayed in correct day column based on `shift_date`
- Previous day overnight shifts shown in correct target day

**Common Features:**
- Date range selection (Date from / Date to)
- Client selector (filter all views)
- View toggle (Day ↔ Week)
- Navigation: Previous Day, Next Day buttons
- Actions menu (Copy Day, Generate Invoice)

### 2. Shift Management

**Creating Shifts:**
1. Click "Create new shift" or drag on timeline
2. Select carer (required)
3. Set start time and end time (HH:MM format)
4. Select category (CORE, HIREUP, etc.)
5. Optionally mark as sleepover or public holiday
6. Cost auto-calculated based on line item matching
7. HIREUP category requires manual cost entry

**Editing Shifts:**
1. Click existing shift block
2. Modify any field
3. Cost recalculated automatically
4. Validation prevents triple overlaps
5. Same carer cannot have overlapping shifts

**Deleting Shifts:**
- Click shift, then "Delete shift" button
- Confirmation required
- Refreshes calendar after deletion

**Drag and Drop:**
- Drag shift block to new time (moves start and keeps duration)
- Drag top handle to adjust start time
- Drag bottom handle to adjust end time
- Overnight shifts properly handled (end time preserved across midnight)

**Time Adjustment Logic:**
- Uses ±15 minute increments
- Preserves overnight shift detection (`isEndTimeNextDay()`)
- Prevents invalid ranges (end before start on same day)

### 3. Copy Operations

**Copy Day:**
- Copies ALL shifts from current day to selected target days
- Multi-select target days from calendar
- Filters out previous day overnight shifts (only copies shifts with `shift_date` matching source day)
- Performs triple overlap detection before copying
- Skips individual shifts that would cause triple overlap
- Shows error listing days that couldn't receive all shifts
- Recalculates costs for target day type (weekday/Saturday/Sunday)
- Handles line item code remapping

**Copy Shift:**
- Copies SINGLE shift to multiple target days
- Opens dialog when clicking "Copy shift" in shift edit dialog
- Same validation as Copy Day
- Useful for recurring shift patterns

**Overlap Detection Logic:**
- Checks existing shifts on target day
- Checks previous day overnight shifts extending into target
- Checks shifts already being inserted in same batch
- Blocks if overlap count ≥ 2 (would create triple overlap)
- Uses interval overlap formula: `newStart < existingEnd && newEnd > existingStart`

### 4. Invoice Generation

**Process:**
1. Set date range (Date from / Date to)
2. Click Actions → Generate invoice
3. Dialog shows:
   - Invoice date (default: today)
   - Invoice number (required, alphanumeric + hyphens/underscores)
   - Carer selection (single-select from carers with shifts in range)
4. Click Generate
5. Success shows:
   - Invoice date (DD/MM/YYYY format)
   - Due date (invoice date + 7 days, DD/MM/YYYY)
   - Download button
6. Invoice saved to `invoices` table
7. Excel file generated from template

**Invoice Template:**
- Excel format (.xlsx)
- Template: `/public/Invoice_Template.xlsx`
- Replaces placeholders with actual data
- Includes:
  - Carer details (name, address, ABN, bank details)
  - Client details (name, NDIS number, address)
  - Invoice metadata (number, date, due date)
  - Shift line items with quantities and rates
  - Totals with GST calculation

**Line Item Grouping:**
- Groups shifts by line item code
- Calculates total hours per line item
- Shows quantity (hours), unit price, amount
- Includes 10% GST in total

### 5. Sidebar Totals

**Display:**
- Shows per-carer totals (hours and cost)
- Shows overlap hours/cost
- Shows overall total (excluding HIREUP category)

**Calculation:**
- Aggregates all shifts in date range
- Filters by selected client
- HIREUP shifts excluded from overall total
- Overlap detection uses sweep-line algorithm
- Overlap cost deducted from carer totals, shown separately
- Overall = Sum(carer totals) - overlap cost

**Formula:**
```
For each carer:
  Total Hours = Sum of shift durations
  Total Cost = Sum of shift costs
  
Overlap:
  Detect all time intervals where 2+ shifts occur
  Calculate overlap hours and proportional cost
  
Overall:
  Total Hours = Sum(all carer hours) - overlap hours
  Total Cost = Sum(all carer costs) - overlap cost
  (HIREUP excluded from both)
```

---

## Business Rules

### Overlap Rules

**Double Overlap (Allowed):**
- Two carers can work simultaneously for the same client
- Example: Carer A (09:00-17:00) + Carer B (13:00-21:00) = OK

**Triple Overlap (Blocked):**
- Three or more carers working simultaneously is NOT allowed
- System prevents creating/copying shifts that would cause this
- Error message: "This shift would cause 3 or more shifts to overlap"

**Overlap Detection:**
- Checks shifts on the same date
- Includes previous day overnight shifts that extend into target date
- Uses timestamp comparison (not just HH:MM)
- Sweep-line algorithm for efficient multi-shift overlap detection

### Shift Validation

**Required Fields:**
- Carer (must be selected)
- Client (must be selected before opening calendar)
- Start time and end time
- Category
- Cost (auto-calculated or manual for HIREUP)

**Time Rules:**
- Times in 24-hour format (HH:MM)
- End time can be ≤ start time (indicates overnight shift)
- Overnight shifts: end time on next day, but `shift_date` stays as start day
- Minimum duration: 15 minutes (enforced in drag operations)
- Maximum duration: 24 hours

**Same Carer Overlap:**
- Same carer CANNOT have overlapping shifts
- Checked before save/update
- Error: "This carer already has a shift that overlaps with the selected time"

### Cost Calculation

**Standard Shifts (CORE, etc.):**
```
1. Determine day type:
   - Weekday (Mon-Fri)
   - Saturday
   - Sunday

2. Match line item code:
   - Category matches
   - Day type flag matches
   - Sleepover flag matches (if applicable)
   - Public holiday flag matches (if applicable)

3. Calculate cost:
   Cost = Duration (hours) × Line Item Billed Rate
   
4. Handle overnight shifts:
   - Split calculation at midnight if needed
   - Apply correct rate for each day portion
```

**HIREUP Shifts:**
- No line item code matching
- User enters cost manually
- Cost stored as-is
- Excluded from overall totals

**Public Holiday Logic:**
- Public holiday line items are day-agnostic
- Take precedence over day-of-week rates
- Must be manually marked in shift creation

### Invoice Rules

**Validation:**
- Date range must be set
- Invoice number required (alphanumeric, hyphens, underscores only)
- Must select exactly one carer
- Carer must have shifts in the date range

**Generation:**
- One invoice per carer
- Includes all shifts for that carer in date range
- Filtered by selected client
- Groups shifts by line item code
- Calculates totals with 10% GST

**Deduplication:**
- System checks if invoice with same number and date exists
- If exists, returns existing record (doesn't create duplicate)
- Prevents duplicate entries when downloading from invoice history

---

## API Endpoints

### `/api/generate-invoice` (POST)

**Request:**
```typescript
{
  invoiceDate: string      // YYYY-MM-DD
  invoiceNumber: string    // Invoice ID
  carerIds: number[]       // Array with single carer ID
  clientId: number         // Client ID
  dateFrom: string         // YYYY-MM-DD
  dateTo: string           // YYYY-MM-DD
  timezoneOffset: number   // Browser timezone offset in minutes
}
```

**Response:**
```typescript
{
  success: boolean
  file: {
    name: string          // "Invoice_INV-001_2026-01-04.xlsx"
    data: string          // Base64 encoded file
    mimeType: string      // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }
  invoice: {
    id: string
    invoice_number: string
    // ... other invoice fields
  }
}
```

**Process:**
1. Validate inputs
2. Fetch shifts for carer + client in date range
3. Fetch carer details
4. Fetch client details
5. Load Excel template
6. Replace placeholders with actual data
7. Group shifts by line item code
8. Calculate totals
9. Format dates as DD/MM/YYYY
10. Save to buffer
11. Check for existing invoice record (by number + date)
12. Insert new record if doesn't exist
13. Return base64 encoded file

### `/api/download-invoice` (GET)

**Query Parameters:**
- `number`: Invoice number
- `date`: Invoice date (YYYY-MM-DD)

**Process:**
1. Find invoice record by number + date
2. Regenerate invoice by calling `/api/generate-invoice` internally
3. Return base64 file data
4. Client decodes and triggers download

### `/api/list-invoices` (GET)

**Response:**
```typescript
{
  data: Invoice[]  // All invoices with joined carer/client data
}
```

### `/api/delete-invoice` (DELETE)

**Query Parameter:**
- `id`: Invoice ID (UUID)

**Process:**
1. Delete invoice record from database
2. Does not delete generated file (stateless regeneration)

---

## Key Algorithms

### 1. Triple Overlap Detection

**Sweep Line Algorithm:**
```typescript
function checkTripleOverlap(startTime, endTime, shiftDate, excludeShiftId) {
  // Create events for all shifts (start and end)
  const events = []
  
  // Include shifts from target day
  // Include shifts from previous day that extend past midnight
  
  for (each shift) {
    if (shift is on target day OR (shift is on prev day AND extends into target)) {
      events.push({ time: shift.start, type: 'start' })
      events.push({ time: shift.end, type: 'end' })
    }
  }
  
  // Add new shift events
  events.push({ time: newStart, type: 'start' })
  events.push({ time: newEnd, type: 'end' })
  
  // Sort by time (end events before start events at same time)
  events.sort()
  
  // Sweep through events
  activeCount = 0
  for (each event) {
    if (event.type === 'start') {
      activeCount++
      if (activeCount >= 3) return true  // Triple overlap detected
    } else {
      activeCount--
    }
  }
  
  return false  // No triple overlap
}
```

**Key Points:**
- O(n log n) time complexity
- Handles overnight shifts correctly
- Only checks relevant days (not entire week in week view)
- Excludes shift being edited (by ID)

### 2. Cost Calculation

**Duration Calculation:**
```typescript
function calculateShiftDuration(startTime, endTime, shiftDate) {
  // Parse times to minutes
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  
  // Check if overnight
  if (endMinutes <= startMinutes) {
    // Overnight: split at midnight
    const beforeMidnight = 24 * 60 - startMinutes  // Minutes until midnight
    const afterMidnight = endMinutes                // Minutes after midnight
    
    // May need different rates for each day
    return { beforeMidnight, afterMidnight, isOvernight: true }
  }
  
  // Same day
  return { totalMinutes: endMinutes - startMinutes, isOvernight: false }
}
```

**Rate Matching:**
```typescript
function pickLineItemForShift(category, dayType, isSleepover, isPublicHoliday) {
  // Filter by category
  let matches = lineItemCodes.filter(li => li.category === category)
  
  // If public holiday, ignore day-of-week flags
  if (isPublicHoliday) {
    matches = matches.filter(li => li.public_holiday === true)
  } else {
    // Match day type
    matches = matches.filter(li => li[dayType] === true)  // weekday/saturday/sunday
  }
  
  // Match sleepover flag
  if (isSleepover) {
    matches = matches.filter(li => li.sleepover === true)
  } else {
    matches = matches.filter(li => li.sleepover !== true)
  }
  
  // Sort by code and return first
  matches.sort((a, b) => a.code.localeCompare(b.code))
  return matches[0] || null
}
```

### 3. Shift Layout (UI Positioning)

**Column Assignment Algorithm:**
```typescript
function computeLayout(shifts) {
  // Group overlapping shifts into connected components
  const components = []
  
  for (each shift) {
    // Find component this shift overlaps with
    let targetComponent = null
    for (each component) {
      if (shift overlaps with any shift in component) {
        targetComponent = component
        break
      }
    }
    
    if (targetComponent) {
      targetComponent.add(shift)
    } else {
      components.add(new component with shift)
    }
  }
  
  // Assign columns within each component
  for (each component) {
    const activeCols = []  // Tracks which columns are in use
    
    for (each shift in component, sorted by start time) {
      // Find first available column
      col = 0
      while (activeCols has shift ending after this shift starts in col) {
        col++
      }
      
      // Assign column
      layout[shift.id] = { col, colCount: max columns in component }
      activeCols[col] = { shift, endTime }
    }
  }
  
  return layout
}
```

**Rendering:**
```css
.shift-block {
  left: calc((100% / colCount) * col)
  width: calc(100% / colCount)
  top: startMinutes * px
  height: durationMinutes * px
}
```

### 4. Overlap Cost Calculation

**Sweep Line for Overlaps:**
```typescript
function calculateOverlap(shifts) {
  const events = []
  
  // Create events for each shift
  for (each shift) {
    events.push({ time: shift.start, type: 'start', shift })
    events.push({ time: shift.end, type: 'end', shift })
  }
  
  events.sort(by time)
  
  const activeShifts = []
  let totalOverlapMinutes = 0
  let lastEventTime = null
  
  for (each event) {
    if (lastEventTime && activeShifts.length >= 2) {
      // Overlap occurring
      const duration = event.time - lastEventTime
      totalOverlapMinutes += duration * (activeShifts.length - 1)
    }
    
    if (event.type === 'start') {
      activeShifts.add(event.shift)
    } else {
      activeShifts.remove(event.shift)
    }
    
    lastEventTime = event.time
  }
  
  const overlapHours = totalOverlapMinutes / 60
  const overlapCost = calculate proportional cost
  
  return { overlapHours, overlapCost }
}
```

---

## UI Components

### CalendarClient (Main Component)

**State:**
- `currentDate`: Active date (persisted to localStorage)
- `viewMode`: 'day' | 'week'
- `dateFrom`, `dateTo`: Date range for filtering and totals
- `selectedClientId`: Active client filter (persisted to localStorage)
- `shifts`: Shifts for current day (includes previous day overnight)
- `rangeShifts`: All shifts in date range (for week view and totals)
- `carers`, `clients`, `lineItemCodes`: Master data
- Dialog states (showShiftDialog, showCopyDayDialog, etc.)
- Error states
- Loading states

**Key Functions:**
- `fetchData()`: Loads all data from Supabase
- `handleSaveShift()`: Creates or updates shift with validation
- `handleDeleteShift()`: Deletes shift
- `handleConfirmCopyDay()`: Copies all shifts from current day
- `handleConfirmCopyShift()`: Copies single shift
- `handleGenerateInvoice()`: Generates invoice
- `checkTripleOverlap()`: Validates overlap rules
- `computeLayout()`: Calculates shift positioning
- `computeSidebarAggregates()`: Calculates totals for sidebar

**Event Handlers:**
- Mouse events for drag and drop
- Form inputs for shift editing
- Date navigation
- View toggle

### SidebarClient

**Props:**
- None (uses CalendarSidebarContext)

**Display:**
- "Invoice App" title
- Navigation links (Home, Calendar, Shifts, etc.)
- Carer totals (hours and cost)
- Overlap totals
- Overall total (excluding HIREUP)

**Styling:**
- Centered text
- 1.5rem font size for buttons
- Responsive layout

### Header

**Props:**
- None

**Display:**
- Logo/branding
- May show current user (if auth added)

---

## Error Handling

### User-Facing Errors

**Error Toast:**
- Red background, white text
- Appears at bottom center of screen
- Auto-dismisses after 5 seconds
- Click to dismiss immediately
- Z-index ensures visibility above dialogs

**Validation Errors:**
- Shown inline in dialogs (red text)
- Examples:
  - "Please select a carer"
  - "Invoice number is required"
  - "This shift would cause 3 or more shifts to overlap"
  - "Cannot copy to following days due to triple overlap: ..."

**Network Errors:**
- Caught in try-catch blocks
- Displayed in error toast
- Format: "Error: [message]"

### Developer Errors

**Console Logging:**
- Extensive console.log statements for debugging
- Prefixed with emojis for easy scanning (🔄, ✅, ❌, 📊, etc.)
- Shows data flow, query results, state changes

**Type Safety:**
- TypeScript interfaces for all data models
- Compile-time type checking
- Runtime validation at API boundaries

---

## Configuration

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Constants

**UI Constants:**
```typescript
HOUR_HEIGHT = 35           // Pixels per hour in timeline
QUARTER_HOUR_HEIGHT = 8.75 // Pixels per 15 minutes
```

**Default Colors:**
```typescript
DEFAULT_CARER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#6366f1', // Indigo
]
```

### Database Schema

See `migrations/` directory for SQL migration files:
- `create_invoices_table.sql`
- `add_carer_color.sql`
- `add_category_to_shifts.sql`
- `add_client_id_to_shifts.sql`
- `add_shift_type_flags.sql`
- `add_weekday_columns.sql`
- `create_line_item_categories.sql`
- `create_saved_calendars.sql`

---

## Common Workflows

### Creating a Shift
1. Ensure client is selected (top dropdown)
2. Ensure date range is set (Date from / Date to)
3. Click "Create new shift" or drag on timeline
4. Select carer from dropdown
5. Set start time (HH:MM)
6. Set end time (HH:MM) - can be earlier than start for overnight
7. Select category (auto-matches line item code)
8. Check sleepover or public holiday if applicable
9. Cost auto-calculates
10. Click "Save shift"
11. Calendar refreshes showing new shift

### Generating an Invoice
1. Navigate to calendar
2. Set date range (e.g., 2026-01-01 to 2026-01-31)
3. Select client
4. Click three-dot menu → "Generate invoice"
5. Set invoice date (defaults to today)
6. Enter invoice number (e.g., "INV-001")
7. Select carer from list (shows shift count)
8. Click "Generate"
9. Wait for success message
10. Click "Download [filename]"
11. Excel file downloads to browser
12. Invoice record saved to database

### Copying Shifts
1. Create shifts for one day (e.g., Monday template)
2. Set date range covering multiple days
3. Click three-dot menu → "Copy day"
4. Select target days from calendar (can multi-select)
5. Click "Copy"
6. System checks for triple overlaps
7. Successfully copied shifts appear immediately
8. Error message lists any days that couldn't receive all shifts

---

## Testing Checklist

### Shift Operations
- [ ] Create shift with all fields
- [ ] Create overnight shift (end time < start time)
- [ ] Edit existing shift
- [ ] Delete shift
- [ ] Drag shift to new time
- [ ] Resize shift (top and bottom handles)
- [ ] Validate same carer overlap prevention
- [ ] Validate triple overlap prevention

### Copy Operations
- [ ] Copy day to single target
- [ ] Copy day to multiple targets
- [ ] Copy shift to multiple targets
- [ ] Verify triple overlap blocking
- [ ] Verify cost recalculation for different day types
- [ ] Verify overnight shifts copy correctly

### Invoice Generation
- [ ] Generate invoice for carer with shifts
- [ ] Verify all fields populated correctly
- [ ] Verify dates formatted as DD/MM/YYYY
- [ ] Verify totals calculated correctly
- [ ] Verify GST calculation
- [ ] Download invoice from success dialog
- [ ] Download invoice from history page
- [ ] Verify no duplicates created

### UI/UX
- [ ] Week view displays all days correctly
- [ ] Day view shows 24-hour timeline
- [ ] Sidebar totals update correctly
- [ ] Error toast appears and auto-dismisses
- [ ] Error toast dismisses on click
- [ ] Dialogs layer correctly (z-index)
- [ ] Date navigation works (Previous/Next Day)
- [ ] View toggle (Day ↔ Week)
- [ ] Client selector filters data
- [ ] Date range selector updates totals

### Edge Cases
- [ ] Shift exactly at midnight (00:00)
- [ ] Shift spanning multiple days
- [ ] Multiple overnight shifts from previous day
- [ ] Zero shifts on a day
- [ ] Very short shifts (15 minutes)
- [ ] All-day shifts (24 hours)
- [ ] Public holiday shifts
- [ ] Sleepover shifts
- [ ] HIREUP shifts (manual cost)
- [ ] Missing line item codes

---

## Troubleshooting

### Common Issues

**"Shifts not appearing"**
- Check client selector - ensure client is selected
- Check date range - ensure it includes the shift date
- Refresh page (Cmd+R / Ctrl+R)

**"Cannot create shift - triple overlap"**
- Check if 2 shifts already exist at that time
- Use Copy Day which allows partial copies
- Or adjust timing to avoid overlap

**"Cost is incorrect"**
- Verify line item codes exist for category
- Check day type flags (weekday/saturday/sunday)
- Check sleepover/public holiday flags
- Verify billed_rate in line item code

**"Invoice generation fails"**
- Ensure date range is set
- Ensure carer has shifts in range
- Check invoice number format (no special chars except - and _)
- Check browser console for detailed error

**"Download from invoice history doesn't work"**
- This was a bug, fixed in latest version
- Ensure baseURL is correctly detected from request
- Check network tab for 500 errors

### Debug Mode

Enable debug logging:
```typescript
// In CalendarClient.tsx
const DEBUG = true

if (DEBUG) {
  console.log(...)
}
```

Check console for:
- 🔄 Data fetching
- ✅ Successful operations
- ❌ Errors
- 📊 State changes
- 🎯 Overlap detection
- 📝 Shift operations

---

## Future Enhancements

**Potential Features:**
- Authentication and user roles
- Real-time collaboration (multiple users)
- Recurring shift templates
- Bulk shift import (CSV)
- PDF invoice format
- Email invoice delivery
- Payment tracking
- Carer availability calendar
- Mobile app
- Reporting dashboard
- Export data to accounting software

**Code Improvements:**
- Split 4700-line CalendarClient into sub-components
- Add request cancellation (AbortController) for fetchData
- Remove console.log statements in production
- Add unit tests for overlap detection
- Add E2E tests with Playwright
- Add loading skeletons instead of spinners
- Implement optimistic UI updates
- Add undo/redo functionality

---

## Glossary

**Carer**: A care worker who provides services to clients. Paid for shifts worked.

**Client**: A care recipient who receives services. Has NDIS funding.

**Shift**: A work period assigned to a carer for a client. Has start/end times and cost.

**Line Item Code**: A billing rate for a specific type of shift. Matched by category and day type.

**Category**: Type of service (CORE, HIREUP, etc.). Determines line item matching.

**Sleepover**: Overnight shift where carer sleeps on-site. Lower hourly rate.

**Public Holiday**: Shift on public holiday. Higher hourly rate.

**Overnight Shift**: Shift that crosses midnight. End time on next calendar day.

**Triple Overlap**: Three or more carers working simultaneously. NOT allowed.

**Double Overlap**: Two carers working simultaneously. ALLOWED.

**NDIS**: National Disability Insurance Scheme (Australia). Funding body for care services.

**GST**: Goods and Services Tax (10% in Australia). Added to invoice totals.

**ABN**: Australian Business Number. Required for carer invoicing.

**BSB**: Bank State Branch. Australian bank routing number.

---

## Version History

**Current Version: 1.0**
- Initial release with core functionality
- Calendar views (Day and Week)
- Shift CRUD operations
- Copy day/shift functionality
- Invoice generation
- Triple overlap prevention
- Sidebar totals

**Recent Fixes:**
- Fixed duplicate invoice bug when downloading from history
- Fixed triple overlap check to only include previous day, not future days
- Fixed copy day to filter out previous day overnight shifts from source
- Removed unnecessary database test queries
- Added invoice number validation (alphanumeric + hyphens/underscores)
- Added error toast auto-dismiss (5 seconds)
- Added click-to-dismiss for error toasts
- Prevented invoice dialog opening without date range
- Hide footer stats when date range not set
- Format dates as DD/MM/YYYY in invoice template
- Fixed overnight shift time adjustment bug

---

## Contact & Support

For issues or questions:
1. Check this documentation first
2. Review console logs for error details
3. Check database migrations are applied
4. Verify environment variables are set
5. Test with sample data

**Development Environment:**
- Node.js 18+
- Next.js 14
- PostgreSQL (via Supabase)
- Modern browser (Chrome, Firefox, Safari, Edge)

---

*Last Updated: January 4, 2026*
