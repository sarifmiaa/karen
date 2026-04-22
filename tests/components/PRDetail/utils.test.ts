import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timeAgo, timeAgoMs } from '../../../src/components/PRDetail/utils'

const FIXED_NOW = new Date('2024-06-15T12:00:00Z')

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for less than 60 seconds ago', () => {
    expect(timeAgo(new Date('2024-06-15T11:59:30Z').toISOString())).toBe('just now')
  })

  it('returns minutes for 1–59 minutes ago', () => {
    expect(timeAgo(new Date('2024-06-15T11:45:00Z').toISOString())).toBe('15m ago')
    expect(timeAgo(new Date('2024-06-15T11:01:00Z').toISOString())).toBe('59m ago')
  })

  it('returns hours for 1–23 hours ago', () => {
    expect(timeAgo(new Date('2024-06-15T09:00:00Z').toISOString())).toBe('3h ago')
    expect(timeAgo(new Date('2024-06-14T13:00:00Z').toISOString())).toBe('23h ago')
  })

  it('returns days for 1+ days ago', () => {
    expect(timeAgo(new Date('2024-06-13T12:00:00Z').toISOString())).toBe('2d ago')
    expect(timeAgo(new Date('2024-06-08T12:00:00Z').toISOString())).toBe('7d ago')
  })
})

describe('timeAgoMs', () => {
  it('delegates to timeAgo correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    const ms = new Date('2024-06-15T11:00:00Z').getTime()
    expect(timeAgoMs(ms)).toBe('1h ago')
    vi.useRealTimers()
  })
})
