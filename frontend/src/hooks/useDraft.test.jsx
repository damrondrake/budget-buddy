import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useDraft from './useDraft'

// The hook scopes keys by the authenticated account id.
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ account: { id: 42 } }),
}))

beforeEach(() => {
  localStorage.clear()
})

describe('useDraft', () => {
  it('persists changes to localStorage scoped by account id', () => {
    const { result } = renderHook(() => useDraft('draft_test', { amount: '' }))
    act(() => result.current.setValue({ amount: '50' }))

    // Key is suffixed with the account id.
    const raw = localStorage.getItem('draft_test_42')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw).data).toEqual({ amount: '50' })
  })

  it('restores a saved draft on a fresh mount and flags restored=true', () => {
    const { result } = renderHook(() => useDraft('draft_test', { amount: '' }))
    act(() => result.current.setValue({ amount: '99' }))

    // A new instance (e.g. after refresh) recovers the draft.
    const { result: result2 } = renderHook(() => useDraft('draft_test', { amount: '' }))
    expect(result2.current.value).toEqual({ amount: '99' })
    expect(result2.current.restored).toBe(true)
  })

  it('does not restore (and removes) drafts older than 24h', () => {
    const stale = Date.now() - 25 * 60 * 60 * 1000
    localStorage.setItem('draft_old_42', JSON.stringify({ data: { amount: '5' }, savedAt: stale }))

    const { result } = renderHook(() => useDraft('draft_old', { amount: '' }))
    expect(result.current.value).toEqual({ amount: '' })
    expect(result.current.restored).toBe(false)
    expect(localStorage.getItem('draft_old_42')).toBeNull()
  })

  it('keeps drafts younger than 24h', () => {
    const recent = Date.now() - 23 * 60 * 60 * 1000
    localStorage.setItem('draft_recent_42', JSON.stringify({ data: { amount: '7' }, savedAt: recent }))

    const { result } = renderHook(() => useDraft('draft_recent', { amount: '' }))
    expect(result.current.value).toEqual({ amount: '7' })
    expect(result.current.restored).toBe(true)
  })

  it('reset() clears storage and returns to the initial state', () => {
    const { result } = renderHook(() => useDraft('draft_test', { amount: '' }))
    act(() => result.current.setValue({ amount: '12' }))
    expect(localStorage.getItem('draft_test_42')).toBeTruthy()

    act(() => result.current.reset())
    expect(localStorage.getItem('draft_test_42')).toBeNull()
    expect(result.current.value).toEqual({ amount: '' })
  })

  it('isolates drafts between accounts (different key suffix)', () => {
    const { result } = renderHook(() => useDraft('draft_iso', { v: '' }))
    act(() => result.current.setValue({ v: 'mine' }))
    // Account 42's key holds the value; a different account's key does not exist.
    expect(localStorage.getItem('draft_iso_42')).toBeTruthy()
    expect(localStorage.getItem('draft_iso_99')).toBeNull()
  })
})
