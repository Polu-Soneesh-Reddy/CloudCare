import apiClient from './client'

export const doctorsApi = {
  list: async () => {
    const { data } = await apiClient.get('/doctors')
    return data
  },
  get: async (id) => {
    const { data } = await apiClient.get(`/doctors/${id}`)
    return data
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/doctors', payload)
    return data
  },
  update: async (id, payload) => {
    const { data } = await apiClient.put(`/doctors/${id}`, payload)
    return data
  },
  getSlots: async (id, date) => {
    const { data } = await apiClient.get(`/doctors/${id}/slots`, { params: { date } })
    return data
  }
}
