'use client'
import { Suspense } from 'react'
import ShiftsClient from './ShiftsClient'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function ShiftsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading shifts...</div>}>
        <ShiftsClient />
      </Suspense>
    </ErrorBoundary>
  )
}