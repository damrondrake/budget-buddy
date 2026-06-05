import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UsersProvider } from './context/UsersContext'
import ErrorBoundary from './components/ErrorBoundary'
import Toast from './components/Toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Savings from './pages/Savings'
import Goals from './pages/Goals'
import Income from './pages/Income'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import Trends from './pages/Trends'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AcceptInvite from './pages/AcceptInvite'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'

// Wrap a route element in its own error boundary so a crash on one page shows
// the fallback for that page only, without taking down the rest of the app.
function Guarded({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

function RedirectIfAuthed({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    // Top-level boundary: last line of defense so no render error can blank the
    // entire app. Each page below also has its own boundary.
    <ErrorBoundary>
      <AuthProvider>
        <Toast />
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Guarded><Login /></Guarded>
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <Guarded><Register /></Guarded>
              </RedirectIfAuthed>
            }
          />
          {/* Always-public pages — reachable whether or not signed in. */}
          <Route path="/privacy" element={<Guarded><Privacy /></Guarded>} />
          {/* Public token-based flows — reachable whether or not signed in. */}
          <Route path="/forgot-password" element={<Guarded><ForgotPassword /></Guarded>} />
          <Route path="/reset-password" element={<Guarded><ResetPassword /></Guarded>} />
          <Route path="/accept-invite" element={<Guarded><AcceptInvite /></Guarded>} />
          <Route
            element={
              <RequireAuth>
                <UsersProvider>
                  <Layout />
                </UsersProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Guarded><Dashboard /></Guarded>} />
            <Route path="/transactions" element={<Guarded><Transactions /></Guarded>} />
            <Route path="/budgets" element={<Guarded><Budgets /></Guarded>} />
            <Route path="/savings" element={<Guarded><Savings /></Guarded>} />
            <Route path="/goals" element={<Guarded><Goals /></Guarded>} />
            <Route path="/income" element={<Guarded><Income /></Guarded>} />
            <Route path="/trends" element={<Guarded><Trends /></Guarded>} />
            <Route path="/billing" element={<Guarded><Billing /></Guarded>} />
            <Route path="/settings" element={<Guarded><Settings /></Guarded>} />
          </Route>
          {/* Catch-all: custom 404 page. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}
