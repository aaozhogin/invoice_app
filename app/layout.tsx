import './globals.css';
import SidebarClient from '@/components/SidebarClient';
import { CalendarSidebarProvider } from './CalendarSidebarContext';
import { AuthProvider } from './lib/AuthContext';

export const metadata = {
  title: 'Invoice App',
  description: 'Manage invoices and line items',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <CalendarSidebarProvider>
            <div className="app-shell">
              <SidebarClient />
              <main className="main">{children}</main>
            </div>
          </CalendarSidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


