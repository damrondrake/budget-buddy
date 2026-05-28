import { useState, useEffect } from 'react'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getCategories,
} from '../api/client'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EMPTY_FORM = {
  amount: '',
  category_id: '',
  date: new Date().toISOString().slice(0, 10),
  paid_by: 1,
  is_split: false,
  note: '',
}

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data))
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [month, year])

  function fetchTransactions() {
    getTransactions({ month, year }).then((res) => setTransactions(res.data))
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1) }
    else setMonth(month + 1)
  }

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(t) {
    setEditingId(t.id)
    setForm({
      amount: t.amount,
      category_id: t.category_id,
      date: t.date,
      paid_by: t.paid_by,
      is_split: t.is_split,
      note: t.note || '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      category_id: parseInt(form.category_id),
      paid_by: parseInt(form.paid_by),
    }
    if (editingId) {
      await updateTransaction(editingId, payload)
    } else {
      await createTransaction(payload)
    }
    closeForm()
    fetchTransactions()
  }

  function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    deleteTransaction(id).then(() => fetchTransactions())
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  const filtered = filterCat
    ? transactions.filter((t) => t.category_id === parseInt(filterCat))
    : transactions
  const total = filtered.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-3">
          {/* Month picker */}
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <ChevronLeft />
            </button>
            <span className="text-sm font-medium text-gray-700 w-32 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <ChevronRight />
            </button>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <select
                    value={form.paid_by}
                    onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value={1}>Me</option>
                    <option value={2}>Partner</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_split}
                      onChange={(e) => setForm({ ...form, is_split: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Split expense</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="What was this for?"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Transaction'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="mb-4">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No transactions {filterCat ? 'in this category' : 'yet'}. {!filterCat && 'Add one to get started.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map((t) => {
            const cat = catMap[t.category_id]
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                {/* Date */}
                <span className="text-xs text-gray-400 w-16 shrink-0">
                  {formatDate(t.date)}
                </span>
                {/* Category dot + info */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat?.color || '#6B7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t.note || t.category_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t.category_name} &middot; {t.paid_by_name}{t.is_split ? ' (split)' : ''}
                  </p>
                </div>
                {/* Amount */}
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  ${t.amount.toFixed(2)}
                </span>
                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total */}
      {filtered.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3">
            <span className="text-sm text-gray-500">Total: </span>
            <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ChevronLeft() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
