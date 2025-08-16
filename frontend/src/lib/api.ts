const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface ApiResponse<T = any> {
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    console.log('API Request URL:', url)
    
    // Get session ID from localStorage if available
    const sessionId = localStorage.getItem('sessionId')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    
    // Add session ID to headers if available
    if (sessionId) {
      headers['X-Session-ID'] = sessionId
    }
    
    const config: RequestInit = {
      headers,
      credentials: 'include',
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized - redirect to login
          if (!endpoint.includes('/auth/') && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        const errorText = await response.text()
        console.log('API Error:', response.status, errorText)
        return { error: errorText || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  auth = {
    login: (credentials: { username: string; password: string }) =>
      this.post('/auth/login', credentials),
    
    logout: () =>
      this.post('/auth/logout'),
    
    me: () =>
      this.get('/auth/me'),
  }

  users = {
    list: () => this.get('/users'),
    get: (id: string) => this.get(`/users/${id}`),
    create: (data: any) => this.post('/users', data),
    update: (id: string, data: any) => this.put(`/users/${id}`, data),
    delete: (id: string) => this.delete(`/users/${id}`),
  }

  groups = {
    list: () => this.get('/groups'),
    get: (id: string) => this.get(`/groups/${id}`),
    create: (data: any) => this.post('/groups', data),
    update: (id: string, data: any) => this.put(`/groups/${id}`, data),
    delete: (id: string) => this.delete(`/groups/${id}`),
  }

  exams = {
    list: () => this.get('/exams'),
    get: (id: string) => this.get(`/exams/${id}`),
    create: (data: any) => this.post('/exams', data),
    update: (id: string, data: any) => this.put(`/exams/${id}`, data),
    delete: (id: string) => this.delete(`/exams/${id}`),
  }

  categories = {
    list: () => this.get('/categories'),
    get: (id: string) => this.get(`/categories/${id}`),
    create: (data: any) => this.post('/categories', data),
    update: (id: string, data: any) => this.put(`/categories/${id}`, data),
    delete: (id: string) => this.delete(`/categories/${id}`),
  }

  deliveries = {
    list: () => this.get('/deliveries'),
    get: (id: string) => this.get(`/deliveries/${id}`),
    create: (data: any) => this.post('/deliveries', data),
    update: (id: string, data: any) => this.put(`/deliveries/${id}`, data),
    delete: (id: string) => this.delete(`/deliveries/${id}`),
    getAssignments: (id: string) => this.get(`/deliveries/${id}/assignments`),
    assignCommittee: (id: string, userIds: number[]) => 
      this.post(`/deliveries/${id}/assign-committee`, { user_ids: userIds }),
    assignScorers: (id: string, userIds: number[]) => 
      this.post(`/deliveries/${id}/assign-scorers`, { user_ids: userIds }),
    control: (id: string, action: string) => 
      this.post(`/deliveries/${id}/control`, { action }),
    getParticipantProgress: (id: string) =>
      this.get(`/deliveries/${id}/participant-progress`),
  }

  participants = {
    list: () => this.get('/participants'),
    get: (id: string) => this.get(`/participants/${id}`),
    create: (data: any) => this.post('/participants', data),
    update: (id: string, data: any) => this.put(`/participants/${id}`, data),
    delete: (id: string) => this.delete(`/participants/${id}`),
    login: (registrationNumber: string, password: string) => 
      this.post('/participant/login', { registration_number: registrationNumber, password }),
    loginWithTestCode: (testCode: string) => 
      this.post('/participant/login-testcode', { test_code: testCode }),
  }

  attempts = {
    list: () => this.get('/attempts'),
    get: (id: string) => this.get(`/attempts/${id}`),
    getDetails: (id: string) => this.get(`/attempts/${id}/details`),
    getAnswers: (id: string) => this.get(`/attempts/${id}/answers`),
    create: (data: any) => this.post('/attempts', data),
    update: (id: string, data: any) => this.put(`/attempts/${id}`, data),
    updateScore: (id: string, score: number, penalty?: number) => 
      this.put(`/attempts/${id}/score`, { score, penalty }),
    delete: (id: string) => this.delete(`/attempts/${id}`),
  }

  items = {
    list: () => this.get('/items'),
    get: (id: string) => this.get(`/items/${id}`),
    create: (data: any) => this.post('/items', data),
    update: (id: string, data: any) => this.put(`/items/${id}`, data),
    delete: (id: string) => this.delete(`/items/${id}`),
  }

  health = () => this.get('/health')
  
  // Committee/Scorer endpoints
  myDeliveries = (role?: string) => this.get(`/my-deliveries${role ? `?role=${role}` : ''}`)
  getScorerUsers = () => this.get('/users/scorer')

  // Scoring endpoints
  scoring = {
    getDeliveries: (page = 1, perPage = 15) => 
      this.get(`/deliveries?page=${page}&per_page=${perPage}`),
    getDeliveryAttempts: (deliveryId: string, page = 1, perPage = 15) => 
      this.get(`/deliveries/${deliveryId}/attempts?page=${page}&per_page=${perPage}`),
    getDeliveryResults: (deliveryId: string, page = 1, perPage = 15) => 
      this.get(`/deliveries/${deliveryId}/results?page=${page}&per_page=${perPage}`),
    getParticipantProgress: (deliveryId: string) => 
      this.get(`/deliveries/${deliveryId}/live-progress`),
  }
}

export const apiClient = new ApiClient()
export default apiClient