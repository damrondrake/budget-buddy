import { useState, useEffect } from 'react'
import { getIncome } from '../api/client'

export default function Income() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [income, setIncome] = useState([])

  useEffect(() => {
    getIncome({ month, year }).then((res) => setIncome(res.data))
  }, [month, year])

  const total = income.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <span className="text-sm font-medium text-emerald-600">
          Total: ${total.toLocaleString()}
        </span>
      </div>

      {income.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No income entries this month. Add one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {income.map((i) => (
            <div key={i.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{i.source}</p>
                <p className="text-sm text-gray-500">{i.user_name}</p>
              </div>
              <p className="font-semibold text-emerald-600">${i.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
