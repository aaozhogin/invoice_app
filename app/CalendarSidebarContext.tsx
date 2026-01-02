'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export interface CarerTotal {
  carerId: number
  name: string
  totalCost: number
  totalHours: number
}

export interface OverlapSummary {
  overlapHours: number
  overlapCost: number
}

interface CalendarSidebarContextValue {
  carerTotals: CarerTotal[]
  setCarerTotals: (totals: CarerTotal[]) => void

  overlapSummary: OverlapSummary | null
  setOverlapSummary: (summary: OverlapSummary | null) => void
}

const CalendarSidebarContext = createContext<CalendarSidebarContextValue | null>(null)

export function CalendarSidebarProvider({ children }: { children: React.ReactNode }) {
  const [carerTotals, setCarerTotals] = useState<CarerTotal[]>([])
  const [overlapSummary, setOverlapSummary] = useState<OverlapSummary | null>(null)

  const value = useMemo(
    () => ({
      carerTotals,
      setCarerTotals,
      overlapSummary,
      setOverlapSummary,
    }),
    [carerTotals, overlapSummary]
  )

  return <CalendarSidebarContext.Provider value={value}>{children}</CalendarSidebarContext.Provider>
}

export function useCalendarSidebar() {
  const ctx = useContext(CalendarSidebarContext)
  if (!ctx) {
    throw new Error('useCalendarSidebar must be used within CalendarSidebarProvider')
  }
  return ctx
}
