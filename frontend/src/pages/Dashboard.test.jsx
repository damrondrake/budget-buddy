import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

const mockCumulative = { total_income: 2000, total_spending: 200, net_balance: 1800, total_saved: 300 }
const mockSummary = {
  month: 7,
  year: 2026,
  total_income: 2000,
  total_spent: 200,
  remaining: 1800,
  balance_between_users: {},
  by_category: [],
  budget_coverage: {
    remaining_obligations: 300,
    available_balance: 1800,
    projected_balance: 1500,
    status: 'on_track',
  },
}

vi.mock('../api/client', () => ({
  getSummary: vi.fn(() => Promise.resolve({ data: mockSummary })),
  getTransactions: vi.fn(() => Promise.resolve({ data: [] })),
  getSettlements: vi.fn(() => Promise.resolve({ data: [] })),
  getCumulative: vi.fn(() => Promise.resolve({ data: mockCumulative })),
  getStartingBalance: vi.fn(() => Promise.resolve({ data: { amount: 100 } })),
  getHealthScore: vi.fn(() => Promise.resolve({ data: null })),
  createSettlement: vi.fn(),
  setBudgetPaid: vi.fn(),
  createTransaction: vi.fn(),
  quickDeposit: vi.fn(() => Promise.resolve({ data: {} })),
  apiErrorMessage: (_e, fallback) => fallback,
}))

vi.mock('../context/UsersContext', () => ({
  useUsers: () => ({ users: [{ id: 1, name: 'Alex' }] }),
}))

vi.mock('../hooks/usePolling', () => ({ default: () => {} }))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => children,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard balance breakdown & budget coverage', () => {
  it('shows available balance, in-savings, and a Move to Savings action', async () => {
    renderDashboard()
    expect(await screen.findByText('Available Balance')).toBeInTheDocument()
    // $1800.00 (available) and $300.00 (in savings) each appear across the
    // Balance Breakdown and Budget Coverage cards.
    expect(screen.getAllByText('$1800.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('In Savings')).toBeInTheDocument()
    expect(screen.getAllByText('$300.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Move to Savings')).toBeInTheDocument()
  })

  it('renders the on-track budget coverage message', async () => {
    renderDashboard()
    expect(await screen.findByText('Budget Coverage')).toBeInTheDocument()
    // projected_balance 1500 buffer, on track
    expect(screen.getByText(/on track/i)).toBeInTheDocument()
    expect(screen.getByText(/\$1500\.00 buffer/)).toBeInTheDocument()
  })
})
