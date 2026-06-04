import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/client'
import BudgetBuddyLogo from '../components/BudgetBuddyLogo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [debugToken, setDebugToken] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await forgotPassword(email)
      setSent(true)
      // In local dev (no email key set) the API returns the token so the flow is testable.
      setDebugToken(res.data?.debug_token || null)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BudgetBuddyLogo variant="stacked" size="lg" />
          <p className="text-sm text-gray-500 mt-2">Personal Finance</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot password</h2>
          <p className="text-sm text-gray-500 mb-5">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-lg text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                If an account exists for that email, a reset link has been sent. Check your inbox.
              </div>
              {debugToken && (
                <div className="px-4 py-3 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200">
                  Dev mode (no email configured). Use this reset link:{' '}
                  <Link to={`/reset-password?token=${debugToken}`} className="font-medium underline break-all">
                    /reset-password?token={debugToken}
                  </Link>
                </div>
              )}
              <Link to="/login" className="block text-sm text-emerald-600 font-medium hover:underline text-center">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
              >
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
              <Link to="/login" className="block text-sm text-gray-500 hover:underline text-center">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
