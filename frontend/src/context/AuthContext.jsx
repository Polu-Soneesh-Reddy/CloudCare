import React, { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cloudcare_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('cloudcare_token'))

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    const access_token = data.access_token || data.token
    const userData = data.user || { email, name: email.split('@')[0], role: 'Admin' }
    localStorage.setItem('cloudcare_token', access_token)
    localStorage.setItem('cloudcare_user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('cloudcare_token')
    localStorage.removeItem('cloudcare_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
