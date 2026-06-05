import { useState, useEffect } from 'react'
import {
  getSharedGoals, createSharedGoal, updateSharedGoal, deleteSharedGoal,
  contributeToGoal, getGoalContributions, deleteGoalContribution,
} from '../api/client'
import { CardsSkeleton } from '../components/Skeletons'
import PageError from '../components/PageError'
import IconButton from '../components/ui/IconButton'
import { formatMoney, formatDate } from '../utils/format'
import { useUsers } from '../context/UsersContext'
import usePolling from '../hooks/usePolling'

const PALETTE = [
  '#6366F1', '#22C55E', '#EC4899', '#F59E0B', '#0EA5E9',
  '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#6B7280',
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function emptyGoalForm() {
  return { name: '', description: '', target_amount: '', target_date: '', color: PALETTE[0] }
}

// Turn a target date into a friendly countdown, or flag it as past due.
function countdown(targetDate) {
  if (!targetDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate + 'T00:00:00')
  const diffDays = Math.round((target - today) / 86400000)
  if (diffDays < 0) return { pastDue: true, text: null }
  if (diffDays === 0) return { pastDue: false, text: 'Due today' }
  if (diffDays < 31) return { pastDue: false, text: `${diffDays} day${diffDays === 1 ? '' : 's'} left` }
  const months = Math.round(diffDays / 30.44)
  return { pastDue: false, text: `${months} month${months === 1 ? '' : 's'} left` }
}

export default function Goals() {
  const { users } = useUsers()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Create form
  const [createForm, setCreateForm] = useState(emptyGoalForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Contribution modal (per goal)
  const [contribGoal, setContribGoal] = useState(null)
  const [contribForm, setContribForm] = useState({ amount: '', user_id: '', note: '', date: todayStr() })
  const [contribSubmitting, setContribSubmitting] = useState(false)
  const [contribError, setContribError] = useState(null)

  // Edit modal (per goal)
  const [editGoal, setEditGoal] = useState(null)
  const [editForm, setEditForm] = useState(emptyGoalForm)
  const [editError, setEditError] = useState(null)

  // History toggles + cache
  const [historyOpen, setHistoryOpen] = useState({})
  const [historyData, setHistoryData] = useState({})

  function fetchGoals(silent = false) {
    if (!silent) {
      setLoading(true)
      setError(false)
    }
    getSharedGoals()
      .then((res) => setGoals(res.data))
      .catch(() => { if (!silent) setError(true) })
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  // Keep goals fresh so a partner's contributions appear without a reload.
  usePolling(() => fetchGoals(true))

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError(null)
    const amount = parseFloat(createForm.target_amount)
    if (!createForm.name.trim()) {
      setCreateError('Give your goal a name.')
      return
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setCreateError('Enter a target amount greater than 0.')
      return
    }
    setCreating(true)
    try {
      await createSharedGoal({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        target_amount: amount,
        target_date: createForm.target_date || null,
        color: createForm.color,
      })
      setCreateForm(emptyGoalForm())
      fetchGoals()
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create goal.')
    } finally {
      setCreating(false)
    }
  }

  function openContribute(goal) {
    setContribError(null)
    setContribForm({ amount: '', user_id: String(users[0]?.id ?? ''), note: '', date: todayStr() })
    setContribGoal(goal)
  }

  async function handleContribute(e) {
    e.preventDefault()
    setContribError(null)
    const amount = parseFloat(contribForm.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setContribError('Enter an amount greater than 0.')
      return
    }
    if (!contribForm.user_id) {
      setContribError('Choose who contributed.')
      return
    }
    setContribSubmitting(true)
    try {
      await contributeToGoal(contribGoal.id, {
        user_id: parseInt(contribForm.user_id),
        amount,
        note: contribForm.note.trim() || null,
        date: contribForm.date,
      })
      setContribGoal(null)
      fetchGoals()
      if (historyOpen[contribGoal.id]) refreshHistory(contribGoal.id)
    } catch (err) {
      setContribError(err.response?.data?.detail || 'Failed to add contribution.')
    } finally {
      setContribSubmitting(false)
    }
  }

  function openEdit(goal) {
    setEditError(null)
    setEditForm({
      name: goal.name,
      description: goal.description || '',
      target_amount: String(goal.target_amount),
      target_date: goal.target_date || '',
      color: goal.color,
    })
    setEditGoal(goal)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setEditError(null)
    const amount = parseFloat(editForm.target_amount)
    if (!editForm.name.trim()) {
      setEditError('Give your goal a name.')
      return
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setEditError('Enter a target amount greater than 0.')
      return
    }
    try {
      await updateSharedGoal(editGoal.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        target_amount: amount,
        target_date: editForm.target_date || null,
        color: editForm.color,
      })
      setEditGoal(null)
      fetchGoals()
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to save goal.')
    }
  }

  async function handleDeleteGoal(goal) {
    if (!window.confirm(`Delete "${goal.name}" and all its contributions? This cannot be undone.`)) return
    await deleteSharedGoal(goal.id)
    fetchGoals()
  }

  function refreshHistory(goalId) {
    getGoalContributions(goalId)
      .then((res) => setHistoryData((prev) => ({ ...prev, [goalId]: res.data })))
      .catch(() => {})
  }

  function toggleHistory(goalId) {
    const willOpen = !historyOpen[goalId]
    setHistoryOpen((prev) => ({ ...prev, [goalId]: willOpen }))
    if (willOpen) refreshHistory(goalId)
  }

  async function handleDeleteContribution(goalId, contribId) {
    if (!window.confirm('Remove this contribution?')) return
    await deleteGoalContribution(goalId, contribId)
    refreshHistory(goalId)
    fetchGoals()
  }

  const totalContributed = goals.reduce((s, g) => s + g.total_contributed, 0)
  const totalRemaining = goals.reduce((s, g) => s + g.remaining, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <p className="text-sm text-gray-500 mt-1">Shared financial targets you and your partner work toward together.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Goals" value={goals.length} color="text-gray-900" />
        <SummaryCard label="Total Contributed" value={formatMoney(totalContributed)} color="text-emerald-600" />
        <SummaryCard label="Total Remaining" value={formatMoney(totalRemaining)} color="text-gray-900" />
      </div>

      {/* Create form */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create a Shared Goal</h2>
        {createError && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{createError}</div>
        )}
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. House down payment"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={createForm.target_amount}
                onChange={(e) => setCreateForm({ ...createForm, target_amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="What are you saving for?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Date <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="date"
                value={createForm.target_date}
                onChange={(e) => setCreateForm({ ...createForm, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <ColorPicker value={createForm.color} onChange={(c) => setCreateForm({ ...createForm, color: c })} />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
          >
            {creating ? 'Creating...' : 'Create Goal'}
          </button>
        </form>
      </section>

      {/* Goal list */}
      {loading ? (
        <CardsSkeleton />
      ) : error ? (
        <PageError onRetry={fetchGoals} />
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500 text-sm">No shared goals yet — create your first one above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              historyOpen={!!historyOpen[goal.id]}
              history={historyData[goal.id] || []}
              onContribute={() => openContribute(goal)}
              onEdit={() => openEdit(goal)}
              onDelete={() => handleDeleteGoal(goal)}
              onToggleHistory={() => toggleHistory(goal.id)}
              onDeleteContribution={(contribId) => handleDeleteContribution(goal.id, contribId)}
            />
          ))}
        </div>
      )}

      {/* Contribution modal */}
      {contribGoal && (
        <Modal title={`Add Contribution — ${contribGoal.name}`} onClose={() => !contribSubmitting && setContribGoal(null)}>
          <form onSubmit={handleContribute} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  value={contribForm.amount}
                  onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Who</label>
                <select
                  value={contribForm.user_id}
                  onChange={(e) => setContribForm({ ...contribForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={contribForm.date}
                onChange={(e) => setContribForm({ ...contribForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={contribForm.note}
                onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })}
                placeholder="e.g. Tax refund"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
            {contribError && <p className="text-sm text-red-600">{contribError}</p>}
            <ModalActions
              onCancel={() => setContribGoal(null)}
              submitLabel={contribSubmitting ? 'Saving...' : 'Add Contribution'}
              disabled={contribSubmitting}
            />
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editGoal && (
        <Modal title="Edit Goal" onClose={() => setEditGoal(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editForm.target_amount}
                  onChange={(e) => setEditForm({ ...editForm, target_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                <input
                  type="date"
                  value={editForm.target_date}
                  onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <ColorPicker value={editForm.color} onChange={(c) => setEditForm({ ...editForm, color: c })} />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <ModalActions onCancel={() => setEditGoal(null)} submitLabel="Save Changes" />
          </form>
        </Modal>
      )}
    </div>
  )
}

function GoalCard({ goal, historyOpen, history, onContribute, onEdit, onDelete, onToggleHistory, onDeleteContribution }) {
  const cd = countdown(goal.target_date)
  const pastDue = cd?.pastDue && !goal.is_complete
  const contributors = goal.by_user.filter((u) => u.amount > 0)

  return (
    <section className={`bg-white rounded-xl border shadow-sm p-5 ${goal.is_complete ? 'border-emerald-300' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-3.5 h-3.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: goal.color }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
              {goal.is_complete && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Complete 🎉
                </span>
              )}
              {pastDue && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  Past due
                </span>
              )}
            </div>
            {goal.description && <p className="text-sm text-gray-500 mt-0.5">{goal.description}</p>}
          </div>
        </div>
        <div className="flex shrink-0">
          <IconButton variant="edit" onClick={onEdit} title="Edit goal" aria-label="Edit goal">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </IconButton>
          <IconButton variant="danger" onClick={onDelete} title="Delete goal" aria-label="Delete goal">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xl font-bold tracking-tight text-gray-900">{formatMoney(goal.total_contributed)}</span>
        <span className="text-sm text-gray-400">of {formatMoney(goal.target_amount)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
        <div
          className="h-3.5 rounded-full transition-all duration-500"
          style={{ width: `${goal.percent_complete}%`, backgroundColor: goal.is_complete ? '#22C55E' : goal.color }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-sm">
        <span className="font-medium text-gray-700">{goal.percent_complete}% complete</span>
        <span className="text-gray-500">{formatMoney(goal.remaining)} remaining</span>
      </div>

      {/* Target date countdown */}
      {goal.target_date && (
        <p className={`text-xs mt-2 ${pastDue ? 'text-amber-600' : 'text-gray-400'}`}>
          Target: {formatDate(goal.target_date)}
          {cd?.text && !pastDue && <span className="text-gray-500"> · {cd.text}</span>}
        </p>
      )}

      {/* Per-user breakdown */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {contributors.length === 0 ? (
          <span className="text-gray-400">No contributions yet.</span>
        ) : (
          contributors.map((u) => (
            <span key={u.user_id} className="text-gray-700">
              <span className="font-medium">{u.user_name}:</span> {formatMoney(u.amount)}
            </span>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onContribute}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Contribution
        </button>
        <button
          type="button"
          onClick={onToggleHistory}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          {historyOpen ? 'Hide History' : 'View History'}
          <svg className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* History */}
      {historyOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No contributions recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.user_name} contributed {formatMoney(c.amount)}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatDate(c.date)}{c.note ? ` · ${c.note}` : ''}
                    </p>
                  </div>
                  <IconButton
                    variant="danger"
                    onClick={() => onDeleteContribution(c.id)}
                    title="Remove contribution"
                    aria-label="Remove contribution"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1.5">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Select color ${c}`}
          className={`w-7 h-7 rounded-full transition-transform ${value === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer p-0.5"
        aria-label="Custom color"
      />
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onCancel, submitLabel, disabled }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
      >
        {submitLabel}
      </button>
    </div>
  )
}
