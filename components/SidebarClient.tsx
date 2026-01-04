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
      <Link href="/shifts" className="nav-link">
        Shifts
      </Link>
      <Link href="/invoices" className="nav-link">
        Invoices
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
      <Link href="/reports" className="nav-link">
        Reports
      </Link>

      <style jsx>{`
        .sidebar {
          width: 240px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
        }
        
        .sidebar-header {
          padding: 20px;
          font-size: 1.5em;
          font-weight: bold;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          text-align: center;
        }
        
        .nav-link {
          padding: 12px 20px;
          color: var(--text);
          text-decoration: none;
          border-bottom: 1px solid var(--border);
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        
        .nav-link:hover {
          background-color: var(--surface-hover);
        }
        
        @media (max-width: 600px) {
          .sidebar {
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--border);
            flex-direction: row;
            padding: 10px;
          }
          
          .sidebar-header {
            padding: 10px;
            border-bottom: none;
            border-right: 1px solid var(--border);
            margin-right: 10px;
          }
          
          .nav-link {
            padding: 10px;
            border-bottom: none;
            border-right: 1px solid var(--border);
          }
          
          .nav-link:last-child {
            border-right: none;
          }
        }
      `}</style>
    </aside>
  );
}
