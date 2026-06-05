import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from './Register'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: vi.fn() }),
}))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

describe('Register page', () => {
  it('renders display name, email, and password fields', () => {
    const { container } = renderRegister()
    expect(screen.getByText('Display name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(container.querySelector('input[type="text"]')).toBeInTheDocument()
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument()
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument()
  })
})
