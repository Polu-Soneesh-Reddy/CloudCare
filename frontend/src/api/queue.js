import apiClient from './client'

export const queueApi = {
  list: async () => {
    const { data } = await apiClient.get('/queue')
    return data
  },
  addToQueue: async (payload) => {
    const { data } = await apiClient.post('/queue', payload)
    return data
  },
  updateStatus: async (id, status) => {
    const { data } = await apiClient.put(`/queue/${id}/status`, { status })
    return data
  }
}
