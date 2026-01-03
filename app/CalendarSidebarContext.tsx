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

export interface OverallTotals {
  totalHours: number
  totalCost: number
}

interface CalendarSidebarContextValue {
  carerTotals: CarerTotal[]
  setCarerTotals: (totals: CarerTotal[]) => void

  overlapSummary: OverlapSummary | null
  setOverlapSummary: (summary: OverlapSummary | null) => void

  overallTotals: OverallTotals
  setOverallTotals: (totals: OverallTotals) => void
}

const CalendarSidebarContext = createContext<CalendarSidebarContextValue | null>(null)

export function CalendarSidebarProvider({ children }: { children: React.ReactNode }) {
  const [carerTotals, setCarerTotals] = useState<CarerTotal[]>([])
  const [overlapSummary, setOverlapSummary] = useState<OverlapSummary | null>(null)
  const [overallTotals, setOverallTotals] = useState<OverallTotals>({ totalHours: 0, totalCost: 0 })

  const value = useMemo(
    () => ({
      carerTotals,
      setCarerTotals,
      overlapSummary,
      setOverlapSummary,
      overallTotals,
      setOverallTotals,
    }),
    [carerTotals, overlapSummary, overallTotals]
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
