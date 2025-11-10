import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Invoice App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-header">Invoice App</div>
            <nav>
              <Link href="/" className="nav-link">
                Home
              </Link>
              <Link href="/line-item-codes" className="nav-link">
                Line Item Codes
              </Link>
              {/* add more links as needed */}
            </nav>
          </aside>

          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}


