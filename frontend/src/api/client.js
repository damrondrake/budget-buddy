import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

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
export const deleteIncome = (id) => api.delete(`/income/${id}`)

// Users
export const getUsers = () => api.get('/users')
export const updateUser = (id, data) => api.put(`/users/${id}`, data)

// Summary
export const getSummary = (month, year) => api.get(`/summary/${month}/${year}`)

export default api
