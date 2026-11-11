import apiClient from './client'

export const appointmentsApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get('/appointments', { params })
    return data
  },
  get: async (id) => {
    const { data } = await apiClient.get(`/appointments/${id}`)
    return data
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/appointments', payload)
    return data
  },
  update: async (id, payload) => {
    const { data } = await apiClient.put(`/appointments/${id}`, payload)
    return data
  },
  cancel: async (id) => {
    const { data } = await apiClient.delete(`/appointments/${id}`)
    return data
  }
}
