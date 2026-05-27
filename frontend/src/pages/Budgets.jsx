import { useState, useEffect } from 'react'
import { getBudgets } from '../api/client'

export default function Budgets() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])

  useEffect(() => {
    getBudgets({ month, year }).then((res) => setBudgets(res.data))
  }, [month, year])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
        <span className="text-sm text-gray-500">
          {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No budgets set for this month. Add one to start tracking.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="font-medium text-gray-900">{b.category_name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${b.amount_limit.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Monthly limit</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
