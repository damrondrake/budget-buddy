import axios from 'axios'

const TOKEN_KEY = 'budgetbuddy_token'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

// Auth — password reset & partner invites
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password })
export const invitePartner = (email) => api.post('/auth/invite', { email })
export const acceptInviteLogin = (token, email, password) =>
  api.post('/auth/accept-invite/login', { token, email, password })
export const acceptInviteRegister = (token, email, password, displayName) =>
  api.post('/auth/accept-invite/register', { token, email, password, display_name: displayName })
export const deleteAccount = () => api.delete('/auth/account')

// Transactions
export const getTransactions = (params) => api.get('/transactions', { params })
export const createTransaction = (data) => api.post('/transactions', data)
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data)
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`)

// Budgets
export const getBudgets = (params) => api.get('/budgets', { params })
export const upsertBudget = (data) => api.post('/budgets', data)
export const deleteBudget = (id) => api.delete(`/budgets/${id}`)
export const copyBudgets = (data) => api.post('/budgets/copy', data)
export const setBudgetPaid = (id, paid) => api.put(`/budgets/${id}/paid`, { paid })
export const addBudgetLineItem = (budgetId, data) => api.post(`/budgets/${budgetId}/items`, data)
export const updateBudgetLineItem = (budgetId, itemId, data) => api.put(`/budgets/${budgetId}/items/${itemId}`, data)
export const deleteBudgetLineItem = (budgetId, itemId) => api.delete(`/budgets/${budgetId}/items/${itemId}`)

// Savings
export const getSavings = () => api.get('/savings')
export const createSavingsGoal = (data) => api.post('/savings', data)
export const deleteSavingsGoal = (id) => api.delete(`/savings/${id}`)
export const addSavingsAllocation = (goalId, data) => api.post(`/savings/${goalId}/allocations`, data)
export const deleteSavingsAllocation = (goalId, allocId) => api.delete(`/savings/${goalId}/allocations/${allocId}`)
export const addSavingsTransaction = (goalId, data) => api.post(`/savings/${goalId}/transactions`, data)
export const getSavingsTransactions = (goalId) => api.get(`/savings/${goalId}/transactions`)

// Categories
export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// Income
export const getIncome = (params) => api.get('/income', { params })
export const createIncome = (data) => api.post('/income', data)
export const updateIncome = (id, data) => api.put(`/income/${id}`, data)
export const deleteIncome = (id) => api.delete(`/income/${id}`)

// Starting balance (a special, locked income entry managed from Settings)
export const getStartingBalance = () => api.get('/account/starting-balance')
export const setStartingBalance = (data) => api.post('/account/starting-balance', data)
export const deleteStartingBalance = () => api.delete('/account/starting-balance')

// Recurring
export const getRecurring = () => api.get('/recurring')
export const createRecurring = (data) => api.post('/recurring', data)
export const deleteRecurring = (id) => api.delete(`/recurring/${id}`)
export const applyRecurring = (params) => api.post('/recurring/apply', null, { params })
export const applyDueRecurring = () => api.post('/recurring/apply-due')

// Users
export const getUsers = () => api.get('/users')
export const updateUser = (id, data) => api.put(`/users/${id}`, data)

// Summary
export const getSummary = (month, year) => api.get(`/summary/${month}/${year}`)
export const getCumulative = () => api.get('/cumulative')

// Trends
export const getTrends = (months = 6) => api.get('/trends', { params: { months } })

// Changelog ("What's New"). With sinceVersion, returns the list of entries
// newer than it; without it, the single latest entry (for new users).
export const getLatestChangelog = (sinceVersion) =>
  api.get('/changelog/latest', { params: sinceVersion ? { since_version: sinceVersion } : {} })

export default api
