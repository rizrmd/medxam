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
  }

  takers = {
    list: () => this.get('/takers'),
    get: (id: string) => this.get(`/takers/${id}`),
    create: (data: any) => this.post('/takers', data),
    update: (id: string, data: any) => this.put(`/takers/${id}`, data),
    delete: (id: string) => this.delete(`/takers/${id}`),
  }

  attempts = {
    list: () => this.get('/attempts'),
    get: (id: string) => this.get(`/attempts/${id}`),
    create: (data: any) => this.post('/attempts', data),
    update: (id: string, data: any) => this.put(`/attempts/${id}`, data),
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
}

export const apiClient = new ApiClient()
export default apiClient