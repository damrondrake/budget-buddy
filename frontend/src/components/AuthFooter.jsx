import { Link } from 'react-router-dom'

const SUPPORT_EMAIL = 'support@budget-buddy-app.com'

// Shared footer for the unauthenticated Login/Register screens: privacy link,
// support contact, and copyright. Kept in one place so both pages stay in sync.
export default function AuthFooter() {
  return (
    <div className="text-center text-xs text-gray-400 mt-6 space-y-1">
      <p>
        <Link to="/privacy" className="hover:text-gray-600 hover:underline">
          Privacy Policy
        </Link>
      </p>
      <p>
        Contact:{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-gray-600 hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p>© 2026 BudgetBuddy</p>
    </div>
  )
}
