import InvoicesClient from './InvoicesClient'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function InvoicesPage() {
  return (
    <ErrorBoundary>
      <InvoicesClient />
    </ErrorBoundary>
  )
}
