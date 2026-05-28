import { useState, useEffect } from 'react'
import { updateUser, getCategories, createCategory, deleteCategory } from '../api/client'
import { useUsers } from '../context/UsersContext'

export default function Settings() {
  const { users, refreshUsers } = useUsers()
  const [userNames, setUserNames] = useState({})
  const [userMsg, setUserMsg] = useState(null)
  const [categories, setCategories] = useState([])
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState('#6366F1')
  const [catMsg, setCatMsg] = useState(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    const names = {}
    for (const u of users) names[u.id] = u.name
    setUserNames(names)
  }, [users])

  function fetchCategories() {
    getCategories().then((res) => setCategories(res.data))
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
          {users.map((u) => (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-500 w-20 shrink-0">
                User {u.id}
              </label>
              <input
                type="text"
                required
                value={userNames[u.id] || ''}
                onChange={(e) => setUserNames({ ...userNames, [u.id]: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          ))}
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Save Names
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
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
              <button
                onClick={() => handleDeleteCategory(c)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Delete category"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
