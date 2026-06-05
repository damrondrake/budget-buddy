import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getSummary, getTransactions, getCumulative, getStartingBalance, getSettlements, createSettlement } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import EmptyState, { TransactionsEmptyIcon } from '../components/EmptyState'
import PageError from '../components/PageError'
import SettlementHistory from '../components/SettlementHistory'
import { DashboardSkeleton } from '../components/Skeletons'
import { formatMoney, formatDateShort } from '../utils/format'
import { useUsers } from '../context/UsersContext'
import usePolling from '../hooks/usePolling'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Permanently dismiss the "add a starting balance" first-run banner.
const HIDE_BANNER_KEY = 'budgetbuddy_hide_starting_balance_banner'

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [recentTxns, setRecentTxns] = useState([])
  const [settlements, setSettlements] = useState([])
  const [cumulative, setCumulative] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Settle Up modal
  const [showSettle, setShowSettle] = useState(false)
  const [settleForm, setSettleForm] = useState({ amount: '', date: todayStr(), note: '' })
  const [settling, setSettling] = useState(false)
  const [settleError, setSettleError] = useState(null)
  const [startingBalance, setStartingBalance] = useState(undefined)
  const [bannerDismissed, setBannerDismissed] = useState(
    () => !!localStorage.getItem(HIDE_BANNER_KEY)
  )
  const { users } = useUsers()

  // `silent` skips the loading skeleton — used by background polling so the
  // page refreshes in place without flashing a spinner.
  function load(silent = false) {
    if (!silent) {
      setLoading(true)
      setError(false)
    }
    Promise.all([getSummary(month, year), getTransactions({ month, year }), getSettlements({ month, year })])
      .then(([summaryRes, txnsRes, settleRes]) => {
        setSummary(summaryRes.data)
        setRecentTxns(txnsRes.data.slice(0, 5))
        setSettlements(settleRes.data)
      })
      .catch(() => { if (!silent) setError(true) })
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  // Auto-refresh summary + recent transactions so shared-account changes show
  // up without a manual reload.
  usePolling(() => load(true))

  useEffect(() => {
    getCumulative().then((res) => setCumulative(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (bannerDismissed) return
    getStartingBalance().then((res) => setStartingBalance(res.data)).catch(() => {})
  }, [bannerDismissed])

  function dismissBanner() {
    localStorage.setItem(HIDE_BANNER_KEY, '1')
    setBannerDismissed(true)
  }

  // First-run nudge: only when no starting balance is set and there's been no
  // spending yet (a brand-new account). Cumulative spending > 0 means they've
  // started using the app, so the banner stays hidden.
  const showStartingBalanceBanner =
    !bannerDismissed &&
    startingBalance === null &&
    cumulative !== null &&
    cumulative.total_spending === 0

  function getBalanceText(balance) {
    if (!balance || users.length < 2) return { text: '—', color: 'text-gray-400' }
    const u1 = users[0]
    const u2 = users[1]
    const val = balance[u1.name] || 0
    if (Math.abs(val) < 0.01) return { text: 'All settled up', color: 'text-gray-500' }
    if (val > 0) return { text: `${u2.name} owes ${u1.name} ${formatMoney(val)}`, color: 'text-emerald-600' }
    return { text: `${u1.name} owes ${u2.name} ${formatMoney(Math.abs(val))}`, color: 'text-red-500' }
  }

  // Work out who owes whom (and how much) so we can prefill the Settle Up modal.
  // Returns null when there isn't a two-person account to settle between.
  function getSettleInfo(balance) {
    if (!balance || users.length < 2) return null
    const u1 = users[0]
    const u2 = users[1]
    const val = balance[u1.name] || 0
    if (Math.abs(val) < 0.01) return { settled: true }
    // val > 0 means u2 owes u1; val < 0 means u1 owes u2.
    const [debtor, creditor, amount] =
      val > 0 ? [u2, u1, val] : [u1, u2, Math.abs(val)]
    return { settled: false, debtor, creditor, amount: Math.round(amount * 100) / 100 }
  }

  const settleInfo = summary ? getSettleInfo(summary.balance_between_users) : null

  function openSettle() {
    if (!settleInfo || settleInfo.settled) return
    setSettleError(null)
    setSettleForm({ amount: String(settleInfo.amount), date: todayStr(), note: '' })
    setShowSettle(true)
  }

  async function handleConfirmSettle(e) {
    e.preventDefault()
    setSettleError(null)
    const amount = parseFloat(settleForm.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setSettleError('Enter an amount greater than 0.')
      return
    }
    setSettling(true)
    try {
      await createSettlement({
        paid_by: settleInfo.debtor.id,
        paid_to: settleInfo.creditor.id,
        amount,
        note: settleForm.note || null,
        date: settleForm.date,
      })
      setShowSettle(false)
      load() // refresh balance + settlement history
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to record settlement. Please try again.'
      setSettleError(typeof detail === 'string' ? detail : 'Failed to record settlement.')
    } finally {
      setSettling(false)
    }
  }

  const balanceInfo = summary ? getBalanceText(summary.balance_between_users) : { text: '—', color: 'text-gray-400' }
  const budgeted = summary ? summary.by_category.filter((c) => c.budget_limit) : []

  return (
    <div>
      {/* First-run starting-balance nudge */}
      {showStartingBalanceBanner && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="flex-1 text-sm text-emerald-800">
            Already have money in your account? Add a starting balance in{' '}
            <Link to="/settings" className="font-semibold underline hover:text-emerald-900">Settings</Link>{' '}
            to get an accurate picture of your finances.
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="shrink-0 text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error || !summary ? (
        <PageError onRetry={load} />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total Income" value={formatMoney(summary.total_income)} color="text-emerald-600" />
            <StatCard label="Total Spent" value={formatMoney(summary.total_spent)} color="text-red-500" />
            <StatCard
              label="Remaining"
              value={formatMoney(summary.remaining)}
              color={summary.remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <StatCard
              label="Split Balance"
              value={balanceInfo.text}
              color={balanceInfo.color}
              small
            />
          </div>

          {/* Settle Up — only for two-person accounts */}
          {settleInfo && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Settle Up</p>
                  {settleInfo.settled ? (
                    <p className="text-lg font-bold text-emerald-600">All settled up! 🎉</p>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      {settleInfo.debtor.name} owes {settleInfo.creditor.name}{' '}
                      <span className="text-emerald-600">{formatMoney(settleInfo.amount)}</span>
                    </p>
                  )}
                </div>
                {!settleInfo.settled && (
                  <button
                    type="button"
                    onClick={openSettle}
                    className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Settle Up
                  </button>
                )}
              </div>
              {/* Settlement history for the current month */}
              {settlements.length > 0 && (
                <div className="mt-4">
                  <SettlementHistory settlements={settlements} onChange={() => load()} />
                </div>
              )}
            </div>
          )}

          {/* Cumulative Balance card */}
          {cumulative && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cumulative Balance</p>
                  <p className={`text-2xl font-bold ${cumulative.net_balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatMoney(cumulative.net_balance)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">All-time income minus spending</p>
                </div>
                <div className="text-xs text-gray-500 sm:text-right space-y-1">
                  <p>
                    Lifetime income: <span className="text-emerald-600 font-medium">{formatMoney(cumulative.total_income)}</span>
                  </p>
                  <p>
                    Lifetime spending: <span className="text-red-500 font-medium">{formatMoney(cumulative.total_spending)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Budget Progress */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Progress</h2>
            {budgeted.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgeted.map((cat) => (
                  <BudgetCard key={cat.category_id} cat={cat} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-500 text-sm mb-2">No budgets set for this month.</p>
                <Link to="/budgets" className="inline-flex items-center min-h-[44px] text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                  Set up budgets
                </Link>
              </div>
            )}
          </section>

          {/* Two-column layout: chart + recent transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending chart */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h2>
              {summary.by_category.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={summary.by_category} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="category_name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => [formatMoney(v), 'Spent']} />
                    <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                      {summary.by_category.map((entry) => (
                        <Cell key={entry.category_id} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                  No spending data this month.
                </div>
              )}
            </section>

            {/* Recent transactions */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <Link to="/transactions" className="inline-flex items-center min-h-[44px] text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                  View All
                </Link>
              </div>
              {recentTxns.length === 0 ? (
                <div className="px-5 pb-6 pt-2">
                  <EmptyState
                    icon={<TransactionsEmptyIcon />}
                    message="No transactions this month — add one to get started."
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTxns.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getCategoryColor(t, summary.by_category) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {t.note || t.category_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDateShort(t.date)} &middot; {t.paid_by_name}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatMoney(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* Settle Up modal */}
      {showSettle && settleInfo && !settleInfo.settled && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !settling && setShowSettle(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Settle Up</h2>
            <p className="text-sm text-gray-500 mb-4">
              {settleInfo.debtor.name} owes {settleInfo.creditor.name}{' '}
              <span className="font-semibold text-gray-900">{formatMoney(settleInfo.amount)}</span>.
              Recording this payment will reset the balance.
            </p>
            <form onSubmit={handleConfirmSettle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={settleForm.date}
                  onChange={(e) => setSettleForm({ ...settleForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={settleForm.note}
                  onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
                  placeholder="e.g. Venmo, cash"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
              {settleError && <p className="text-sm text-red-600">{settleError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettle(false)}
                  disabled={settling}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
                >
                  {settling ? 'Saving...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, small }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1.5">{label}</p>
      <p className={`${small ? 'text-base' : 'text-3xl'} font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  )
}

function BudgetCard({ cat }) {
  const pct = cat.budget_limit > 0 ? (cat.spent / cat.budget_limit) * 100 : 0
  const barColor =
    pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
        <span className="text-sm font-medium text-gray-900">{cat.category_name}</span>
      </div>
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-xl font-bold tracking-tight text-gray-900">{formatMoney(cat.spent)}</span>
        <span className="text-sm text-gray-400">/ {formatMoney(cat.budget_limit)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{Math.round(pct)}% used</span>
        {pct >= 100 && (
          <span className="text-xs text-red-500 font-medium">
            Over by {formatMoney(cat.spent - cat.budget_limit)}
          </span>
        )}
      </div>
    </div>
  )
}

function getCategoryColor(txn, categories) {
  const match = categories.find((c) => c.category_id === txn.category_id)
  return match ? match.color : '#6B7280'
}
