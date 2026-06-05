import { useState } from 'react'

// Ring/bar color by percentage: green 80+, yellow 60-79, orange 40-59, red <40.
function scoreColor(pct) {
  if (pct >= 80) return '#22C55E'
  if (pct >= 60) return '#EAB308'
  if (pct >= 40) return '#F97316'
  return '#EF4444'
}

const SHORT_LABELS = {
  savings_rate: 'Savings',
  budget_adherence: 'Budget',
  spending_trend: 'Trend',
  goal_progress: 'Goals',
  settle_up: 'Settle',
}

export default function HealthScoreCard({ data }) {
  const [expanded, setExpanded] = useState(false)
  if (!data) return null

  const { score, grade, tip, components } = data
  const color = scoreColor(score)

  // SVG ring geometry.
  const R = 52
  const STROKE = 10
  const C = 2 * Math.PI * R
  const offset = C * (1 - score / 100)

  function toggle() {
    setExpanded((v) => !v)
  }

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
      aria-expanded={expanded}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Financial Health Score</h2>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Score ring */}
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tracking-tight text-gray-900 leading-none">{score}</span>
            <span className="text-sm font-semibold mt-1" style={{ color }}>Grade {grade}</span>
          </div>
        </div>

        {/* Component bars */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-5 gap-2 items-end" style={{ height: 88 }}>
            {components.map((c) => {
              const pct = (c.score / c.max) * 100
              return (
                <div key={c.key} className="flex flex-col items-center gap-1.5 h-full justify-end" title={`${c.name}: ${c.score}/${c.max}`}>
                  <div className="w-full bg-gray-100 rounded-md overflow-hidden flex items-end" style={{ height: 60 }}>
                    <div
                      className="w-full rounded-md"
                      style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: scoreColor(pct), transition: 'height 0.5s ease' }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">{SHORT_LABELS[c.key] || c.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tip */}
      {tip && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-100 px-3.5 py-2.5">
          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-emerald-800">{tip}</p>
        </div>
      )}

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
          {components.map((c) => {
            const pct = (c.score / c.max) * 100
            return (
              <div key={c.key}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  <span className="text-sm text-gray-500">
                    {c.score}<span className="text-gray-400"> / {c.max}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: scoreColor(pct) }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{c.description}</p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
