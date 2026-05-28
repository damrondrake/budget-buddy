import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getSummary, getTransactions } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import EmptyState, { TransactionsEmptyIcon, BudgetsEmptyIcon } from '../components/EmptyState'
import { formatMoney, formatDateShort } from '../utils/format'

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [recentTxns, setRecentTxns] = useState([])

  useEffect(() => {
    getSummary(month, year).then((res) => setSummary(res.data))
    getTransactions({ month, year }).then((res) => setRecentTxns(res.data.slice(0, 5)))
  }, [month, year])

  function getBalanceText(balance) {
    if (!balance) return null
    const me = balance['Me'] || 0
    if (Math.abs(me) < 0.01) return { text: 'All settled up', color: 'text-gray-500' }
    if (me > 0) return { text: `Partner owes you ${formatMoney(me)}`, color: 'text-emerald-600' }
    return { text: `You owe Partner ${formatMoney(Math.abs(me))}`, color: 'text-red-500' }
  }

  const balanceInfo = summary ? getBalanceText(summary.balance_between_users) : null
  const budgeted = summary ? summary.by_category.filter((c) => c.budget_limit) : []

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {!summary ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Income" value={formatMoney(summary.total_income)} color="text-emerald-600" />
            <StatCard label="Total Spent" value={formatMoney(summary.total_spent)} color="text-red-500" />
            <StatCard
              label="Remaining"
              value={formatMoney(summary.remaining)}
              color={summary.remaining >= 0 ? 'text-indigo-600' : 'text-red-500'}
            />
            <StatCard
              label="Split Balance"
              value={balanceInfo.text}
              color={balanceInfo.color}
              small
            />
          </div>

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
                <Link to="/budgets" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  Set up budgets
                </Link>
              </div>
            )}
          </section>

          {/* Two-column layout: chart + recent transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending chart */}
            <section className="bg-white rounded-xl border border-gray-200 p-5">
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
            <section className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <Link to="/transactions" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
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
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3">
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
    </div>
  )
}

function StatCard({ label, value, color, small }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`${small ? 'text-base' : 'text-2xl'} font-bold ${color}`}>{value}</p>
    </div>
  )
}

function BudgetCard({ cat }) {
  const pct = cat.budget_limit > 0 ? (cat.spent / cat.budget_limit) * 100 : 0
  const barColor =
    pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
        <span className="text-sm font-medium text-gray-900">{cat.category_name}</span>
      </div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-lg font-bold text-gray-900">{formatMoney(cat.spent)}</span>
        <span className="text-sm text-gray-400">/ {formatMoney(cat.budget_limit)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {pct >= 100 && (
        <p className="text-xs text-red-500 mt-1 font-medium">
          Over budget by {formatMoney(cat.spent - cat.budget_limit)}
        </p>
      )}
    </div>
  )
}

function getCategoryColor(txn, categories) {
  const match = categories.find((c) => c.category_id === txn.category_id)
  return match ? match.color : '#6B7280'
}
