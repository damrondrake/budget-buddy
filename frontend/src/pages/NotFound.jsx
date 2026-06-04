import { Link } from 'react-router-dom'
import BudgetBuddyLogo from '../components/BudgetBuddyLogo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <BudgetBuddyLogo variant="stacked" size="lg" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-gray-900 mb-2">404</h1>
        <p className="text-lg font-medium text-gray-700 mb-1">Page not found</p>
        <p className="text-sm text-gray-500 mb-8">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
