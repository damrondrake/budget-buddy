import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { applyDueRecurring, getLatestChangelog } from '../api/client'
import { showToast } from '../components/Toast'

const AuthContext = createContext()

const TOKEN_KEY = 'budgetbuddy_token'
const ACCOUNT_KEY = 'budgetbuddy_account'
const LAST_SEEN_VERSION_KEY = 'last_seen_version'

function readStoredAccount() {
  const raw = localStorage.getItem(ACCOUNT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// True if `latest` is a newer semver than `seen` (or the user has never seen one).
function isNewerVersion(latest, seen) {
  if (!latest) return false
  if (!seen) return true
  const a = String(latest).split('.').map((n) => parseInt(n, 10) || 0)
  const b = String(seen).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0
    const y = b[i] || 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [account, setAccount] = useState(readStoredAccount)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))
  // The unseen "What's New" entries to show (an array, newest first), or null.
  // Rendered by Layout so it never blocks the login screen.
  const [changelog, setChangelog] = useState(null)

  const persistSession = useCallback((nextToken, nextAccount) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    if (nextAccount) {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount))
    } else {
      localStorage.removeItem(ACCOUNT_KEY)
    }
    setToken(nextToken)
    setAccount(nextAccount)
  }, [])

  const logout = useCallback(() => {
    setChangelog(null)
    persistSession(null, null)
  }, [persistSession])

  // Dismiss the What's New modal and remember the newest version shown, so none
  // of these entries reappear next time.
  const dismissChangelog = useCallback(() => {
    setChangelog((current) => {
      if (current && current.length > 0) {
        const newest = current.reduce(
          (max, entry) => (isNewerVersion(entry.version, max) ? entry.version : max),
          current[0].version,
        )
        localStorage.setItem(LAST_SEEN_VERSION_KEY, newest)
      }
      return null
    })
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return
        setAccount(res.data)
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(res.data))
        // Silently apply any recurring transactions due as of today. This runs
        // after login (token changes) and on page-load hydration. Fire-and-
        // forget — it never blocks the UI, and only toasts if it created any.
        applyDueRecurring()
          .then((due) => {
            if (cancelled) return
            const { applied, month, year } = due.data
            if (applied > 0) {
              const label = new Date(year, month - 1).toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              })
              showToast(
                `${applied} recurring transaction${applied === 1 ? '' : 's'} added for ${label}`
              )
            }
          })
          .catch(() => {})

        // Show only the updates this user hasn't seen. Returning users pass
        // their last_seen_version and get back just the newer entries; new users
        // (no last_seen_version) get the single latest entry.
        const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY)
        getLatestChangelog(lastSeen)
          .then((res) => {
            if (cancelled) return
            const data = res.data
            const entries = data == null ? [] : Array.isArray(data) ? data : [data]
            if (entries.length > 0) setChangelog(entries)
          })
          .catch(() => {})
      })
      .catch(() => {
        if (cancelled) return
        persistSession(null, null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, persistSession])

  useEffect(() => {
    function handleUnauthorized() {
      persistSession(null, null)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [persistSession])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    const nextToken = res.data.access_token
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    const me = await api.get('/auth/me')
    persistSession(nextToken, me.data)
  }

  async function register(displayName, email, password) {
    const res = await api.post('/auth/register', {
      display_name: displayName,
      email,
      password,
    })
    const nextToken = res.data.access_token
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    const me = await api.get('/auth/me')
    persistSession(nextToken, me.data)
  }

  // Establish a session from an access token obtained outside login/register
  // (e.g. after accepting a partner invite).
  async function setSessionToken(nextToken) {
    localStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
    const me = await api.get('/auth/me')
    persistSession(nextToken, me.data)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        account,
        loading,
        isAuthenticated: Boolean(token && account),
        login,
        register,
        setSessionToken,
        logout,
        changelog,
        dismissChangelog,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
