// In-page error state for when a data fetch fails. Distinct from ErrorBoundary
// (which catches render crashes) — this is the friendly "couldn't load" panel
// with a retry button that re-runs the fetch.
export default function PageError({ message, onRetry }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
      <div className="flex justify-center mb-3 text-red-300">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm font-medium mb-1">Couldn't load this data</p>
      <p className="text-gray-500 text-sm mb-5">
        {message || 'Something went wrong while loading. Please check your connection and try again.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
