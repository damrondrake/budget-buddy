import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate } from './format'

describe('formatMoney', () => {
  it('formats a number as USD with two decimals', () => {
    expect(formatMoney(1000)).toBe('$1000.00')
    expect(formatMoney(12.5)).toBe('$12.50')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('handles negative and string inputs', () => {
    expect(formatMoney(-42)).toBe('$-42.00')
    expect(formatMoney('99.9')).toBe('$99.90')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string as "Mon D, YYYY"', () => {
    expect(formatDate('2026-06-04')).toBe('Jun 4, 2026')
    expect(formatDate('2026-12-25')).toBe('Dec 25, 2026')
  })

  it('is not off-by-one across timezones (parses at local midnight)', () => {
    // The first of the month must not roll back to the previous month/day.
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  })
})
