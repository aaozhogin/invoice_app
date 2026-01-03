'use client'

import Link from 'next/link'

export default function SidebarClient() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">Invoice App</div>
      <Link href="/" className="nav-link">
        Home
      </Link>
      <Link href="/calendar" className="nav-link">
        Calendar
      </Link>
      <Link href="/saved-calendars" className="nav-link">
        Saved Calendars
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

    </aside>
  )
}
