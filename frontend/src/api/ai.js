import apiClient from './client'

export const aiApi = {
  // Clinical Symptom Triage Assessment
  evaluateTriage: async (triageData) => {
    const response = await apiClient.post('/ai/triage', triageData)
    return response.data
  },

  // Appointment No-Show Risk Predictor
  predictNoShow: async (predictData) => {
    const response = await apiClient.post('/ai/predict-no-show', predictData)
    return response.data
  },

  // Consultation SOAP Note Synthesizer
  generateSoapNote: async (soapData) => {
    const response = await apiClient.post('/ai/generate-soap', soapData)
    return response.data
  },

  // Real-time Queue Intelligence & Bottlenecks
  getQueueInsights: async () => {
    const response = await apiClient.get('/ai/queue-insights')
    return response.data
  },
}
