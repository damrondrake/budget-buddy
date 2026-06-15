import { useState, useRef, useEffect } from 'react'

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

// The five scoring rules, kept here so the "how it's calculated" popover stays
// in sync with the labels shown on the card. Display-only — the score itself is
// computed on the backend.
const SCORING_RULES = [
  {
    name: 'Savings Rate',
    detail: '20 pts if you saved 20%+ of your income this month, scaling down to 0 at 0% saved.',
  },
  {
    name: 'Budget Adherence',
    detail: '20 pts if every budgeted category is at or under its limit, scaling down proportionally.',
  },
  {
    name: 'Spending Trend',
    detail: '20 pts if spending is flat or down vs. your 3-month average, scaling to 0 if it’s up 20%+.',
  },
  {
    name: 'Goal Progress',
    detail: '20 pts for active shared goals with a contribution this month, 10 pts with no recent contribution, 0 pts for no goals.',
  },
  {
    name: 'Settle Up',
    detail: '20 pts if your couple’s balance is under $10, 10 pts if under $50, 0 pts at $50+.',
  },
]

export default function HealthScoreCard({ data }) {
  const [expanded, setExpanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef(null)

  // Close the info popover on an outside click or Escape. Only listens while
  // open. Uses mousedown so it fires before the card's onClick toggle.
  useEffect(() => {
    if (!showInfo) return
    function onPointerDown(e) {
      if (infoRef.current && !infoRef.current.contains(e.target)) {
        setShowInfo(false)
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setShowInfo(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showInfo])

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
        <div className="flex items-center gap-1">
          {/* Info popover — explains how the score is calculated. Sits inside the
              card (which is itself a click-to-expand button), so every handler
              here stops propagation to avoid also toggling the breakdown. */}
          <div className="relative" ref={infoRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v) }}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label="How your score is calculated"
              aria-expanded={showInfo}
              title="How your score is calculated"
              className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {showInfo && (
              <div
                role="dialog"
                aria-label="How your score is calculated"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 z-20 w-80 max-w-[calc(100vw-2rem)] cursor-default rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg"
              >
                <h3 className="text-sm font-semibold text-gray-900">How Your Score is Calculated</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Your score is 0–100, made up of 5 categories worth 20 points each.
                </p>
                <ul className="mt-3 space-y-2.5">
                  {SCORING_RULES.map((rule) => (
                    <li key={rule.name} className="text-xs leading-relaxed text-gray-600">
                      <span className="font-semibold text-gray-900">{rule.name}</span>
                      {' — '}{rule.detail}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Letter Grades:</span>{' '}
                    A = 90+, B = 80+, C = 70+, D = 60+, F = below 60
                  </p>
                </div>
              </div>
            )}
          </div>

          <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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
