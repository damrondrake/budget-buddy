import { useState, useEffect } from 'react'
import { getBudgets, upsertBudget, getCategories, getSummary } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import EmptyState, { BudgetsEmptyIcon } from '../components/EmptyState'
import { formatMoney } from '../utils/format'

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [spending, setSpending] = useState({})
  const [formCatId, setFormCatId] = useState('')
  const [formAmount, setFormAmount] = useState('')

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data))
  }, [])

  useEffect(() => {
    fetchData()
  }, [month, year])

  function fetchData() {
    getBudgets({ month, year }).then((res) => setBudgets(res.data))
    getSummary(month, year).then((res) => {
      const map = {}
      for (const c of res.data.by_category) {
        map[c.category_id] = c.spent
      }
      setSpending(map)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await upsertBudget({
      category_id: parseInt(formCatId),
      month,
      year,
      amount_limit: parseFloat(formAmount),
    })
    setFormCatId('')
    setFormAmount('')
    fetchData()
  }

  const budgetedCatIds = new Set(budgets.map((b) => b.category_id))
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  const unbudgeted = categories.filter((c) => !budgetedCatIds.has(c.id))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {/* Set budget form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Set a Budget</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            required
            value={formCatId}
            onChange={(e) => setFormCatId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            required
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="Amount"
            className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            Save
          </button>
        </div>
      </form>

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <div className="mb-6">
          <EmptyState
            icon={<BudgetsEmptyIcon />}
            message="No budgets set for this month — use the form above to add one."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {budgets.map((b) => {
            const cat = catMap[b.category_id]
            const spent = spending[b.category_id] || 0
            const remaining = b.amount_limit - spent
            const pct = b.amount_limit > 0 ? (spent / b.amount_limit) * 100 : 0
            const barColor =
              pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat?.color || '#6B7280' }}
                  />
                  <span className="text-sm font-semibold text-gray-900">{b.category_name}</span>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-medium text-gray-900">{formatMoney(b.amount_limit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Spent</span>
                    <span className="font-medium text-gray-900">{formatMoney(spent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Remaining</span>
                    <span className={`font-medium ${remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {remaining >= 0 ? formatMoney(remaining) : `-${formatMoney(Math.abs(remaining))}`}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{Math.round(pct)}% used</p>

                {pct >= 100 && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    Over budget by {formatMoney(spent - b.amount_limit)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unbudgeted categories */}
      {unbudgeted.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Unbudgeted Categories</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {unbudgeted.map((c) => {
              const spent = spending[c.id] || 0
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {spent > 0 ? `${formatMoney(spent)} spent` : 'No spending'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
