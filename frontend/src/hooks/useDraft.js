import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

// Drafts older than this are treated as stale and discarded on read.
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

// Read a draft payload, honoring expiry. Returns the stored data or null.
function readDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey)
      return null
    }
    return parsed.data ?? null
  } catch {
    return null
  }
}

/**
 * Persist an in-progress form to localStorage so it survives accidental
 * navigation or refresh. All read/write/clear/expiry logic lives here.
 *
 * Keys are scoped per account (`{key}_{accountId}`) so two users on one browser
 * never share drafts. Drafts auto-expire after 24h.
 *
 * Two usage styles, both backed by the same storage:
 *  - Managed: use `value` / `setValue` (persists on change) as the form state,
 *    `restored` to flag a recovered draft, and `reset()` to clear + reset.
 *  - Imperative: use `load()` / `save(data)` / `clear()` for forms that keep
 *    their own state (e.g. modals shared between add and edit, or per-item keys).
 */
export default function useDraft(key, initialState) {
  const { account } = useAuth()
  const storageKey = account?.id != null ? `${key}_${account.id}` : null
  const initialRef = useRef(initialState)

  const load = useCallback(() => (storageKey ? readDraft(storageKey) : null), [storageKey])

  const save = useCallback(
    (data) => {
      if (!storageKey) return
      try {
        localStorage.setItem(storageKey, JSON.stringify({ data, savedAt: Date.now() }))
      } catch {
        /* storage full/unavailable — drafts are best-effort */
      }
    },
    [storageKey],
  )

  const clear = useCallback(() => {
    if (!storageKey) return
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  // --- Managed-state convenience (whole form state == the draft) -------------
  const [restored, setRestored] = useState(() =>
    storageKey ? readDraft(storageKey) != null : false,
  )
  const [value, setValueState] = useState(() => {
    const saved = storageKey ? readDraft(storageKey) : null
    return saved ? { ...initialState, ...saved } : initialState
  })

  const setValue = useCallback(
    (updater) => {
      setValueState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        save(next)
        return next
      })
    },
    [save],
  )

  const reset = useCallback(() => {
    clear()
    setValueState(initialRef.current)
    setRestored(false)
  }, [clear])

  return { value, setValue, restored, setRestored, reset, load, save, clear }
}
