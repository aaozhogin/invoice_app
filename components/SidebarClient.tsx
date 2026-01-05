'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function SidebarClient() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Invoice App</div>
      <Link href="/" className="nav-link" style={{textAlign: 'left'}}>
        Home
      </Link>
      <Link href="/calendar" className="nav-link" style={{textAlign: 'left'}}>
        Calendar
      </Link>
      <Link href="/shifts" className="nav-link" style={{textAlign: 'left'}}>
        Shifts
      </Link>
      <Link href="/invoices" className="nav-link" style={{textAlign: 'left'}}>
        Invoices
      </Link>
      <Link href="/reports" className="nav-link" style={{textAlign: 'left'}}>
        Reports
      </Link>
      
      <div className="nav-divider"></div>
      
      <button 
        className="nav-toggle" 
        onClick={() => setSettingsOpen(!settingsOpen)}
      >
        Settings {settingsOpen ? '▼' : '▶'}
      </button>
      {settingsOpen && (
        <>
          <Link href="/carers" className="nav-link nav-sub" style={{textAlign: 'left'}}>
            Carers
          </Link>
          <Link href="/clients" className="nav-link nav-sub" style={{textAlign: 'left'}}>
            Clients
          </Link>
          <Link href="/line-item-codes" className="nav-link nav-sub" style={{textAlign: 'left'}}>
            Line Item Codes
          </Link>
          <Link href="/google-calendar-sync" className="nav-link nav-sub" style={{textAlign: 'left'}}>
            Google Calendar Sync
          </Link>
        </>
      )}

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
          text-align: left;
        }
        
        .nav-link {
          padding: 12px 20px;
          color: var(--text);
          text-decoration: none;
          border-bottom: 1px solid var(--border);
          transition: background-color 0.2s;
          display: block !important;
          text-align: left !important;
        }
        
        .nav-link:hover {
          background-color: var(--surface-hover);
        }

        .nav-toggle {
          background: none;
          border: none;
          width: 100%;
          padding: 12px 20px;
          color: var(--text);
          text-align: left !important;
          font-family: inherit;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.5;
          cursor: pointer;
          transition: background-color 0.2s;
          border-bottom: 1px solid var(--border);
          display: block;
          margin: 0;
          text-decoration: none;
        }

        .nav-toggle:hover {
          background-color: var(--surface-hover);
        }

        .nav-sub {
          padding-left: 40px !important;
        }

        .nav-divider {
          height: 2px;
          background: var(--border);
          margin: 8px 0;
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
