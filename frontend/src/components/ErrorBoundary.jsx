import { Component } from 'react'
import * as Sentry from '@sentry/react'
import BudgetBuddyLogo from './BudgetBuddyLogo'

// Class component because only class components can be React error boundaries.
// Catches render/lifecycle errors in its subtree and shows a friendly fallback
// instead of letting the whole app unmount to a blank screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Surface the error in the console for debugging...
    console.error('ErrorBoundary caught an error:', error, info)
    // ...and report it to Sentry with the React component stack. This is a
    // no-op when Sentry isn't initialized (no DSN), so local dev is unaffected.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info?.componentStack } },
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <BudgetBuddyLogo variant="stacked" size="lg" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">
            {this.state.error?.message ||
              'An unexpected error occurred while rendering this page. You can try again or head back to your dashboard.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }
}
