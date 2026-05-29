import { useState, useEffect } from 'react'
import {
  getBudgets, upsertBudget, copyBudgets, getCategories, getSummary,
  addBudgetLineItem, deleteBudgetLineItem,
} from '../api/client'
import MonthPicker from '../components/MonthPicker'
import { BudgetsEmptyIcon } from '../components/EmptyState'
import { formatMoney } from '../utils/format'

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [spending, setSpending] = useState({})
  const [formCatId, setFormCatId] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [copyMsg, setCopyMsg] = useState(null)

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
    const categoryId = parseInt(formCatId)
    const label = formLabel.trim()
    const amount = parseFloat(formAmount)
    if (!categoryId || !label || Number.isNaN(amount)) return

    // One budget per category per month: find the existing one or create it.
    // amount_limit is only the fallback total used when there are no line items,
    // so we set it to 0 on create — line items drive the real total from here.
    let budget = budgets.find((b) => b.category_id === categoryId)
    if (!budget) {
      const res = await upsertBudget({
        category_id: categoryId,
        month,
        year,
        amount_limit: 0,
        note: null,
      })
      budget = res.data
    }
    await addBudgetLineItem(budget.id, { label, amount })

    setFormCatId('')
    setFormLabel('')
    setFormAmount('')
    fetchData()
  }

  async function handleDeleteItem(budgetId, itemId) {
    await deleteBudgetLineItem(budgetId, itemId)
    fetchData()
  }

  async function handleCopy() {
    setCopyMsg(null)
    const fromMonth = month === 1 ? 12 : month - 1
    const fromYear = month === 1 ? year - 1 : year
    try {
      const res = await copyBudgets({
        from_month: fromMonth,
        from_year: fromYear,
        to_month: month,
        to_year: year,
      })
      setCopyMsg({ type: 'success', text: res.data.message })
      fetchData()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to copy budgets'
      setCopyMsg({ type: 'error', text: detail })
    }
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

      {/* Budget line-item form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Add a Budget Line Item</h2>
        <p className="text-xs text-gray-500 mb-3">
          Saving adds the line item to that category's budget for the month — same category twice just appends.
        </p>
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
            type="text"
            required
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Label (e.g. Electric)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="number"
            step="0.01"
            required
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="Amount"
            className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            Save
          </button>
        </div>
      </form>

      {/* Copy feedback */}
      {copyMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          copyMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {copyMsg.text}
        </div>
      )}

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center mb-6">
          <div className="flex justify-center mb-3 text-gray-300">
            <BudgetsEmptyIcon />
          </div>
          <p className="text-gray-500 text-sm mb-4">No budgets set for this month — use the form above to add one.</p>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Copy Last Month's Budgets
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {budgets.map((b) => {
            const cat = catMap[b.category_id]
            const spent = spending[b.category_id] || 0
            const items = b.line_items || []
            const itemsTotal = items.reduce((s, li) => s + li.amount, 0)
            const effectiveLimit = items.length > 0 ? itemsTotal : b.amount_limit
            const remaining = effectiveLimit - spent
            const pct = effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 0
            const barColor =
              pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: cat?.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{b.category_name}</p>
                    {b.note && (
                      <p className="text-xs text-gray-400 truncate">{b.note}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-medium text-gray-900">
                      {formatMoney(effectiveLimit)}
                      {items.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({items.length} item{items.length === 1 ? '' : 's'})
                        </span>
                      )}
                    </span>
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
                    Over budget by {formatMoney(spent - effectiveLimit)}
                  </p>
                )}

                {items.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Line Items
                    </p>
                    <div className="divide-y divide-gray-100">
                      {items.map((li) => (
                        <div key={li.id} className="flex items-center gap-2 py-1.5">
                          <span className="flex-1 text-sm text-gray-700 truncate">{li.label}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatMoney(li.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(b.id, li.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete line item"
                            aria-label={`Delete ${li.label}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
