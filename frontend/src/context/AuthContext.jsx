import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { applyDueRecurring } from '../api/client'
import { showToast } from '../components/Toast'

const AuthContext = createContext()

const TOKEN_KEY = 'budgetbuddy_token'
const ACCOUNT_KEY = 'budgetbuddy_account'

function readStoredAccount() {
  const raw = localStorage.getItem(ACCOUNT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [account, setAccount] = useState(readStoredAccount)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

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
    persistSession(null, null)
  }, [persistSession])

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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
