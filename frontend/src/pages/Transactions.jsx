import { useState, useEffect } from 'react'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getCategories, getRecurring, createRecurring, deleteRecurring, applyRecurring,
} from '../api/client'
import MonthPicker from '../components/MonthPicker'
import IconButton from '../components/ui/IconButton'
import EmptyState, { TransactionsEmptyIcon } from '../components/EmptyState'
import PageError from '../components/PageError'
import { ListRowsSkeleton } from '../components/Skeletons'
import DraftRestored from '../components/DraftRestored'
import { formatMoney, formatDate } from '../utils/format'
import { downloadCsvRows } from '../utils/exportCsv'
import { useUsers } from '../context/UsersContext'
import useDraft from '../hooks/useDraft'

const FREQ_LABEL = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

function emptyForm(users) {
  return {
    amount: '',
    category_id: '',
    date: new Date().toISOString().slice(0, 10),
    paid_by: users[0]?.id ?? '',
    is_split: false,
    note: '',
    make_recurring: false,
    recurring_frequency: 'monthly',
  }
}

function emptyRecurring(users) {
  return {
    amount: '',
    category_id: '',
    paid_by: users[0]?.id ?? '',
    is_split: false,
    day_of_month: '1',
    note: '',
  }
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
  const { users } = useUsers()
  const [form, setForm] = useState(() => emptyForm(users))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Persisted "Add Transaction" modal draft.
  const txnDraft = useDraft('draft_transaction', emptyForm(users))
  const [txnDraftRestored, setTxnDraftRestored] = useState(false)

  // Recurring state
  const [recurring, setRecurring] = useState([])
  const [showRecurring, setShowRecurring] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [recurringForm, setRecurringForm] = useState(() => emptyRecurring(users))
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data))
    fetchRecurring()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [month, year])

  function fetchTransactions() {
    setLoading(true)
    setError(false)
    getTransactions({ month, year })
      .then((res) => setTransactions(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  function fetchRecurring() {
    getRecurring().then((res) => setRecurring(res.data))
  }

  function openAdd() {
    setEditingId(null)
    const saved = txnDraft.load()
    if (saved) {
      setForm({ ...emptyForm(users), ...saved })
      setTxnDraftRestored(true)
    } else {
      setForm(emptyForm(users))
      setTxnDraftRestored(false)
    }
    setShowForm(true)
  }

  // Persist the Add Transaction modal as the user types — never while editing.
  useEffect(() => {
    if (!showForm || editingId) return
    const dirty = form.amount !== '' || (form.note || '') !== '' || form.category_id !== ''
    if (dirty) txnDraft.save(form)
    else txnDraft.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, showForm, editingId])

  function openEdit(t) {
    const rule = t.recurring_id ? recurring.find((r) => r.id === t.recurring_id) : null
    setEditingId(t.id)
    setForm({
      amount: t.amount,
      category_id: t.category_id,
      date: t.date,
      paid_by: t.paid_by,
      is_split: t.is_split,
      note: t.note || '',
      make_recurring: !!t.recurring_id,
      recurring_frequency: rule?.frequency || 'monthly',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  // Cancel/backdrop-dismiss of the Add modal discards the draft (per spec).
  function handleCancel() {
    if (!editingId) {
      txnDraft.clear()
      setTxnDraftRestored(false)
    }
    closeForm()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      category_id: parseInt(form.category_id),
      paid_by: parseInt(form.paid_by),
      make_recurring: form.make_recurring,
      recurring_frequency: form.make_recurring ? form.recurring_frequency : null,
    }
    if (editingId) {
      await updateTransaction(editingId, payload)
    } else {
      await createTransaction(payload)
      txnDraft.clear()
      setTxnDraftRestored(false)
    }
    closeForm()
    fetchTransactions()
    // The save may have created/removed a recurring rule.
    fetchRecurring()
  }

  function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    deleteTransaction(id).then(() => fetchTransactions())
  }

  function handleRemoveRecurringFromTxn(t) {
    if (!t.recurring_id) return
    if (!window.confirm('Remove the recurring rule for this transaction? The transaction itself will be kept.')) return
    deleteRecurring(t.recurring_id).then(() => {
      fetchTransactions()
      fetchRecurring()
    })
  }

  async function handleRecurringSubmit(e) {
    e.preventDefault()
    await createRecurring({
      ...recurringForm,
      amount: parseFloat(recurringForm.amount),
      category_id: parseInt(recurringForm.category_id),
      paid_by: parseInt(recurringForm.paid_by),
      day_of_month: parseInt(recurringForm.day_of_month),
    })
    setRecurringForm(emptyRecurring(users))
    setShowRecurringForm(false)
    fetchRecurring()
  }

  function handleDeleteRecurring(id) {
    if (!window.confirm('Delete this recurring transaction?')) return
    deleteRecurring(id).then(() => fetchRecurring())
  }

  async function handleApplyRecurring() {
    setApplying(true)
    try {
      const res = await applyRecurring({ month, year })
      const count = res.data.length
      if (count === 0) {
        alert('All recurring transactions have already been applied this month.')
      } else {
        fetchTransactions()
      }
    } finally {
      setApplying(false)
    }
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  const recurringById = Object.fromEntries(recurring.map((r) => [r.id, r]))
  const selectedCat = form.category_id ? catMap[parseInt(form.category_id)] : null
  const filtered = filterCat
    ? transactions.filter((t) => t.category_id === parseInt(filterCat))
    : transactions
  const total = filtered.reduce((sum, t) => sum + t.amount, 0)

  // Check which recurring have already been applied this month
  const appliedRecurringIds = new Set(
    transactions.filter((t) => t.recurring_id).map((t) => t.recurring_id)
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
          <button
            onClick={() => {
              const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date))
              let balance = 0
              const fmt = (n) => `$${n.toFixed(2)}`
              const dataRows = sorted.map((t) => {
                balance += t.amount
                return [
                  t.date, t.category_name, t.note || '', t.paid_by_name,
                  t.is_split ? 'Yes' : 'No', fmt(t.amount), fmt(balance),
                ]
              })
              const totalSpent = sorted.reduce((s, t) => s + t.amount, 0)
              const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
              const rows = [
                ['BudgetBuddy'],
                [`${monthLabel} ${year}`],
                [],
                ['Date', 'Category', 'Note', 'Paid By', 'Split', 'Amount', 'Running Balance'],
                ...dataRows,
                ['TOTAL', '', '', '', '', fmt(totalSpent), fmt(balance)],
              ]
              downloadCsvRows(`transactions-${monthLabel}-${year}.csv`, rows)
            }}
            disabled={filtered.length === 0}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Recurring section */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowRecurring(!showRecurring)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-xl"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Recurring Transactions ({recurring.length})
          </span>
          <svg className={`w-4 h-4 transition-transform ${showRecurring ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showRecurring && (
          <div className="border-t border-gray-200 px-4 py-3">
            {/* Apply button */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleApplyRecurring}
                disabled={applying || recurring.length === 0}
                className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {applying ? 'Applying...' : `Apply to ${new Date(year, month - 1).toLocaleString('default', { month: 'short' })} ${year}`}
              </button>
              <button
                onClick={() => { setRecurringForm(emptyRecurring(users)); setShowRecurringForm(true) }}
                className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                + Add Recurring
              </button>
            </div>

            {/* Recurring list */}
            {recurring.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No recurring transactions yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recurring.map((r) => {
                  const cat = catMap[r.category_id]
                  const applied = appliedRecurringIds.has(r.id)
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat?.color || '#6B7280' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                          <span className="truncate">{r.note}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium shrink-0">
                            {FREQ_LABEL[r.frequency] || r.frequency}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {r.category_name} &middot; Day {r.day_of_month} &middot; {r.paid_by_name}{r.is_split ? ' (split)' : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">
                        {formatMoney(r.amount)}
                      </span>
                      {applied && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                          Applied
                        </span>
                      )}
                      <IconButton variant="danger" onClick={() => handleDeleteRecurring(r.id)} title="Delete" aria-label="Delete recurring transaction">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </IconButton>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recurring form */}
            {showRecurringForm && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <form onSubmit={handleRecurringSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={recurringForm.amount}
                        onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Day of Month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={recurringForm.day_of_month}
                        onChange={(e) => setRecurringForm({ ...recurringForm, day_of_month: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select
                      required
                      value={recurringForm.category_id}
                      onChange={(e) => setRecurringForm({ ...recurringForm, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                    <input
                      type="text"
                      required
                      value={recurringForm.note}
                      onChange={(e) => setRecurringForm({ ...recurringForm, note: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                      placeholder="e.g. Netflix, Rent, Spotify"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Paid By</label>
                      <select
                        value={recurringForm.paid_by}
                        onChange={(e) => setRecurringForm({ ...recurringForm, paid_by: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recurringForm.is_split}
                          onChange={(e) => setRecurringForm({ ...recurringForm, is_split: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Split</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Add Recurring
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRecurringForm(false)}
                      className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancel}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <DraftRestored show={!editingId && txnDraftRestored} />
            </div>
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                  {selectedCat && (
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedCat.color }}
                    />
                  )}
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className={`w-full py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none ${selectedCat ? 'pl-8 pr-3' : 'px-3'}`}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <select
                    value={form.paid_by}
                    onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_split}
                      onChange={(e) => setForm({ ...form, is_split: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="What was this for?"
                />
              </div>

              {/* Make this recurring */}
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.make_recurring}
                    onChange={(e) => setForm({ ...form, make_recurring: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Make this recurring</span>
                </label>
                {form.make_recurring && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={form.recurring_frequency}
                      onChange={(e) => setForm({ ...form, recurring_frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      A recurring rule is created from this transaction's category, amount, and details.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Transaction'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Transaction list */}
      {loading ? (
        <ListRowsSkeleton rows={6} />
      ) : error ? (
        <PageError onRetry={fetchTransactions} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<TransactionsEmptyIcon />}
          message={filterCat ? 'No transactions in this category.' : 'No transactions this month — add one to get started.'}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map((t) => {
            const cat = catMap[t.category_id]
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-gray-400 w-20 shrink-0 hidden sm:block">
                  {formatDate(t.date)}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat?.color || '#6B7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t.note || t.category_name}
                    {t.recurring_id && (
                      <span className="ml-2 inline-flex items-center text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-normal">
                        <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {FREQ_LABEL[recurringById[t.recurring_id]?.frequency] || 'Recurring'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    <span className="sm:hidden">{formatDate(t.date)} &middot; </span>
                    {t.category_name} &middot; {t.paid_by_name}{t.is_split ? ' (split)' : ''}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatMoney(t.amount)}
                </span>
                <div className="flex shrink-0">
                  {t.recurring_id && (
                    <IconButton
                      variant="neutral"
                      onClick={() => handleRemoveRecurringFromTxn(t)}
                      title="Remove recurring"
                      aria-label="Remove recurring rule (keeps this transaction)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 9.172a4 4 0 015.656 5.656M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9M3 3l18 18" />
                      </svg>
                    </IconButton>
                  )}
                  <IconButton variant="edit" onClick={() => openEdit(t)} title="Edit" aria-label="Edit transaction">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </IconButton>
                  <IconButton variant="danger" onClick={() => handleDelete(t.id)} title="Delete" aria-label="Delete transaction">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total */}
      {!loading && !error && filtered.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3">
            <span className="text-sm text-gray-500">Total: </span>
            <span className="text-lg font-bold text-gray-900">{formatMoney(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
