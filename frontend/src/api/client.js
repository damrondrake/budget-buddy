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

// Transactions
export const getTransactions = (params) => api.get('/transactions', { params })
export const createTransaction = (data) => api.post('/transactions', data)
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data)
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`)

// Budgets
export const getBudgets = (params) => api.get('/budgets', { params })
export const upsertBudget = (data) => api.post('/budgets', data)
export const copyBudgets = (data) => api.post('/budgets/copy', data)

// Categories
export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// Income
export const getIncome = (params) => api.get('/income', { params })
export const createIncome = (data) => api.post('/income', data)
export const updateIncome = (id, data) => api.put(`/income/${id}`, data)
export const deleteIncome = (id) => api.delete(`/income/${id}`)

// Recurring
export const getRecurring = () => api.get('/recurring')
export const createRecurring = (data) => api.post('/recurring', data)
export const deleteRecurring = (id) => api.delete(`/recurring/${id}`)
export const applyRecurring = (params) => api.post('/recurring/apply', null, { params })

// Users
export const getUsers = () => api.get('/users')
export const updateUser = (id, data) => api.put(`/users/${id}`, data)

// Summary
export const getSummary = (month, year) => api.get(`/summary/${month}/${year}`)

// Trends
export const getTrends = (months = 6) => api.get('/trends', { params: { months } })

export default api
