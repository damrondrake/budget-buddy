import { useState, useEffect } from 'react'
import {
  getSavings, createSavingsGoal, deleteSavingsGoal,
  addSavingsAllocation, deleteSavingsAllocation,
  addSavingsTransaction, getSavingsTransactions,
} from '../api/client'
import EmptyState from '../components/EmptyState'
import { formatMoney, formatDate } from '../utils/format'
import { useUsers } from '../context/UsersContext'

const PALETTE = [
  '#22C55E', '#6366F1', '#EC4899', '#F59E0B', '#0EA5E9',
  '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#6B7280',
]

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function pct(saved, target) {
  return target > 0 ? Math.min((saved / target) * 100, 100) : 0
}

export default function Savings() {
  const { users } = useUsers()
  const [goals, setGoals] = useState([])
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PALETTE[0])
  const [allocDrafts, setAllocDrafts] = useState({})
  // Transaction logs keyed by goal id; presence of a key means the log is open.
  const [logs, setLogs] = useState({})
  // The goal currently having a deposit/withdrawal added, plus the form state.
  const [txnGoal, setTxnGoal] = useState(null)
  const [txnForm, setTxnForm] = useState(null)

  useEffect(() => {
    fetchGoals()
  }, [])

  function fetchGoals() {
    getSavings().then((res) => setGoals(res.data))
  }

  async function handleCreateGoal(e) {
    e.preventDefault()
    const name = formName.trim()
    if (!name) return
    await createSavingsGoal({ name, color: formColor })
    setFormName('')
    setFormColor(PALETTE[0])
    fetchGoals()
  }

  async function handleDeleteGoal(goal) {
    if (!window.confirm(`Delete "${goal.name}" and all its allocations and history?`)) return
    await deleteSavingsGoal(goal.id)
    setLogs((prev) => {
      const next = { ...prev }
      delete next[goal.id]
      return next
    })
    fetchGoals()
  }

  function updateAllocDraft(goalId, patch) {
    setAllocDrafts((prev) => ({
      ...prev,
      [goalId]: { ...(prev[goalId] || { label: '', target: '' }), ...patch },
    }))
  }

  async function handleAddAllocation(goalId) {
    const draft = allocDrafts[goalId] || {}
    const label = (draft.label || '').trim()
    const target = parseFloat(draft.target)
    if (!label || Number.isNaN(target)) return
    await addSavingsAllocation(goalId, { label, target_amount: target })
    setAllocDrafts((prev) => ({ ...prev, [goalId]: { label: '', target: '' } }))
    fetchGoals()
  }

  async function handleDeleteAllocation(goalId, allocId) {
    if (!window.confirm('Delete this allocation? Its deposits stay counted toward the goal total.')) return
    await deleteSavingsAllocation(goalId, allocId)
    fetchGoals()
    if (logs[goalId]) refreshLog(goalId)
  }

  function openTxnModal(goal) {
    setTxnForm({
      amount: '',
      type: 'deposit',
      allocation_id: '',
      note: '',
      date: todayStr(),
      paid_by: String(users[0]?.id ?? ''),
    })
    setTxnGoal(goal)
  }

  async function submitTxn(e) {
    e.preventDefault()
    const amount = parseFloat(txnForm.amount)
    if (Number.isNaN(amount) || amount <= 0) return
    const payload = {
      amount,
      type: txnForm.type,
      allocation_id: txnForm.allocation_id ? parseInt(txnForm.allocation_id) : null,
      note: txnForm.note.trim() || null,
      date: txnForm.date,
    }
    if (txnForm.type === 'deposit') {
      payload.paid_by = parseInt(txnForm.paid_by)
    }
    await addSavingsTransaction(txnGoal.id, payload)
    const goalId = txnGoal.id
    setTxnGoal(null)
    setTxnForm(null)
    fetchGoals()
    if (logs[goalId]) refreshLog(goalId)
  }

  function refreshLog(goalId) {
    getSavingsTransactions(goalId).then((res) =>
      setLogs((prev) => ({ ...prev, [goalId]: res.data })),
    )
  }

  function toggleLog(goalId) {
    if (logs[goalId]) {
      setLogs((prev) => {
        const next = { ...prev }
        delete next[goalId]
        return next
      })
    } else {
      refreshLog(goalId)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Savings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track savings goals separately from your monthly budget. Deposits show up in
          spending; withdrawals stay within savings.
        </p>
      </div>

      {/* Create goal form */}
      <form onSubmit={handleCreateGoal} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Create a Savings Goal</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="text"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Goal name (e.g. Christmas Savings)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFormColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  formColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            Create Goal
          </button>
        </div>
      </form>

      {/* Goal cards */}
      {goals.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9" />
            </svg>
          }
          message="No savings goals yet — create one above to start tracking."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const overallPct = pct(goal.total_saved, goal.total_target)
            const draft = allocDrafts[goal.id] || { label: '', target: '' }
            const log = logs[goal.id]
            return (
              <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-5">
                {/* Card header */}
                <div className="flex items-start gap-2 mb-4">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: goal.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 truncate">{goal.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatMoney(goal.total_saved)} saved of {formatMoney(goal.total_target)} target
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(goal)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete goal"
                    aria-label="Delete goal"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Overall progress */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${overallPct}%`, backgroundColor: goal.color }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-4">{Math.round(overallPct)}% of target</p>

                {/* Allocations */}
                <div className="space-y-3">
                  {goal.allocations.map((a) => {
                    const aPct = pct(a.saved, a.target_amount)
                    return (
                      <div key={a.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium truncate">{a.label}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-gray-500 text-xs">
                              {formatMoney(a.saved)} / {formatMoney(a.target_amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAllocation(goal.id, a.id)}
                              className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete allocation"
                              aria-label={`Delete ${a.label}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${aPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {goal.allocations.length === 0 && (
                    <p className="text-xs text-gray-400">No allocations yet — add one below.</p>
                  )}
                </div>

                {/* Add allocation */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={draft.label}
                    onChange={(e) => updateAllocDraft(goal.id, { label: e.target.value })}
                    placeholder="Allocation (e.g. Drake)"
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={draft.target}
                    onChange={(e) => updateAllocDraft(goal.id, { target: e.target.value })}
                    placeholder="Target"
                    className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAllocation(goal.id)}
                    className="px-2.5 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTxnModal(goal)}
                    className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Deposit / Withdraw
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLog(goal.id)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {log ? 'Hide Log' : 'View Log'}
                  </button>
                </div>

                {/* Transaction log */}
                {log && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Transaction Log
                    </p>
                    {log.length === 0 ? (
                      <p className="text-xs text-gray-400">No transactions yet.</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {log.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                            <span className="text-xs text-gray-400 w-16 shrink-0">{formatDate(t.date)}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-700">
                                {t.allocation_label || 'General'}
                              </span>
                              {t.note && (
                                <span className="text-xs text-gray-400 ml-1 truncate">— {t.note}</span>
                              )}
                            </div>
                            <span
                              className={`font-medium shrink-0 ${
                                t.type === 'deposit' ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              {t.type === 'deposit' ? '+' : '-'}{formatMoney(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Deposit / Withdraw modal */}
      {txnGoal && txnForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { setTxnGoal(null); setTxnForm(null) }}
        >
          <form
            onSubmit={submitTxn}
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {txnGoal.name} — Deposit / Withdraw
            </h3>

            <div className="space-y-3">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {['deposit', 'withdrawal'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTxnForm((f) => ({ ...f, type }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      txnForm.type === type
                        ? type === 'deposit'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <input
                type="number"
                step="0.01"
                required
                value={txnForm.amount}
                onChange={(e) => setTxnForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />

              <select
                value={txnForm.allocation_id}
                onChange={(e) => setTxnForm((f) => ({ ...f, allocation_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">General (no allocation)</option>
                {txnGoal.allocations.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>

              {txnForm.type === 'deposit' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Paid by</label>
                  <select
                    value={txnForm.paid_by}
                    onChange={(e) => setTxnForm((f) => ({ ...f, paid_by: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Deposits are recorded as a Savings transaction in your spending.
                  </p>
                </div>
              )}

              <input
                type="date"
                required
                value={txnForm.date}
                onChange={(e) => setTxnForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />

              <input
                type="text"
                value={txnForm.note}
                onChange={(e) => setTxnForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Note (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => { setTxnGoal(null); setTxnForm(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
