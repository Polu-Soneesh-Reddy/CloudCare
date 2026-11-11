import apiClient from './client'

export const patientsApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get('/patients', { params })
    return data
  },
  get: async (id) => {
    const { data } = await apiClient.get(`/patients/${id}`)
    return data
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/patients', payload)
    return data
  }
}
