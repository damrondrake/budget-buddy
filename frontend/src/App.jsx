import { Routes, Route } from 'react-router-dom'
import { UsersProvider } from './context/UsersContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Income from './pages/Income'
import Settings from './pages/Settings'
import Trends from './pages/Trends'

export default function App() {
  return (
    <UsersProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/income" element={<Income />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </UsersProvider>
  )
}
