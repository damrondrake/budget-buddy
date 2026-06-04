import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  updateUser, getCategories, createCategory, deleteCategory, invitePartner, deleteAccount,
  getStartingBalance, setStartingBalance, deleteStartingBalance,
} from '../api/client'
import { useUsers } from '../context/UsersContext'
import { useAuth } from '../context/AuthContext'
import IconButton from '../components/ui/IconButton'
import { formatMoney } from '../utils/format'

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function Settings() {
  const { users, refreshUsers } = useUsers()
  const { account, logout } = useAuth()
  const navigate = useNavigate()
  const [userNames, setUserNames] = useState({})
  const [userMsg, setUserMsg] = useState(null)
  const [categories, setCategories] = useState([])
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState('#6366F1')
  const [catMsg, setCatMsg] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState(null)
  const [inviting, setInviting] = useState(false)
  // Account deletion (GDPR/CCPA right to erasure)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  // Starting balance
  const [sbAmount, setSbAmount] = useState('')
  const [sbDate, setSbDate] = useState(todayStr())
  const [sbExisting, setSbExisting] = useState(null)
  const [sbMsg, setSbMsg] = useState(null)
  const [savingSb, setSavingSb] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchStartingBalance()
  }, [])

  useEffect(() => {
    const names = {}
    for (const u of users) names[u.id] = u.name
    setUserNames(names)
  }, [users])

  function fetchCategories() {
    getCategories().then((res) => setCategories(res.data))
  }

  function fetchStartingBalance() {
    getStartingBalance().then((res) => {
      const sb = res.data
      setSbExisting(sb)
      if (sb) {
        setSbAmount(String(sb.amount))
        setSbDate(sb.date)
      }
    }).catch(() => {})
  }

  async function handleSaveStartingBalance(e) {
    e.preventDefault()
    setSbMsg(null)
    const amount = parseFloat(sbAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      setSbMsg({ type: 'error', text: 'Enter an amount greater than 0.' })
      return
    }
    setSavingSb(true)
    try {
      const res = await setStartingBalance({ amount, date: sbDate })
      setSbExisting(res.data)
      setSbMsg({ type: 'success', text: 'Starting balance saved.' })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to save starting balance.'
      setSbMsg({ type: 'error', text: detail })
    } finally {
      setSavingSb(false)
    }
  }

  async function handleRemoveStartingBalance() {
    if (!window.confirm('Remove your starting balance? It will no longer count toward your monthly and cumulative totals.')) return
    setSbMsg(null)
    try {
      await deleteStartingBalance()
      setSbExisting(null)
      setSbAmount('')
      setSbDate(todayStr())
      setSbMsg({ type: 'success', text: 'Starting balance removed.' })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to remove starting balance.'
      setSbMsg({ type: 'error', text: detail })
    }
  }

  async function handleSaveUsers(e) {
    e.preventDefault()
    setUserMsg(null)
    try {
      for (const u of users) {
        if (userNames[u.id] !== u.name) {
          await updateUser(u.id, { name: userNames[u.id] })
        }
      }
      setUserMsg({ type: 'success', text: 'Names updated successfully.' })
      refreshUsers()
    } catch {
      setUserMsg({ type: 'error', text: 'Failed to update names.' })
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteMsg(null)
    setInviting(true)
    try {
      const res = await invitePartner(inviteEmail)
      const debug = res.data?.debug_token
      setInviteMsg({
        type: 'success',
        text: res.data?.message || `Invite sent to ${inviteEmail}.`,
        link: debug ? `/accept-invite?token=${debug}` : null,
      })
      setInviteEmail('')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to send invite.'
      setInviteMsg({ type: 'error', text: detail })
    } finally {
      setInviting(false)
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    setCatMsg(null)
    try {
      await createCategory({ name: catName, color: catColor })
      setCatName('')
      setCatColor('#6366F1')
      setCatMsg({ type: 'success', text: `Category "${catName}" added.` })
      fetchCategories()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to add category.'
      setCatMsg({ type: 'error', text: detail })
    }
  }

  function openDeleteModal() {
    setDeleteConfirmText('')
    setDeleteError(null)
    setShowDeleteModal(true)
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteAccount()
      // Clear the local session and send the user to a fresh sign-in screen.
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to delete your account. Please try again.'
      setDeleteError(detail)
      setDeleting(false)
    }
  }

  async function handleDeleteCategory(cat) {
    setCatMsg(null)
    if (!window.confirm(`Delete the "${cat.name}" category? This cannot be undone.`)) return
    try {
      await deleteCategory(cat.id)
      setCatMsg({ type: 'success', text: `Category "${cat.name}" deleted.` })
      fetchCategories()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to delete category.'
      setCatMsg({ type: 'error', text: detail })
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* User Names */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Names</h2>
        {userMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            userMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {userMsg.text}
          </div>
        )}
        <form onSubmit={handleSaveUsers} className="space-y-3">
          {users.map((u, idx) => (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-500 w-20 shrink-0">
                Person {idx + 1}
              </label>
              <input
                type="text"
                required
                value={userNames[u.id] || ''}
                onChange={(e) => setUserNames({ ...userNames, [u.id]: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
              />
            </div>
          ))}
          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Save Names
          </button>
        </form>
      </section>

      {/* Starting Balance */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900">Starting Balance</h2>
          {sbExisting && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Set · {formatMoney(sbExisting.amount)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Enter the amount you already had in your account on a specific date. This will be added as a
          one-time starting balance and will flow into your monthly and cumulative totals automatically.
        </p>
        {sbMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            sbMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {sbMsg.text}
          </div>
        )}
        <form onSubmit={handleSaveStartingBalance} className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={sbAmount}
            onChange={(e) => setSbAmount(e.target.value)}
            placeholder="Amount"
            className="w-full sm:w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          />
          <input
            type="date"
            required
            value={sbDate}
            onChange={(e) => setSbDate(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          />
          <button
            type="submit"
            disabled={savingSb}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0 disabled:bg-emerald-400"
          >
            {savingSb ? 'Saving...' : sbExisting ? 'Update' : 'Save'}
          </button>
        </form>
        {sbExisting && (
          <button
            type="button"
            onClick={handleRemoveStartingBalance}
            className="mt-3 inline-flex items-center min-h-[44px] text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Remove Starting Balance
          </button>
        )}
      </section>

      {/* Invite Partner */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900">Invite Partner</h2>
          {account?.member_count > 1 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Shared · {account.member_count} people
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Invite someone to share this account. They'll see the same transactions, budgets, income, and savings.
        </p>
        {inviteMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            inviteMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {inviteMsg.text}
            {inviteMsg.link && (
              <div className="mt-1 text-xs text-amber-700">
                Dev mode (no email configured). Invite link:{' '}
                <a href={inviteMsg.link} className="font-medium underline break-all">{inviteMsg.link}</a>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="partner@example.com"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          />
          <button
            type="submit"
            disabled={inviting}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0 disabled:bg-emerald-400"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </section>

      {/* Categories */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
        {catMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            catMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {catMsg.text}
          </div>
        )}

        {/* Add category form */}
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3 mb-5 pb-5 border-b border-gray-100">
          <input
            type="text"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={catColor}
              onChange={(e) => setCatColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <span className="text-xs text-gray-400">{catColor}</span>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
          >
            Add Category
          </button>
        </form>

        {/* Category list */}
        <div className="divide-y divide-gray-100">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-3">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="flex-1 text-sm font-medium text-gray-900">{c.name}</span>
              <span className="text-xs text-gray-400">{c.color}</span>
              <IconButton
                variant="danger"
                onClick={() => handleDeleteCategory(c)}
                title="Delete category"
                aria-label={`Delete ${c.name} category`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </IconButton>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone — account deletion (GDPR/CCPA right to erasure) */}
      <section className="bg-white rounded-xl border border-red-200 p-5 mt-6">
        <h2 className="text-lg font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and everything in it — transactions, budgets, income,
          savings, and categories. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={openDeleteModal}
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete My Account
        </button>
      </section>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete your account?</h3>
            <p className="text-sm text-gray-600 mb-3">
              This will <span className="font-semibold text-gray-900">permanently delete</span> your
              account{account?.member_count > 1 ? ' and all data shared on it' : ''} — including every
              transaction, budget, income entry, savings goal, and category. This action{' '}
              <span className="font-semibold text-red-600">cannot be undone</span> and your data{' '}
              <span className="font-semibold text-red-600">cannot be recovered</span>.
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Type <span className="font-mono font-semibold text-gray-900">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#f3f3f5] focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white outline-none mb-4"
            />
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
