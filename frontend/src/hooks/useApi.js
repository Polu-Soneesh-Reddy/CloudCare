import { useState, useEffect, useCallback } from 'react'

export function useApi(apiFunc, immediate = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunc(...args)
      setData(result)
      return result
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'An error occurred'
      setError(typeof message === 'object' ? JSON.stringify(message) : message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunc])

  useEffect(() => {
    if (immediate) execute()
  }, [])

  return { data, loading, error, execute, setData }
}
