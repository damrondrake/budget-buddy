import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { acceptInviteLogin, acceptInviteRegister, apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import BudgetBuddyLogo from '../components/BudgetBuddyLogo'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { setSessionToken } = useAuth()

  // 'new' = create an account, 'existing' = sign in with an existing account.
  const [mode, setMode] = useState('new')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = mode === 'new'
        ? await acceptInviteRegister(token, email, password, displayName)
        : await acceptInviteLogin(token, email, password)
      await setSessionToken(res.data.access_token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to accept this invite. The link may have expired.'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BudgetBuddyLogo variant="stacked" size="lg" />
          <p className="text-sm text-gray-500 mt-2">You've been invited to collaborate</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Accept invite</h2>
          <p className="text-sm text-gray-500 mb-5">
            Join a shared BudgetBuddy account to manage finances together.
          </p>

          {!token && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              Missing invite token. Please use the link from your email.
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
            <button
              type="button"
              onClick={() => { setMode('new'); setError(null) }}
              className={`flex-1 inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              I'm new here
            </button>
            <button
              type="button"
              onClick={() => { setMode('existing'); setError(null) }}
              className={`flex-1 inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              I have an account
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'new' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={mode === 'new' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
              />
              {mode === 'new' && (
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
            >
              {submitting ? 'Joining...' : 'Join shared account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            <Link to="/login" className="text-emerald-600 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
