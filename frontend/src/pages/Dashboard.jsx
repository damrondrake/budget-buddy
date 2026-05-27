import { useState, useEffect } from 'react'
import { getSummary } from '../api/client'

export default function Dashboard() {
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    getSummary(month, year).then((res) => setSummary(res.data))
  }, [month, year])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Income" value={`$${summary.total_income.toLocaleString()}`} color="text-emerald-600" />
          <StatCard label="Total Spent" value={`$${summary.total_spent.toLocaleString()}`} color="text-red-500" />
          <StatCard label="Remaining" value={`$${summary.remaining.toLocaleString()}`} color="text-indigo-600" />
        </div>
      ) : (
        <p className="text-gray-500">Loading summary...</p>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
