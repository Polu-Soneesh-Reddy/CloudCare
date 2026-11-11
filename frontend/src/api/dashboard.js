import apiClient from './client'

export const dashboardApi = {
  getSummary: async () => {
    const { data } = await apiClient.get('/dashboard/summary')
    return data
  }
}
