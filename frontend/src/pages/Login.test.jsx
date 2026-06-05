import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

// Avoid AuthProvider's network calls — stub the hook.
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

describe('Login page', () => {
  it('renders email and password fields', () => {
    const { container } = renderLogin()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument()
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('has a sign-in button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
