import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from './NotFound'

describe('NotFound page', () => {
  it('renders the 404 heading and a link back to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()

    const homeLink = screen.getByRole('link', { name: /dashboard/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
