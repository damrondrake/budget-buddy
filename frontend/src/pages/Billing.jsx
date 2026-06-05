import { useState } from 'react'
import { joinWaitlist } from '../api/client'
import { useAuth } from '../context/AuthContext'

const SUPPORT_EMAIL = 'support@budget-buddy-app.com'

// Everything in the Free plan — available to everyone, forever, no limits.
const FREE_FEATURES = [
  'All core budgeting features',
  'Collaborative accounts — share with your partner',
  'Unlimited transactions',
  'Recurring transactions (weekly/monthly/yearly)',
  'Savings goals and allocations',
  'Spending trends and charts',
  'CSV export',
]

// What's coming in Pro. Not purchasable yet — the CTA collects waitlist emails.
const PRO_FEATURES = [
  {
    title: 'Automatic bank sync',
    desc: 'Connect your bank and transactions import automatically',
  },
  {
    title: 'AI spending insights',
    desc: 'Plain-English analysis of your spending habits',
  },
  {
    title: 'Natural language entry',
    desc: "Just type “spent $45 at Chipotle” and it's added",
  },
  {
    title: 'Custom themes',
    desc: 'Personalize your dashboard',
  },
  {
    title: 'Priority support',
    desc: 'Your support emails are flagged and answered first',
  },
]

export default function Billing() {
  const { account } = useAuth()
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [email, setEmail] = useState(account?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState(null)

  async function handleJoin(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setSubmitting(true)
    try {
      await joinWaitlist(email.trim())
      setJoined(true)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(typeof detail === 'string' ? detail : 'Please enter a valid email.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-4">
          <SparkleIcon className="w-3.5 h-3.5" />
          Plans &amp; Pricing
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          Everything you need is{' '}
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">free</span>
        </h1>
        <p className="mt-3 text-gray-500 max-w-xl mx-auto">
          All of BudgetBuddy's core features are free forever. Something even more powerful is on the way.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Free plan */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-900">Free</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              Your plan
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold tracking-tight text-gray-900">$0</span>
            <span className="text-sm text-gray-400">/ forever</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">No limits, no credit card, no catch.</p>

          <ul className="space-y-3">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                <CheckIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckIcon className="w-5 h-5" />
            You're all set — enjoy!
          </div>
        </section>

        {/* Pro plan — premium styling */}
        <section className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-emerald-400 via-teal-400 to-indigo-500 shadow-lg shadow-emerald-500/10">
          {/* Coming Soon ribbon */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-md">
              <SparkleIcon className="w-3.5 h-3.5" />
              COMING SOON
            </span>
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 text-white p-7 h-full">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                BudgetBuddy
                <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">Pro</span>
              </h2>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold tracking-tight">$4.99</span>
              <span className="text-sm text-slate-400">/ month</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">Supercharge your budgeting when it launches.</p>

            <ul className="space-y-3.5">
              {PRO_FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-400/15 flex items-center justify-center">
                    <SparkleIcon className="w-3 h-3 text-emerald-300" />
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold text-white">{feature.title}</span>
                    <span className="block text-slate-400">{feature.desc}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA / waitlist */}
            <div className="mt-7">
              {joined ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3.5 flex items-start gap-3">
                  <CheckIcon className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-200">You're on the list! 🎉</p>
                    <p className="text-sm text-slate-300">
                      We'll email you the moment BudgetBuddy Pro launches.
                    </p>
                  </div>
                </div>
              ) : showWaitlist ? (
                <form onSubmit={handleJoin} className="space-y-3">
                  <p className="text-sm text-slate-300">
                    BudgetBuddy Pro is coming soon! Enter your email to be notified when it launches.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                      className="flex-1 min-h-[44px] rounded-lg bg-white/10 border border-white/20 px-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-slate-900 bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 transition-colors disabled:opacity-60"
                    >
                      {submitting ? 'Joining…' : 'Notify me'}
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-300">{error}</p>}
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowWaitlist(true)}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl text-sm font-bold text-slate-900 bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-200 hover:to-teal-200 shadow-md transition-colors"
                >
                  <SparkleIcon className="w-4 h-4" />
                  Upgrade to Pro — Coming Soon
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Support contact — for all users */}
      <section className="mt-10 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <MailIcon className="w-5 h-5 text-emerald-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Need help? We're here for you.</p>
            <p className="text-sm text-gray-500">
              Reach our support team any time — available to all BudgetBuddy users.
            </p>
          </div>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          {SUPPORT_EMAIL}
        </a>
      </section>
    </div>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function SparkleIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zM19 14l.9 2.4L22 17l-2.1.6L19 20l-.9-2.4L16 17l2.1-.6L19 14zM5 15l.7 1.8L7.5 17.5l-1.8.7L5 20l-.7-1.8L2.5 17.5l1.8-.7L5 15z" />
    </svg>
  )
}

function MailIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}
