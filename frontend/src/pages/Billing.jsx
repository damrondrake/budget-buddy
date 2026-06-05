import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSubscription, createCheckout, createPortal } from '../api/client'

const PRO_FEATURES = [
  'All BudgetBuddy features',
  'Collaborative accounts — share with a partner',
  'Unlimited transactions',
  'Priority support',
]

// Currently every feature is available on the free plan too — this page just
// sets up the billing flow. Feature gating comes in a follow-up.
export default function Billing() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    let active = true
    getSubscription()
      .then((res) => { if (active) setSubscription(res.data) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Drop the ?success/?canceled query params from the URL once read, so a
  // refresh doesn't re-show the banner.
  function dismissBanner() {
    searchParams.delete('success')
    searchParams.delete('canceled')
    setSearchParams(searchParams, { replace: true })
  }

  async function handleUpgrade() {
    setActionError(null)
    setActionLoading(true)
    try {
      const res = await createCheckout()
      window.location.href = res.data.url
    } catch (err) {
      const detail = err.response?.data?.detail || 'Could not start checkout. Please try again.'
      setActionError(detail)
      setActionLoading(false)
    }
  }

  async function handleManage() {
    setActionError(null)
    setActionLoading(true)
    try {
      const res = await createPortal()
      window.location.href = res.data.url
    } catch (err) {
      const detail = err.response?.data?.detail || 'Could not open the billing portal. Please try again.'
      setActionError(detail)
      setActionLoading(false)
    }
  }

  const isPro = subscription?.plan === 'pro'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing</h1>

      {/* Return-from-Stripe banners */}
      {success && (
        <Banner
          tone="success"
          title="You're all set!"
          message="Thanks for upgrading to Pro. Your subscription is now active."
          onDismiss={dismissBanner}
        />
      )}
      {canceled && (
        <Banner
          tone="neutral"
          title="Checkout canceled"
          message="No charge was made. You can upgrade to Pro any time."
          onDismiss={dismissBanner}
        />
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
          <div className="h-5 w-32 bg-gray-100 rounded mb-3" />
          <div className="h-8 w-24 bg-gray-100 rounded" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-500">
          Couldn't load your billing details. Please refresh to try again.
        </div>
      ) : (
        <>
          {/* Current plan */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1.5">Current plan</p>
                <p className="text-2xl font-bold text-gray-900">{isPro ? 'Pro' : 'Free'}</p>
              </div>
              <PlanBadge isPro={isPro} />
            </div>
            {isPro && subscription?.status && subscription.status !== 'active' && (
              <p className="mt-3 text-sm text-amber-600">
                Subscription status: {subscription.status.replace('_', ' ')}
              </p>
            )}
          </section>

          {/* Pro plan card */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">BudgetBuddy Pro</h2>
              <p className="text-right">
                <span className="text-2xl font-bold text-gray-900">$4.99</span>
                <span className="text-sm text-gray-400"> / month</span>
              </p>
            </div>

            <ul className="space-y-2.5 mb-6">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {actionError && (
              <p className="mb-3 text-sm text-red-500">{actionError}</p>
            )}

            {isPro ? (
              <button
                type="button"
                onClick={handleManage}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                {actionLoading ? 'Opening…' : 'Manage Subscription'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-60"
              >
                {actionLoading ? 'Redirecting…' : 'Upgrade to Pro'}
              </button>
            )}

            <p className="mt-4 text-xs text-gray-400">
              Payments are securely processed by Stripe. BudgetBuddy never sees or stores your card details.
              All features are currently available on the free plan while we finish rolling out Pro.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function PlanBadge({ isPro }) {
  if (isPro) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        Pro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      Free
    </span>
  )
}

function Banner({ tone, title, message, onDismiss }) {
  const styles =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-gray-200 bg-gray-50 text-gray-700'
  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${styles}`}>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
