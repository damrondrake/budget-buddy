const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function MonthPicker({ month, year, onChange }) {
  function prev() {
    if (month === 1) onChange(12, year - 1)
    else onChange(month - 1, year)
  }

  function next() {
    if (month === 12) onChange(1, year + 1)
    else onChange(month + 1, year)
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm font-medium text-gray-700 w-36 text-center">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
