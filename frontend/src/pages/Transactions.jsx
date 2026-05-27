import { useState, useEffect } from 'react'
import { getTransactions } from '../api/client'

export default function Transactions() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    getTransactions({ month, year }).then((res) => setTransactions(res.data))
  }, [month, year])

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
            <div key={t.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{t.note || t.category_name}</p>
                <p className="text-sm text-gray-500">
                  {t.category_name} &middot; {t.paid_by_name} {t.is_split && '(split)'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">${t.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{t.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
