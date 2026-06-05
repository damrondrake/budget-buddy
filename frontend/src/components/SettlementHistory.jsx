import { useState } from 'react'
import { deleteSettlement } from '../api/client'
import { formatMoney, formatDate } from '../utils/format'
import IconButton from './ui/IconButton'

// Collapsible list of settlement payments for the current month. Shared by the
// Dashboard (compact, collapsed by default) and the Transactions page (kept open
// as part of the audit trail). `onChange` lets the parent re-fetch balances
// after a settlement is removed.
export default function SettlementHistory({ settlements, onChange, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  async function handleDelete(id) {
    if (!window.confirm('Remove this settlement? The split balance will be updated.')) return
    await deleteSettlement(id)
    onChange?.()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2">
          <HandshakeIcon className="w-4 h-4 text-emerald-500" />
          Settlement History ({settlements.length})
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-3">
          {settlements.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No settlements recorded this month.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {settlements.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <HandshakeIcon className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.paid_by_name} paid {s.paid_to_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatDate(s.date)}{s.note ? ` · ${s.note}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">
                    {formatMoney(s.amount)}
                  </span>
                  <IconButton
                    variant="danger"
                    onClick={() => handleDelete(s.id)}
                    title="Remove settlement"
                    aria-label="Remove settlement"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HandshakeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l3-3 2.5 2.5a1.77 1.77 0 002.5-2.5L11 4H7L3 8v5l4 4 1.5-1.5M13 13l2 2a1.41 1.41 0 002-2M15 15l1.5 1.5a1.41 1.41 0 002-2L17 12.5M21 13V8l-3-3" />
    </svg>
  )
}
