import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BudgetBuddyLogo from '../components/BudgetBuddyLogo'
import AuthFooter from '../components/AuthFooter'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Unable to sign in. Please try again.'
      setError(detail)
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
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-5">Sign in to your account.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-emerald-600 font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
