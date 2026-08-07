import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AcceptInvite from './AcceptInvite'
import { acceptInviteRegister } from '../api/client'

// Keep the real apiErrorMessage (the function under test); stub only the network calls.
vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, acceptInviteRegister: vi.fn(), acceptInviteLogin: vi.fn() }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ setSessionToken: vi.fn() }),
}))

function renderAcceptInvite() {
  return render(
    <MemoryRouter initialEntries={['/accept-invite?token=abc123']}>
      <AcceptInvite />
    </MemoryRouter>,
  )
}

describe('AcceptInvite error handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a Pydantic 422 error as readable text instead of crashing', async () => {
    // The exact server response that used to crash the page with
    // "Objects are not valid as a React child".
    acceptInviteRegister.mockRejectedValueOnce({
      response: {
        data: {
          detail: [
            {
              type: 'string_too_short',
              loc: ['body', 'password'],
              msg: 'String should have at least 8 characters',
              input: 'abc123',
              ctx: { min_length: 8 },
            },
          ],
        },
      },
    })

    const user = userEvent.setup()
    const { container } = renderAcceptInvite()

    await user.type(container.querySelector('input[type="text"]'), 'Girlfriend')
    await user.type(container.querySelector('input[type="email"]'), 'gf@example.com')
    await user.type(container.querySelector('input[type="password"]'), 'password123')
    await user.click(screen.getByRole('button', { name: /join shared account/i }))

    // The human-readable msg is shown; no raw object is rendered.
    await waitFor(() =>
      expect(screen.getByText('String should have at least 8 characters')).toBeInTheDocument(),
    )
    expect(screen.queryByText(/object with keys/i)).not.toBeInTheDocument()
  })

  it('shows the fallback message when the server sends no useful body', async () => {
    acceptInviteRegister.mockRejectedValueOnce({ response: { data: {} } })

    const user = userEvent.setup()
    const { container } = renderAcceptInvite()

    await user.type(container.querySelector('input[type="text"]'), 'Girlfriend')
    await user.type(container.querySelector('input[type="email"]'), 'gf@example.com')
    await user.type(container.querySelector('input[type="password"]'), 'password123')
    await user.click(screen.getByRole('button', { name: /join shared account/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/unable to accept this invite/i),
      ).toBeInTheDocument(),
    )
  })
})
