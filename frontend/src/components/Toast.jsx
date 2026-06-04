import { useState, useEffect, useCallback } from 'react'

// Tiny event-driven toast system. Call showToast(message) from anywhere (even
// outside React, e.g. AuthContext); a single <Toast /> mounted near the root
// renders a stack of green notifications in the bottom-right that auto-dismiss
// after 4 seconds. Mirrors the existing window-event pattern (auth:unauthorized).
const TOAST_EVENT = 'app:toast'
const AUTO_DISMISS_MS = 4000

let nextId = 0

export function showToast(message) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }))
}

export default function Toast() {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    function handle(e) {
      const message = e.detail?.message
      if (!message) return
      const id = ++nextId
      setToasts((prev) => [...prev, { id, message }])
      setTimeout(() => remove(id), AUTO_DISMISS_MS)
    }
    window.addEventListener(TOAST_EVENT, handle)
    return () => window.removeEventListener(TOAST_EVENT, handle)
  }, [remove])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-start gap-2 max-w-xs sm:max-w-sm rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <svg className="w-5 h-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => remove(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
