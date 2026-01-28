'use client'

import './globals.css';
import SidebarClient from '@/components/SidebarClient';
import { CalendarSidebarProvider } from './CalendarSidebarContext';
import { AuthProvider } from './lib/AuthContext';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/auth/callback';
  const isLandingPage = pathname === '/';

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <CalendarSidebarProvider>
            {isAuthPage || isLandingPage ? (
              <main>{children}</main>
            ) : (
              <div className="app-shell">
                <SidebarClient />
                <main className="main">{children}</main>
              </div>
            )}
          </CalendarSidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


