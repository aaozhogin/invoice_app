// Use a named zone, since a fixed UTC offset cannot describe a DST transition.
export const DEFAULT_INVOICE_TIME_ZONE = 'Australia/Sydney'

export function invoiceTimeZone(value?: string): string {
  const zone = value || DEFAULT_INVOICE_TIME_ZONE
  new Intl.DateTimeFormat('en-AU', { timeZone: zone }).format()
  return zone
}

export function localInvoiceTime(iso: string, timeZone: string) {
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant)
  const part = (name: string) => parts.find(p => p.type === name)!.value
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute'))
  }
}

export function invoiceDayDifference(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

export function invoiceTimeLabel(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hour = Math.floor(normalized / 60)
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}
