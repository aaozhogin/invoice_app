'use client'
import { Suspense } from 'react'
import ShiftsClient from './ShiftsClient'

export default function ShiftsPage() {
  return (
    <Suspense fallback={<div>Loading shifts...</div>}>
      <ShiftsClient />
    </Suspense>
  )
}