// Registers jest-dom matchers (toBeInTheDocument, etc.) with Vitest's expect,
// and unmounts rendered components after each test.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
