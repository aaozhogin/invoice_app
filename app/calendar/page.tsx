import CalendarClient from './CalendarClient';
import ProtectedRoute from '../lib/ProtectedRoute';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarClient />
    </ProtectedRoute>
  );
}