import { describe, it, expect } from 'vitest'
import { apiErrorMessage } from './client'

// Builds an axios-shaped error whose response body is `data`.
const errWith = (data) => ({ response: { data } })

describe('apiErrorMessage', () => {
  it('returns a string `detail` as-is', () => {
    expect(apiErrorMessage(errWith({ detail: 'Invalid email or password' }))).toBe(
      'Invalid email or password',
    )
  })

  it('joins the `msg` fields of a Pydantic 422 error array (the invite-signup bug)', () => {
    // This is exactly the shape FastAPI returned for a too-short password.
    const detail = [
      {
        type: 'string_too_short',
        loc: ['body', 'password'],
        msg: 'String should have at least 8 characters',
        input: 'abc123',
        ctx: { min_length: 8 },
      },
    ]
    const msg = apiErrorMessage(errWith({ detail }))
    expect(typeof msg).toBe('string')
    expect(msg).toBe('String should have at least 8 characters')
  })

  it('joins multiple Pydantic errors into one readable string', () => {
    const detail = [
      { loc: ['body', 'password'], msg: 'String should have at least 8 characters' },
      { loc: ['body', 'display_name'], msg: 'String should have at least 2 characters' },
    ]
    expect(apiErrorMessage(errWith({ detail }))).toBe(
      'String should have at least 8 characters. String should have at least 2 characters',
    )
  })

  it('never returns a non-string for a raw object detail (would crash React)', () => {
    const msg = apiErrorMessage(errWith({ detail: { unexpected: 'object' } }), 'fallback')
    expect(typeof msg).toBe('string')
    expect(msg).toBe('fallback')
  })

  it('falls back to the rate-limit `error` field', () => {
    expect(apiErrorMessage(errWith({ error: 'Too many requests' }))).toBe('Too many requests')
  })

  it('uses the fallback when there is no response body (network error)', () => {
    expect(apiErrorMessage({}, 'Network is down')).toBe('Network is down')
  })

  it('has a default fallback so it always yields a string', () => {
    expect(typeof apiErrorMessage(undefined)).toBe('string')
  })
})
