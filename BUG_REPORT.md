# Bug Report - Invoice App

**Analysis Date:** January 25, 2026  
**Total Bugs Found:** 20+ issues across multiple severity levels

---

## 🔴 CRITICAL BUGS (Security & Data Loss)

### 1. **Row Level Security (RLS) Not Enforced - DATA BREACH**
**File:** Database (documented in `SECURITY_ISSUE_RLS_MISSING.md`)  
**Severity:** CRITICAL  
**Impact:** All authenticated users can see ALL data from all other users

**Description:**
The database migration scripts to enforce RLS exist but have not been executed in Supabase. This means:
- New users can see all data from existing users (e.g., aaozhogin@gmail.com)
- No data isolation between users
- Complete bypass of multi-tenancy security

**Files Affected:**
- `migrations/add_user_id_columns.sql` - Not executed
- `migrations/update_rls_policies_for_users.sql` - Not executed
- `migrations/migrate_existing_data.sql` - Not executed

**Fix Required:**
1. Execute all three migration scripts in order in Supabase SQL Editor
2. Update `migrate_existing_data.sql` with the actual UUID of aaozhogin@gmail.com
3. Verify RLS policies are active on all tables (shifts, carers, clients, line_items, invoices, saved_calendars)

---

### 2. **Middleware Authentication Cookie Name Mismatch**
**File:** `middleware.ts:36`  
**Severity:** CRITICAL  
**Impact:** Authentication bypass possible, protected routes accessible without proper auth

**Description:**
```typescript
const authCookie = request.cookies.get('sb-auth-token')
```

The middleware looks for a cookie named `sb-auth-token`, but Supabase uses different cookie names by default (typically `sb-<project-ref>-auth-token`). This could cause:
- Authentication failures
- Protected routes becoming accessible
- Inconsistent auth state

**Fix:**
```typescript
// Get all cookies and find the Supabase auth token
const cookies = request.cookies.getAll()
const authCookie = cookies.find(c => c.name.includes('auth-token'))
```

Or use Supabase's proper server-side auth:
```typescript
import { createServerClient } from '@supabase/ssr'
```

---

### 3. **Missing User ID Validation in API Routes**
**Files:** Multiple API routes  
**Severity:** HIGH  
**Impact:** Data manipulation by unauthorized users

**Description:**
Many API routes don't properly validate that the `user_id` in the request matches the authenticated user. Examples:

**File:** `app/api/generate-invoice/route.ts:97-101`
```typescript
let userId: string | undefined = body.userId
if (!userId) {
  const { data: authData } = await supabase.auth.getUser()
  userId = authData?.user?.id
}
```

Problem: The API accepts `userId` from the request body without validation. A malicious user could pass a different user's ID and generate invoices for their data.

**Fix:** Always get user ID from the authenticated session, never from request body:
```typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const userId = user.id // Never trust client input
```

**Affected Files:**
- `app/api/generate-invoice/route.ts`
- `app/api/save-invoice/route.ts`
- `app/api/list-invoices/route.ts`
- `app/api/saved-calendars/route.ts`
- `app/api/saved-calendars/[id]/route.ts`

---

## 🟠 HIGH SEVERITY BUGS

### 4. **Race Condition in Calendar Data Fetching**
**File:** `app/calendar/CalendarClient.tsx:226-238`  
**Severity:** HIGH  
**Impact:** Stale data, UI inconsistencies, duplicate requests

**Description:**
```typescript
useEffect(() => {
  if (authLoading) return
  if (!user) {
    setIsLoading(false)
    setCarers([])
    setLineItemCodes([])
    setClients([])
    setShifts([])
    setRangeShifts([])
    return
  }
  fetchData()
}, [authLoading, user, currentDate, dateFrom, dateTo, selectedClientId, viewMode])
```

The effect has 6 dependencies that can change independently. Each change triggers a full data fetch, which includes 7 parallel Supabase queries. This can cause:
- Multiple simultaneous fetch requests overwriting each other
- Race conditions when filters change rapidly
- Unnecessary API calls
- Memory leaks if component unmounts during fetch

**Fix:**
```typescript
useEffect(() => {
  if (authLoading) return
  if (!user) {
    setIsLoading(false)
    setCarers([])
    setLineItemCodes([])
    setClients([])
    setShifts([])
    setRangeShifts([])
    return
  }
  
  let cancelled = false
  const fetchData = async () => {
    try {
      // ... fetch logic
      if (!cancelled) {
        // Set state
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message)
      }
    }
  }
  
  fetchData()
  
  return () => {
    cancelled = true
  }
}, [authLoading, user, currentDate, dateFrom, dateTo, selectedClientId, viewMode])
```

---

### 5. **Memory Leak - Event Listeners Not Cleaned Up**
**File:** `app/calendar/CalendarClient.tsx:332-338`  
**Severity:** HIGH  
**Impact:** Memory leaks, performance degradation

**Description:**
```typescript
document.addEventListener('mousemove', handleMouseMove)
document.addEventListener('mouseup', handleMouseUp)

return () => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}
```

The cleanup is good, BUT the `handleMouseMove` and `handleMouseUp` functions are recreated on every render because they're defined inside the effect. The cleanup removes different function references than what was added.

**Fix:**
Use `useCallback` to stabilize function references:
```typescript
const handleMouseMove = useCallback((e: MouseEvent) => {
  // ... implementation
}, [dragState])

const handleMouseUp = useCallback(async (e: MouseEvent) => {
  // ... implementation
}, [dragState])

useEffect(() => {
  if (!dragState.isDragging && !dragState.isResizing) return
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}, [dragState.isDragging, dragState.isResizing, handleMouseMove, handleMouseUp])
```

---

### 6. **Missing Event Listener Cleanup**
**File:** `app/invoices/InvoicesClient.tsx:43-47`  
**Severity:** HIGH  
**Impact:** Memory leak, duplicate event handlers

**Description:**
```typescript
useEffect(() => {
  const handleInvoiceGenerated = () => {
    fetchInvoices()
  }
  window.addEventListener('invoiceGenerated', handleInvoiceGenerated)
  return () => window.removeEventListener('invoiceGenerated', handleInvoiceGenerated)
}, [])
```

The cleanup function is correct, BUT `fetchInvoices` is not in the dependency array and can become stale. When `fetchInvoices` is redefined (which happens when `user` or `authLoading` changes), the event handler still references the old version.

**Fix:**
```typescript
useEffect(() => {
  const handleInvoiceGenerated = () => {
    fetchInvoices()
  }
  window.addEventListener('invoiceGenerated', handleInvoiceGenerated)
  return () => window.removeEventListener('invoiceGenerated', handleInvoiceGenerated)
}, [fetchInvoices]) // Add dependency

// And wrap fetchInvoices in useCallback:
const fetchInvoices = useCallback(async () => {
  // ... implementation
}, [user, authLoading])
```

---

### 7. **Missing Cleanup in TimePicker Component**
**File:** `app/line-item-codes/LineItemCodesClient.tsx:30-37`  
**Severity:** HIGH  
**Impact:** Memory leak in forms

**Description:**
```typescript
useEffect(() => {
  const onDoc = (e: MouseEvent) => {
    if (!ref.current) return;
    if (!ref.current.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener('mousedown', onDoc);
  return () => document.removeEventListener('mousedown', onDoc);
}, []);
```

Similar issue - the cleanup removes a different function reference. This TimePicker is used multiple times per page, so the leak multiplies.

**Fix:** Move the handler outside useEffect or use useCallback.

---

### 8. **Type Safety Issues with TypeScript Ignores**
**File:** `app/api/generate-invoice/route.ts:231, 348`  
**Severity:** MEDIUM-HIGH  
**Impact:** Potential runtime errors, Buffer type mismatches

**Description:**
```typescript
// @ts-ignore - Buffer type mismatch between Node.js and ExcelJS
await workbook.xlsx.load(templateData)
```

Using `@ts-ignore` to bypass TypeScript errors can hide real bugs. The comment suggests Buffer type mismatches between Node.js and ExcelJS.

**Fix:**
```typescript
// Properly type the buffer
const templateBuffer = Buffer.from(templateData)
await workbook.xlsx.load(templateBuffer)

// Or use proper type assertions
await workbook.xlsx.load(templateData as any) // With explanation
```

---

## 🟡 MEDIUM SEVERITY BUGS

### 9. **Inefficient Data Fetching in Calendar**
**File:** `app/calendar/CalendarClient.tsx:375-405`  
**Severity:** MEDIUM  
**Impact:** Slow page loads, unnecessary database queries

**Description:**
The calendar fetches data in 7 parallel queries on every render:
```typescript
const [carersRes, lineItemCodesRes, clientsRes, shiftsRes, 
       prevDayShiftsRes, rangeShiftsRes, footerShiftsRes] = await Promise.all([...])
```

Problems:
1. Carers and line items rarely change - could be cached
2. Fetching shifts for 3 different ranges (current day, previous day, week range) is inefficient
3. No loading states for individual queries
4. No retry logic for failed queries

**Optimization:**
```typescript
// Cache static data
const { data: carersData } = useSWR(
  user ? ['carers', user.id] : null,
  () => supabase.from('carers').select('*').eq('user_id', user.id)
)

// Fetch wider date range once
const rangeFrom = min(displayRangeFrom, prevDayYmd)
const rangeTo = max(displayRangeTo, dayYmd)
```

---

### 10. **Missing Error Boundaries**
**Files:** Multiple React components  
**Severity:** MEDIUM  
**Impact:** Entire app crashes on component errors

**Description:**
None of the components have error boundaries. If any component throws an error, the entire app crashes with a white screen.

**Fix:**
Create an error boundary component and wrap main sections:
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>
    }
    return this.props.children
  }
}
```

---

### 11. **Unhandled Promise Rejections**
**File:** `app/shifts/ShiftsClient.tsx` (and others)  
**Severity:** MEDIUM  
**Impact:** Silent failures, inconsistent error handling

**Description:**
Many async operations catch errors but don't handle them properly:
```typescript
const { data, error } = await supabase.from('carers').select('*')
if (error) {
  console.error('Fetch error:', error)
} else if (mounted) {
  setCarers(data ?? [])
}
```

The error is logged but not shown to the user. The component continues as if nothing happened.

**Fix:**
```typescript
const { data, error } = await supabase.from('carers').select('*')
if (error) {
  console.error('Fetch error:', error)
  setError(`Failed to load carers: ${error.message}`)
  return
}
setCarers(data ?? [])
```

---

### 12. **Shift Time Calculation Bug for Overnight Shifts**
**File:** `app/calendar/CalendarClient.tsx:707-719`  
**Severity:** MEDIUM  
**Impact:** Incorrect time calculations for shifts crossing midnight

**Description:**
```typescript
const adjustTime = (timeStr: string, minutes: number): string => {
  const [hours, mins] = timeStr.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  
  let constrainedMinutes = totalMinutes % 1440
  if (constrainedMinutes < 0) constrainedMinutes += 1440
  
  const newHours = Math.floor(constrainedMinutes / 60) % 24
  const newMins = constrainedMinutes % 60
  
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
}
```

The function wraps times within a single day (0-1440 minutes), but overnight shifts need special handling. This can cause issues when adjusting shift times that span midnight.

**Fix:** Add context about which day the time belongs to.

---

### 13. **Missing Input Validation in Shift Forms**
**File:** `app/shifts/ShiftsClient.tsx:410-450`  
**Severity:** MEDIUM  
**Impact:** Invalid data in database

**Description:**
The form doesn't validate:
- Date must not be in the future (or very far past)
- Time from must be before time to (for same-day shifts)
- Cost must be positive
- Required fields (carer, category) should be validated before submission

**Fix:** Add comprehensive validation:
```typescript
if (!form.carerId || !form.category) {
  setError('Please select carer and category')
  return
}

if (form.category === 'HIREUP') {
  const costNum = Number(form.hireupCost)
  if (!Number.isFinite(costNum) || costNum <= 0) {
    setError('Enter a valid positive cost for HIREUP')
    return
  }
}

// Validate dates
const shiftDate = new Date(form.shiftDate)
const now = new Date()
if (shiftDate > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
  setError('Shift date cannot be more than 1 year in the future')
  return
}
```

---

### 14. **Incorrect Regex Pattern in Date Validation**
**File:** `app/calendar/CalendarClient.tsx:90`  
**Severity:** MEDIUM  
**Impact:** Potential XSS, injection attacks

**Description:**
```typescript
if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
```

This regex allows invalid dates like `9999-99-99` to pass validation. While JavaScript's Date constructor will handle it, it's not a proper date validation.

**Fix:**
```typescript
function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && 
         date.getMonth() === m - 1 && 
         date.getDate() === d
}
```

---

## 🔵 LOW SEVERITY BUGS

### 15. **Inefficient Array Filtering**
**File:** `app/calendar/CalendarClient.tsx:941-946`  
**Severity:** LOW  
**Impact:** Minor performance issue

**Description:**
```typescript
const counts = new Map<number, number>()
for (const shift of rangeShifts) {
  const category = shift.category as string | null | undefined
  if (!category || category !== 'HIREUP') {
    counts.set(shift.carer_id, (counts.get(shift.carer_id) || 0) + 1)
  }
}
```

This could be simplified with a filter:
```typescript
const nonHireupShifts = rangeShifts.filter(s => s.category !== 'HIREUP')
const counts = new Map<number, number>()
for (const shift of nonHireupShifts) {
  counts.set(shift.carer_id, (counts.get(shift.carer_id) || 0) + 1)
}
```

---

### 16. **Redundant Type Assertions**
**File:** Multiple files  
**Severity:** LOW  
**Impact:** Code maintainability

**Description:**
Many places use `as any` unnecessarily:
```typescript
const res = (await supabase.from('line_items').select('*')) as { data: any; error: any }
```

**Fix:** Use proper typing from the Database type:
```typescript
const { data, error } = await supabase
  .from('line_items')
  .select('*')
  .eq('user_id', user.id)
  .returns<LineItem[]>()
```

---

### 17. **Console.log Statements in Production Code**
**Files:** Multiple files  
**Severity:** LOW  
**Impact:** Console spam, potential information leakage

**Description:**
There are 50+ `console.log`, `console.error`, `console.warn` statements throughout the codebase. These should be removed or conditionally enabled in production.

**Fix:**
```typescript
// lib/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args)
}
```

---

### 18. **Missing Loading States**
**Files:** Multiple components  
**Severity:** LOW  
**Impact:** Poor UX during data fetching

**Description:**
Many buttons and actions don't show loading states:
- Delete shift button
- Update shift button
- Form submissions

**Fix:** Add loading states to all async actions.

---

### 19. **Hardcoded Magic Numbers**
**File:** `app/calendar/CalendarClient.tsx:69-70`  
**Severity:** LOW  
**Impact:** Maintainability

**Description:**
```typescript
const HOUR_HEIGHT = 35
const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4
```

These constants are used throughout but could be calculated from a base unit.

---

### 20. **Missing ARIA Labels and Accessibility**
**Files:** Multiple UI components  
**Severity:** LOW  
**Impact:** Poor accessibility for screen readers

**Description:**
Buttons, forms, and interactive elements lack proper ARIA labels:
```typescript
<button onClick={handleDelete}>Delete</button>
```

**Fix:**
```typescript
<button 
  onClick={handleDelete}
  aria-label={`Delete shift on ${shift.shift_date}`}
>
  Delete
</button>
```

---

## 🔍 Code Quality Issues

### 21. **Large Component Files (>1000 lines)**
**Files:**
- `app/calendar/CalendarClient.tsx` (1600+ lines)
- `app/api/generate-invoice/route.ts` (800+ lines)
- `app/shifts/ShiftsClient.tsx` (900+ lines)

**Impact:** Hard to maintain, test, and debug

**Recommendation:** Break into smaller, focused components and utilities.

---

### 22. **Missing Tests**
**Severity:** N/A  
**Impact:** No confidence in code changes

**Description:**
No test files found in the repository. Critical business logic (invoice generation, time calculations, cost calculations) is untested.

**Recommendation:**
- Add unit tests for utilities (time calculations, cost calculations)
- Add integration tests for API routes
- Add E2E tests for critical user flows

---

## 📊 Summary

| Severity | Count | Priority |
|----------|-------|----------|
| Critical | 3 | Fix immediately |
| High | 5 | Fix in next sprint |
| Medium | 7 | Fix in 2-3 sprints |
| Low | 7 | Technical debt |

## 🎯 Recommended Action Plan

### Phase 1 (Immediate - Week 1)
1. ✅ Execute RLS migration scripts in Supabase
2. ✅ Fix middleware authentication cookie handling
3. ✅ Add user ID validation to all API routes

### Phase 2 (High Priority - Week 2-3)
4. ✅ Fix race conditions in Calendar data fetching
5. ✅ Fix memory leaks (event listeners)
6. ✅ Add error boundaries to main sections

### Phase 3 (Medium Priority - Week 4-6)
7. ✅ Improve error handling across all components
8. ✅ Add input validation to all forms
9. ✅ Fix overnight shift calculations
10. ✅ Optimize data fetching

### Phase 4 (Low Priority - Ongoing)
11. ✅ Remove console.log statements
12. ✅ Add proper TypeScript types
13. ✅ Improve accessibility
14. ✅ Refactor large components
15. ✅ Add test coverage

---

**End of Bug Report**
