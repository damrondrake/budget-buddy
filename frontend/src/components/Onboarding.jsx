import { useState, useEffect, useRef } from 'react'
import { getCumulative, getBudgets, updateUser, invitePartner } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../context/UsersContext'
import BudgetBuddyLogo from './BudgetBuddyLogo'

// Multi-step welcome modal for brand-new accounts. Shows once per account
// (tracked in localStorage), only when the account looks brand new (no spending
// and no budgets yet). Reports its active state up to Layout so the What's New
// modal waits until onboarding is finished.
export default function Onboarding({ onActiveChange }) {
  const { account } = useAuth()
  const { users, refreshUsers } = useUsers()

  const accountId = account?.id
  const storageKey = accountId != null ? `onboarding_complete_${accountId}` : null

  // 'checking' (deciding whether to show) | 'showing' | 'done'.
  const [status, setStatus] = useState(() => {
    if (!storageKey) return 'done'
    return localStorage.getItem(storageKey) ? 'done' : 'checking'
  })
  const [step, setStep] = useState(1)
  const [myName, setMyName] = useState(account?.display_name || '')
  const [partnerName, setPartnerName] = useState('')
  const [savingNames, setSavingNames] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSent, setInviteSent] = useState(false)
  const decidedRef = useRef(false)

  const displayPartner = partnerName.trim() || 'Partner'

  // Keep Layout informed so it can hold back the What's New modal.
  useEffect(() => {
    onActiveChange?.(status !== 'done')
  }, [status, onActiveChange])

  // Brand-new check — only runs when the completion key is absent. Zero all-time
  // spending and zero current-month budgets is our "brand new" signal.
  useEffect(() => {
    if (status !== 'checking' || decidedRef.current || accountId == null) return
    decidedRef.current = true
    const now = new Date()
    Promise.all([
      getCumulative(),
      getBudgets({ month: now.getMonth() + 1, year: now.getFullYear() }),
    ])
      .then(([cumRes, budgetsRes]) => {
        const noSpending = !cumRes.data || cumRes.data.total_spending === 0
        const noBudgets = (budgetsRes.data || []).length === 0
        if (noSpending && noBudgets) {
          setStatus('showing')
        } else {
          // Account is already in use — never onboard, and stop re-checking.
          if (storageKey) localStorage.setItem(storageKey, '1')
          setStatus('done')
        }
      })
      .catch(() => setStatus('done'))
  }, [status, accountId, storageKey])

  function finish() {
    if (storageKey) localStorage.setItem(storageKey, '1')
    setStatus('done')
  }

  async function handleSaveNames() {
    setSavingNames(true)
    try {
      const me = users[0]
      const partner = users[1]
      const finalMy = myName.trim() || me?.name || account?.display_name || 'You'
      const finalPartner = partnerName.trim() || 'Partner'
      const calls = []
      if (me) calls.push(updateUser(me.id, { name: finalMy }))
      if (partner) calls.push(updateUser(partner.id, { name: finalPartner }))
      await Promise.all(calls)
      setMyName(finalMy)
      setPartnerName(finalPartner)
      refreshUsers()
    } catch {
      // Don't trap the user if the save fails — let them continue.
    } finally {
      setSavingNames(false)
      setStep(3)
    }
  }

  async function handleInvite() {
    setInviteError(null)
    if (!partnerEmail.trim()) {
      setInviteError('Enter an email address.')
      return
    }
    setInviting(true)
    try {
      await invitePartner(partnerEmail.trim())
      setInviteSent(true)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Could not send the invite. Please try again.'
      setInviteError(typeof detail === 'string' ? detail : 'Could not send the invite.')
    } finally {
      setInviting(false)
    }
  }

  if (status !== 'showing') return null

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={finish}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to BudgetBuddy"
      >
        {/* Dismiss */}
        <button
          type="button"
          onClick={finish}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <BudgetBuddyLogo variant="stacked" size="lg" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Welcome to BudgetBuddy, {account?.display_name || 'friend'}!
            </h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              BudgetBuddy is built for couples and households. Let's get you set up in 2 quick steps.
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2 — Personalize */}
        {step === 2 && (
          <div>
            <StepLabel current={1} />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Personalize your account</h2>
            <p className="text-sm text-gray-500 mb-5">Tell us who's budgeting together.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What should we call you?</label>
                <input
                  type="text"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What should we call your partner?</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Partner"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveNames}
              disabled={savingNames}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 mt-6 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
            >
              {savingNames ? 'Saving...' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3 — Invite partner */}
        {step === 3 && (
          <div>
            <StepLabel current={2} />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Invite {displayPartner} to BudgetBuddy</h2>
            <p className="text-sm text-gray-500 mb-5">
              Share your account so you can manage your finances together.
            </p>

            {inviteSent ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3.5 flex items-start gap-2.5">
                <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-emerald-800">
                  {displayPartner} has been invited! They'll get an email to join your account.
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
                {inviteError && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
              </div>
            )}

            {inviteSent ? (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 mt-6 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Continue
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={inviting}
                  className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 mt-6 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors"
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 4 — All set */}
        {step === 4 && (
          <div className="text-center">
            <p className="text-4xl mb-2">🎉</p>
            <h2 className="text-xl font-bold text-gray-900 mb-4">You're all set!</h2>

            <ul className="text-left space-y-2.5 mb-7">
              <SummaryItem>
                Account personalized for <span className="font-medium text-gray-900">{myName.trim() || account?.display_name}</span>{' '}
                and <span className="font-medium text-gray-900">{displayPartner}</span>
              </SummaryItem>
              {inviteSent ? (
                <SummaryItem>
                  Invite sent to <span className="font-medium text-gray-900">{partnerEmail.trim()}</span>
                </SummaryItem>
              ) : (
                <SummaryItem muted>
                  You can invite {displayPartner} anytime from Settings
                </SummaryItem>
              )}
              <SummaryItem muted>
                Add your first transaction or set up a budget to get going
              </SummaryItem>
            </ul>

            <button
              type="button"
              onClick={finish}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Start Budgeting
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepLabel({ current }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Step {current} of 2</span>
      <span className={`h-1 w-6 rounded-full ${current >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
      <span className={`h-1 w-6 rounded-full ${current >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
    </div>
  )
}

function SummaryItem({ children, muted }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-gray-600">
      <svg
        className={`w-5 h-5 shrink-0 mt-px ${muted ? 'text-gray-300' : 'text-emerald-500'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={muted ? 'M12 6v12m6-6H6' : 'M5 13l4 4L19 7'} />
      </svg>
      <span>{children}</span>
    </li>
  )
}
