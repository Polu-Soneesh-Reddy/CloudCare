import apiClient from './client'

export const settingsApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/settings')
    return data
  },
  update: async (key, value) => {
    const { data } = await apiClient.put(`/settings/${key}`, { value })
    return data
  }
}
