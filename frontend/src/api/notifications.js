import apiClient from './client'

export const notificationsApi = {
  list: async (params = {}) => {
    const { data } = await apiClient.get('/notifications', { params })
    return data
  },
  markRead: async (id) => {
    const { data } = await apiClient.put(`/notifications/${id}/read`)
    return data
  },
  markAllRead: async () => {
    const { data } = await apiClient.put('/notifications/read-all')
    return data
  },
  getUnreadCount: async () => {
    const { data } = await apiClient.get('/notifications/unread-count')
    return data
  }
}
