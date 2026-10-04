import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invoiceTimeZone, localInvoiceTime, invoiceDayDifference, invoiceTimeLabel } from '../lib/invoice-time.ts'

const zone = invoiceTimeZone()
test('Sydney invoice times use the offset on each shift date', () => {
  assert.deepEqual(localInvoiceTime('2026-09-26T08:30:00Z', zone), { date: '2026-09-26', minutes: 1110 })
  assert.deepEqual(localInvoiceTime('2026-10-04T07:30:00Z', zone), { date: '2026-10-04', minutes: 1110 })
  assert.deepEqual(localInvoiceTime('2026-04-04T07:30:00Z', zone), { date: '2026-04-04', minutes: 1110 })
  assert.deepEqual(localInvoiceTime('2026-04-05T08:30:00Z', zone), { date: '2026-04-05', minutes: 1110 })
})
test('clock hours stay 1am to 4am through both daylight saving transitions', () => {
  for (const [start, end] of [
    ['2026-10-03T15:00:00Z', '2026-10-03T17:00:00Z'],
    ['2026-04-04T14:00:00Z', '2026-04-04T18:00:00Z']
  ]) {
    const from = localInvoiceTime(start, zone)
    const to = localInvoiceTime(end, zone)
    assert.equal(from.minutes, 60)
    assert.equal(to.minutes, 240)
    assert.equal(invoiceDayDifference(from.date, to.date), 0)
    assert.equal((to.minutes - from.minutes) / 60, 3)
  }
})
test('overnight dates and midnight labels are relative to their invoice row', () => {
  const start = localInvoiceTime('2026-10-03T08:30:00Z', zone)
  const end = localInvoiceTime('2026-10-03T14:00:00Z', zone)
  assert.equal(invoiceDayDifference(start.date, end.date), 1)
  assert.equal(invoiceTimeLabel(1440), '12:00 AM')
  assert.equal(invoiceTimeLabel(0), '12:00 AM')
  assert.equal(invoiceTimeLabel(end.minutes), '12:00 AM')
})
test('legacy downloads default to Sydney and invalid zones are rejected', () => {
  assert.equal(zone, 'Australia/Sydney')
  assert.throws(() => invoiceTimeZone('invalid/timezone'), RangeError)
  assert.equal(localInvoiceTime('invalid', zone), null)
})
