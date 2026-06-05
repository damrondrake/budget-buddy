import { useEffect, useRef } from 'react'

// Default refresh cadence for background polling.
const DEFAULT_INTERVAL = 30_000 // 30 seconds

/**
 * Call `callback` on a fixed interval, but only while the browser tab is
 * visible. Used to keep shared-account data in sync without manual refreshes.
 *
 * Behavior:
 *  - Polls every `interval` ms (default 30s) while the tab is in the foreground.
 *  - Uses the Page Visibility API to pause polling when the tab is backgrounded,
 *    so hidden tabs don't hammer the API.
 *  - On becoming visible again, fires `callback` immediately (fresh data right
 *    away) and resumes the interval.
 *  - Clears the interval and visibility listener on unmount.
 *
 * The latest `callback` is kept in a ref so callers can pass a fresh closure
 * each render (e.g. one that captures the current month/year) without
 * restarting the interval.
 */
export default function usePolling(callback, interval = DEFAULT_INTERVAL) {
  const savedCallback = useRef(callback)

  // Always invoke the most recent callback without resetting the timer.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    let timerId = null

    const tick = () => savedCallback.current()

    const start = () => {
      if (timerId === null) {
        timerId = setInterval(tick, interval)
      }
    }

    const stop = () => {
      if (timerId !== null) {
        clearInterval(timerId)
        timerId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick() // resume immediately with fresh data
        start()
      } else {
        stop() // pause while the tab is hidden
      }
    }

    // Only begin polling if the tab is currently visible.
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [interval])
}
