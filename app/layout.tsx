'use client'

import './globals.css';
import SidebarClient from '@/components/SidebarClient';
import { CalendarSidebarProvider } from './CalendarSidebarContext';
import { AuthProvider } from './lib/AuthContext';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <CalendarSidebarProvider>
            {isAuthPage ? (
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


