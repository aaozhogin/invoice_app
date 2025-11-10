import Link from 'next/link';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', height: '100vh', margin: 0 }}>
        {/* Left Menu */}
        <nav
          style={{
            width: '200px',
            background: '#f0f0f0',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Link href="/">Home</Link>
          <Link href="/line-item-codes">Line Item Codes</Link>
        </nav>

        {/* Right Content */}
        <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
      </body>
    </html>
  );
}