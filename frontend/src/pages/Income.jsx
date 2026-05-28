import { useState, useEffect } from 'react'
import { getIncome, createIncome, deleteIncome } from '../api/client'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function Income() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [income, setIncome] = useState([])
  const [formAmount, setFormAmount] = useState('')
  const [formSource, setFormSource] = useState('')
  const [formUser, setFormUser] = useState(1)

  useEffect(() => {
    fetchIncome()
  }, [month, year])

  function fetchIncome() {
    getIncome({ month, year }).then((res) => setIncome(res.data))
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1) }
    else setMonth(month + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await createIncome({
      amount: parseFloat(formAmount),
      source: formSource,
      user_id: parseInt(formUser),
      month,
      year,
    })
    setFormAmount('')
    setFormSource('')
    fetchIncome()
  }

  function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this income entry?')) return
    deleteIncome(id).then(() => fetchIncome())
  }

  const total = income.reduce((sum, i) => sum + i.amount, 0)
  const myTotal = income.filter((i) => i.user_id === 1).reduce((sum, i) => sum + i.amount, 0)
  const partnerTotal = income.filter((i) => i.user_id === 2).reduce((sum, i) => sum + i.amount, 0)

  return (
    <div>
      {/* Header with month picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronLeft />
          </button>
          <span className="text-sm font-medium text-gray-700 w-36 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Income</p>
          <p className="text-2xl font-bold text-emerald-600">${total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Me</p>
          <p className="text-2xl font-bold text-gray-900">${myTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Partner</p>
          <p className="text-2xl font-bold text-gray-900">${partnerTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Add income form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Add Income</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            step="0.01"
            required
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            placeholder="Amount"
            className="w-full sm:w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="text"
            required
            value={formSource}
            onChange={(e) => setFormSource(e.target.value)}
            placeholder="Source (e.g. Paycheck)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <select
            value={formUser}
            onChange={(e) => setFormUser(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value={1}>Me</option>
            <option value={2}>Partner</option>
          </select>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
      </form>

      {/* Income list */}
      {income.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No income entries this month. Use the form above to add one.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {income.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{i.source}</p>
                <p className="text-xs text-gray-400">{i.user_name}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-600 shrink-0">
                ${i.amount.toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(i.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
