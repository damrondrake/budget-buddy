import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Onboarding from './Onboarding'

// Stub the API and contexts so no real network/auth is involved.
const api = {
  getCumulative: vi.fn(),
  getBudgets: vi.fn(),
  updateUser: vi.fn(),
  invitePartner: vi.fn(),
}
vi.mock('../api/client', () => ({
  getCumulative: (...a) => api.getCumulative(...a),
  getBudgets: (...a) => api.getBudgets(...a),
  updateUser: (...a) => api.updateUser(...a),
  invitePartner: (...a) => api.invitePartner(...a),
}))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ account: { id: 7, display_name: 'Drake' } }),
}))
vi.mock('../context/UsersContext', () => ({
  useUsers: () => ({
    users: [{ id: 1, name: 'Drake' }, { id: 2, name: 'Partner' }],
    refreshUsers: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  api.getCumulative.mockResolvedValue({ data: { total_spending: 0 } })
  api.getBudgets.mockResolvedValue({ data: [] })
})

describe('Onboarding', () => {
  it('shows the welcome step for a brand-new account', async () => {
    const onActiveChange = vi.fn()
    render(<Onboarding onActiveChange={onActiveChange} />)

    await waitFor(() =>
      expect(screen.getByText('Welcome to BudgetBuddy, Drake!')).toBeInTheDocument(),
    )
    expect(onActiveChange).toHaveBeenCalledWith(true)
  })

  it('does not show when the completion key already exists', async () => {
    localStorage.setItem('onboarding_complete_7', '1')
    const onActiveChange = vi.fn()
    const { container } = render(<Onboarding onActiveChange={onActiveChange} />)

    expect(container).toBeEmptyDOMElement()
    expect(api.getCumulative).not.toHaveBeenCalled()
    expect(onActiveChange).toHaveBeenCalledWith(false)
  })

  it('does not show (and records completion) when the account already has data', async () => {
    api.getCumulative.mockResolvedValue({ data: { total_spending: 120 } })
    const onActiveChange = vi.fn()
    const { container } = render(<Onboarding onActiveChange={onActiveChange} />)

    await waitFor(() => expect(localStorage.getItem('onboarding_complete_7')).toBe('1'))
    expect(container).toBeEmptyDOMElement()
    expect(onActiveChange).toHaveBeenLastCalledWith(false)
  })
})
