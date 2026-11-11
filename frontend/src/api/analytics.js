import apiClient from './client'

export const analyticsApi = {
  getAppointments: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/appointments', { params })
    return data
  },
  getDoctors: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/doctors', { params })
    return data
  },
  getQueue: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/queue', { params })
    return data
  }
}
