import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUsers } from '../api/client'

const UsersContext = createContext()

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([])

  const refreshUsers = useCallback(() => {
    getUsers().then((res) => setUsers(res.data))
  }, [])

  useEffect(() => {
    refreshUsers()
  }, [refreshUsers])

  return (
    <UsersContext.Provider value={{ users, refreshUsers }}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  return useContext(UsersContext)
}
