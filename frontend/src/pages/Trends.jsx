import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  Legend,
} from 'recharts'
import { getTrends } from '../api/client'
import { formatMoney } from '../utils/format'

export default function Trends() {
  const [data, setData] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(null)

  useEffect(() => {
    getTrends(6).then((res) => {
      setData(res.data)
      setSelectedIdx(res.data.months.length - 1)
    })
  }, [])

  if (!data) return <p className="text-gray-500">Loading...</p>

  const { months } = data
  const selected = selectedIdx !== null ? months[selectedIdx] : null

  // Gather all unique categories across all months
  const allCats = new Map()
  for (const m of months) {
    for (const c of m.categories) {
      if (!allCats.has(c.category_id)) {
        allCats.set(c.category_id, { name: c.category_name, color: c.color })
      }
    }
  }

  // Build stacked bar data
  const stackedData = months.map((m) => {
    const row = { label: m.label }
    for (const [catId, cat] of allCats) {
      const found = m.categories.find((c) => c.category_id === catId)
      row[cat.name] = found ? found.amount : 0
    }
    return row
  })

  // Biggest movers: compare selected month to the one before it
  const movers = getMovers(months, selectedIdx)

  // Summary stats for selected month
  const saved = selected ? selected.total_income - selected.total_spent : 0
  const savingsRate = selected && selected.total_income > 0
    ? ((saved / selected.total_income) * 100).toFixed(0)
    : 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Spending Trends</h1>

      {/* Monthly Summary Stats */}
      {selected && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Spent" value={formatMoney(selected.total_spent)} color="text-red-500" />
          <StatCard label="Total Income" value={formatMoney(selected.total_income)} color="text-emerald-600" />
          <StatCard
            label="Amount Saved"
            value={formatMoney(saved)}
            color={saved >= 0 ? 'text-indigo-600' : 'text-red-500'}
          />
          <StatCard
            label="Savings Rate"
            value={`${savingsRate}%`}
            color={saved >= 0 ? 'text-indigo-600' : 'text-red-500'}
          />
        </div>
      )}

      {/* Month-over-month spending chart */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending</h2>
        <p className="text-xs text-gray-400 mb-3">Click a bar to select that month</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={months} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => [formatMoney(v), 'Spent']} />
            <Bar
              dataKey="total_spent"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(_, idx) => setSelectedIdx(idx)}
            >
              {months.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={idx === selectedIdx ? '#4f46e5' : '#c7d2fe'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category breakdown stacked chart */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h2>
          {allCats.size > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stackedData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                {[...allCats.entries()].map(([catId, cat]) => (
                  <Bar key={catId} dataKey={cat.name} stackId="a" fill={cat.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No spending data available.
            </div>
          )}
        </section>

        {/* Biggest Movers */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Biggest Movers</h2>
          <p className="text-xs text-gray-400 mb-4">
            {selected ? `${selected.label} vs. previous month` : ''}
          </p>
          {movers.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Not enough data to compare.
            </div>
          ) : (
            <div className="space-y-3">
              {movers.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold shrink-0 ${m.diff > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {m.diff > 0 ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                    {formatMoney(Math.abs(m.diff))}
                  </div>
                  <span className="text-xs text-gray-400 w-24 text-right shrink-0">
                    {m.diff > 0 ? 'up' : 'down'} from {formatMoney(m.prev)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
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

function getMovers(months, selectedIdx) {
  if (selectedIdx === null || selectedIdx === 0) return []
  const current = months[selectedIdx]
  const prev = months[selectedIdx - 1]

  const curMap = new Map()
  for (const c of current.categories) {
    curMap.set(c.category_id, { amount: c.amount, name: c.category_name, color: c.color })
  }
  const prevMap = new Map()
  for (const c of prev.categories) {
    prevMap.set(c.category_id, { amount: c.amount, name: c.category_name, color: c.color })
  }

  const allIds = new Set([...curMap.keys(), ...prevMap.keys()])
  const diffs = []
  for (const id of allIds) {
    const cur = curMap.get(id)
    const prv = prevMap.get(id)
    const curAmt = cur ? cur.amount : 0
    const prvAmt = prv ? prv.amount : 0
    const diff = curAmt - prvAmt
    if (Math.abs(diff) < 0.01) continue
    diffs.push({
      name: (cur || prv).name,
      color: (cur || prv).color,
      diff,
      prev: prvAmt,
    })
  }

  diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  return diffs.slice(0, 6)
}
