import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Invoice App',
  description: 'Manage invoices and line items',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="app-shell">
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
          </aside>

          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}


