import { useState, useEffect } from 'react'
import { getIncome, createIncome, updateIncome, deleteIncome } from '../api/client'
import MonthPicker from '../components/MonthPicker'
import IconButton from '../components/ui/IconButton'
import EmptyState, { IncomeEmptyIcon } from '../components/EmptyState'
import PageError from '../components/PageError'
import { ListRowsSkeleton } from '../components/Skeletons'
import DraftRestored from '../components/DraftRestored'
import { formatMoney } from '../utils/format'
import { useUsers } from '../context/UsersContext'
import useDraft from '../hooks/useDraft'
import usePolling from '../hooks/usePolling'

export default function Income() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [income, setIncome] = useState([])
  const [formAmount, setFormAmount] = useState('')
  const [formSource, setFormSource] = useState('')
  const [formUser, setFormUser] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const { users } = useUsers()
  // Persisted "Add Income" draft (amount + source + user).
  const incomeDraft = useDraft('draft_income', null)

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  useEffect(() => {
    fetchIncome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  // Auto-refresh income in the background so shared-account changes show up.
  usePolling(() => fetchIncome(true))

  useEffect(() => {
    if (!formUser && users.length > 0) {
      setFormUser(users[0].id)
    }
  }, [users, formUser])

  // Restore a saved draft once on mount.
  useEffect(() => {
    const saved = incomeDraft.load()
    if (saved) {
      if (saved.amount != null) setFormAmount(saved.amount)
      if (saved.source != null) setFormSource(saved.source)
      if (saved.user) setFormUser(saved.user)
      setDraftRestored(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist as the user types (add mode only — never while editing an entry).
  useEffect(() => {
    if (editingId) return
    const hasContent = String(formAmount).trim() !== '' || String(formSource).trim() !== ''
    if (hasContent) incomeDraft.save({ amount: formAmount, source: formSource, user: formUser })
    else incomeDraft.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAmount, formSource, formUser, editingId])

  // `silent` skips the loading skeleton — used by background polling.
  function fetchIncome(silent = false) {
    if (!silent) {
      setLoading(true)
      setError(false)
    }
    getIncome({ month, year })
      .then((res) => setIncome(res.data))
      .catch(() => { if (!silent) setError(true) })
      .finally(() => { if (!silent) setLoading(false) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const amount = parseFloat(formAmount)
    const userId = parseInt(formUser)
    if (editingId) {
      await updateIncome(editingId, {
        amount,
        source: formSource,
        user_id: userId,
      })
    } else {
      await createIncome({
        amount,
        source: formSource,
        user_id: userId,
        month,
        year,
      })
    }
    resetForm()
    fetchIncome()
  }

  function resetForm() {
    setFormAmount('')
    setFormSource('')
    setEditingId(null)
    if (users.length > 0) setFormUser(users[0].id)
    incomeDraft.clear()
    setDraftRestored(false)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setFormAmount(entry.amount)
    setFormSource(entry.source)
    setFormUser(entry.user_id)
    setDraftRestored(false)
  }

  function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this income entry?')) return
    deleteIncome(id).then(() => fetchIncome())
  }

  const total = income.reduce((sum, i) => sum + i.amount, 0)
  const perUser = users.map((u) => ({
    id: u.id,
    name: u.name,
    total: income.filter((i) => i.user_id === u.id).reduce((sum, i) => sum + i.amount, 0),
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {/* Summary cards — static column classes so Tailwind keeps them in the
          build (dynamic `grid-cols-${n}` strings get purged and never apply). */}
      <div className={`grid grid-cols-1 ${
        { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[1 + perUser.length] || 'sm:grid-cols-3'
      } gap-4 mb-6`}>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Income</p>
          <p className="text-2xl font-bold text-emerald-600">{formatMoney(total)}</p>
        </div>
        {perUser.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">{u.name}</p>
            <p className="text-2xl font-bold text-gray-900">{formatMoney(u.total)}</p>
          </div>
        ))}
      </div>

      {/* Add/edit income form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Income' : 'Add Income'}
          </h2>
          <DraftRestored show={!editingId && draftRestored} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            step="0.01"
            required
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="Amount"
            className="w-full sm:w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          />
          <input
            type="text"
            required
            value={formSource}
            onChange={(e) => setFormSource(e.target.value)}
            placeholder="Source (e.g. Paycheck)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          />
          <select
            value={formUser}
            onChange={(e) => setFormUser(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
          >
            {editingId ? 'Save' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Income list */}
      {loading ? (
        <ListRowsSkeleton rows={5} />
      ) : error ? (
        <PageError onRetry={fetchIncome} />
      ) : income.length === 0 ? (
        <EmptyState
          icon={<IncomeEmptyIcon />}
          message="No income entries this month — use the form above to add one."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {income.map((i) => {
            const isStartingBalance = i.type === 'starting_balance'
            return (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <span className="truncate">{i.source}</span>
                    {isStartingBalance && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium shrink-0">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Starting Balance
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{i.user_name}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 shrink-0">
                  {formatMoney(i.amount)}
                </span>
                {isStartingBalance ? (
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 text-gray-300 shrink-0"
                    title="Locked — manage your starting balance in Settings"
                    aria-label="Starting balance is locked; manage it in Settings"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                ) : (
                  <div className="flex shrink-0">
                    <IconButton variant="edit" onClick={() => startEdit(i)} title="Edit" aria-label="Edit income">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </IconButton>
                    <IconButton variant="danger" onClick={() => handleDelete(i.id)} title="Delete" aria-label="Delete income">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </IconButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
