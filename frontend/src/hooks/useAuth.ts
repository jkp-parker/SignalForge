import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, type User } from '../lib/api'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password)
    localStorage.setItem('token', data.access_token)
    await fetchUser()
    navigate('/')
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  return { user, loading, login, logout }
}
