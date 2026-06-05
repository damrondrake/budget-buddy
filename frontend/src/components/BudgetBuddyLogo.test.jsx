import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BudgetBuddyLogo from './BudgetBuddyLogo'

describe('BudgetBuddyLogo', () => {
  it('renders without crashing and exposes an accessible label', () => {
    render(<BudgetBuddyLogo />)
    expect(screen.getByRole('img', { name: 'BudgetBuddy' })).toBeInTheDocument()
  })

  it('renders the icon-only variant', () => {
    render(<BudgetBuddyLogo variant="icon" />)
    expect(screen.getByRole('img', { name: 'BudgetBuddy' })).toBeInTheDocument()
  })
})
