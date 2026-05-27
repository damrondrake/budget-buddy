import { useState, useEffect } from 'react'
import { getTransactions, deleteTransaction } from '../api/client'

export default function Transactions() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])

  function fetchTransactions() {
    getTransactions({ month, year }).then((res) => setTransactions(res.data))
  }

  useEffect(() => {
    fetchTransactions()
  }, [month, year])

  function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    deleteTransaction(id).then(() => fetchTransactions())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <span className="text-sm text-gray-500">{transactions.length} entries</span>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No transactions yet. Add one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{t.note || t.category_name}</p>
                <p className="text-sm text-gray-500">
                  {t.category_name} &middot; {t.paid_by_name} {t.is_split && '(split)'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900">${t.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{t.date}</p>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Delete transaction"
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
