'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCalendarSidebar } from '@/app/CalendarSidebarContext'

export default function SidebarClient() {
  const pathname = usePathname()
  const { carerTotals, overlapSummary } = useCalendarSidebar()

  const showCalendarTotals = pathname?.startsWith('/calendar')

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Invoice App</div>
      <Link href="/" className="nav-link">
        Home
      </Link>
      <Link href="/calendar" className="nav-link">
        Calendar
      </Link>
      <Link href="/shifts" className="nav-link">
        Shifts
      </Link>
      <Link href="/carers" className="nav-link">
        Carers
      </Link>
      <Link href="/clients" className="nav-link">
        Clients
      </Link>
      <Link href="/line-item-codes" className="nav-link">
        Line Item Codes
      </Link>

      <Link href="/settings" className="nav-link">
        Settings
      </Link>

      {showCalendarTotals && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-title">Carers total</div>
          {carerTotals.length === 0 ? (
            <div className="sidebar-carer-empty">No shifts in range</div>
          ) : (
            <>
              <div className="sidebar-carer-list">
                {carerTotals.map((c) => (
                  <div key={c.carerId} className="sidebar-carer-row">
                    <span className="sidebar-carer-name">{c.name}</span>
                    <span className="sidebar-carer-hours">{c.totalHours.toFixed(2)}h</span>
                    <span className="sidebar-carer-cost">${c.totalCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {overlapSummary && (
                <div className="sidebar-overlap">
                  <div className="sidebar-overlap-label">Overlap time</div>
                  <div className="sidebar-overlap-values">
                    <span className="sidebar-overlap-hours">{overlapSummary.overlapHours.toFixed(2)}h</span>
                    <span className="sidebar-overlap-cost">${overlapSummary.overlapCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  )
}
