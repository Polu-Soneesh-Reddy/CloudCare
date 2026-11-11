import apiClient from './client'

export const authApi = {
  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    return data
  },
  me: async () => {
    const { data } = await apiClient.get('/auth/me')
    return data
  }
}
