import CalendarClient from './CalendarClient';
import ProtectedRoute from '../lib/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <CalendarClient />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}