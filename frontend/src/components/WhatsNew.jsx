// "What's New" modal. Presentational: handed an array of changelog `entries`
// (each { version, title, items }, newest first) and an onDismiss callback.
// Items are grouped under a small version label so it's clear what arrived in
// which update. Dismissing persists last_seen_version in AuthContext.
export default function WhatsNew({ entries, onDismiss }) {
  if (!entries || entries.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 sm:p-7 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
      >
        <h2 id="whats-new-title" className="text-xl font-bold text-gray-900 mb-5">
          🎉 What's New
        </h2>

        <div className="space-y-6 mb-7">
          {entries.map((entry) => (
            <section key={entry.version}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="shrink-0 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  v{entry.version}
                </span>
                <span className="text-sm font-semibold text-gray-800">{entry.title}</span>
              </div>
              <ul className="space-y-2.5">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                    <svg
                      className="w-5 h-5 shrink-0 mt-px text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}
