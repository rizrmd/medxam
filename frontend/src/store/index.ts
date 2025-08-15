import { proxy } from 'valtio'
import { devtools } from 'valtio/utils'
import { apiClient } from '@/lib/api'

// Auth Types
interface Role {
  id: number
  name: string
  display_name?: string
  description?: string
}

interface User {
  id: string | number
  username: string
  email: string
  role?: 'administrator' | 'scorer' // Keep for backward compatibility
  roles?: Role[] // Array of roles from backend
  name: string
}

// Exam Types
export interface Exam {
  id: string
  name: string
  code: string
  questionCount: number
  duration: number
  status: 'draft' | 'active' | 'completed'
}

export interface Delivery {
  id: string
  name: string
  examId: string
  groupId: string
  schedule: Date
  duration: number
  status: 'scheduled' | 'ongoing' | 'completed'
}

export interface QuestionCategory {
  id: string
  name: string
  type: 'disease-group' | 'region-group' | 'specific-part' | 'typical-group'
  questionCount: number
}

export interface QuestionSet {
  id: string
  title: string
  questions: Question[]
  type: 'simple' | 'multiple-choice' | 'essay' | 'interview'
  vignette: boolean
  categories: string[]
}

export interface Question {
  id: string
  text: string
  type: 'multiple-choice' | 'essay' | 'interview'
  options?: string[]
  correctAnswer?: string | string[]
  points: number
}

// Participant Types
export interface Group {
  id: string
  name: string
  code: string
  description: string
  participantCount: number
  createdAt: Date
}

export interface Participant {
  id: string
  registrationNumber: string
  name: string
  email: string
  groups: string[]
  createdAt: Date
  verified: boolean
}

export interface Result {
  id: string
  participantId: string
  deliveryId: string
  score: number
  totalScore: number
  percentage: number
  status: 'pending' | 'scored' | 'reviewed'
  completedAt: Date
}

// Main State Store
export const store = proxy({
  // Auth State
  auth: {
    user: null as User | null,
    token: null as string | null,
    isAuthenticated: false,
  },

  // Exam State
  exam: {
    exams: [] as Exam[],
    deliveries: [] as Delivery[],
    categories: [] as QuestionCategory[],
    questionSets: [] as QuestionSet[],
    currentExam: null as Exam | null,
    currentDelivery: null as Delivery | null,
  },

  // Participant State
  participant: {
    groups: [] as Group[],
    participants: [] as Participant[],
    results: [] as Result[],
    currentGroup: null as Group | null,
    currentParticipant: null as Participant | null,
  },
})

// Enable devtools in development
if (import.meta.env.DEV) {
  devtools(store, { name: 'MedXamion State' })
}

// Auth Actions
export const authActions = {
  async login(username: string, password: string) {
    try {
      const response = await apiClient.auth.login({ username, password })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data) {
        const { success, user, session_id } = response.data as any
        
        if (!success) {
          throw new Error('Login failed')
        }
        
        // Store initial user data
        store.auth.user = user
        store.auth.token = session_id || null
        store.auth.isAuthenticated = true
        
        if (session_id) {
          localStorage.setItem('sessionId', session_id)
          document.cookie = `medxam_session=${session_id}; path=/; max-age=86400; SameSite=Lax`
        }
        
        // Fetch complete user data with roles from /auth/me
        try {
          const meResponse = await apiClient.auth.me()
          if (!meResponse.error && meResponse.data) {
            const { user: fullUser, session_data } = meResponse.data as any
            
            // Merge user data with roles from session_data
            if (fullUser && session_data?.roles) {
              fullUser.roles = session_data.roles
              store.auth.user = fullUser
            }
          }
        } catch (meError) {
          console.warn('Failed to fetch user roles:', meError)
        }
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  async logout() {
    try {
      await apiClient.auth.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      store.auth.user = null
      store.auth.token = null
      store.auth.isAuthenticated = false
      
      localStorage.removeItem('sessionId')
      document.cookie = 'medxam_session=; path=/; max-age=0; SameSite=Lax'
    }
  },

  setUser(user: User) {
    store.auth.user = user
  },
  
  async checkAuth() {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
      store.auth.isAuthenticated = false
      return
    }
    
    try {
      const response = await apiClient.auth.me()
      if (!response.error && response.data) {
        const { user, session_data } = response.data as any
        
        // Merge user data with roles from session_data
        if (user && session_data?.roles) {
          user.roles = session_data.roles
        }
        
        store.auth.user = user
        store.auth.token = sessionId
        store.auth.isAuthenticated = true
      } else {
        // Session invalid, clear auth
        store.auth.user = null
        store.auth.token = null
        store.auth.isAuthenticated = false
        localStorage.removeItem('sessionId')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      store.auth.isAuthenticated = false
    }
  },
}

// Exam Actions
export const examActions = {
  setExams(exams: Exam[]) {
    store.exam.exams = exams
  },

  setDeliveries(deliveries: Delivery[]) {
    store.exam.deliveries = deliveries
  },

  setCategories(categories: QuestionCategory[]) {
    store.exam.categories = categories
  },

  setQuestionSets(questionSets: QuestionSet[]) {
    store.exam.questionSets = questionSets
  },

  setCurrentExam(exam: Exam | null) {
    store.exam.currentExam = exam
  },

  setCurrentDelivery(delivery: Delivery | null) {
    store.exam.currentDelivery = delivery
  },

  addExam(exam: Exam) {
    store.exam.exams.push(exam)
  },

  updateExam(id: string, examUpdate: Partial<Exam>) {
    const index = store.exam.exams.findIndex(e => e.id === id)
    if (index !== -1) {
      Object.assign(store.exam.exams[index], examUpdate)
    }
  },

  deleteExam(id: string) {
    store.exam.exams = store.exam.exams.filter(e => e.id !== id)
  },

  addDelivery(delivery: Delivery) {
    store.exam.deliveries.push(delivery)
  },

  updateDelivery(id: string, deliveryUpdate: Partial<Delivery>) {
    const index = store.exam.deliveries.findIndex(d => d.id === id)
    if (index !== -1) {
      Object.assign(store.exam.deliveries[index], deliveryUpdate)
    }
  },

  deleteDelivery(id: string) {
    store.exam.deliveries = store.exam.deliveries.filter(d => d.id !== id)
  },

  addCategory(category: QuestionCategory) {
    store.exam.categories.push(category)
  },

  updateCategory(id: string, categoryUpdate: Partial<QuestionCategory>) {
    const index = store.exam.categories.findIndex(c => c.id === id)
    if (index !== -1) {
      Object.assign(store.exam.categories[index], categoryUpdate)
    }
  },

  deleteCategory(id: string) {
    store.exam.categories = store.exam.categories.filter(c => c.id !== id)
  },

  addQuestionSet(questionSet: QuestionSet) {
    store.exam.questionSets.push(questionSet)
  },

  updateQuestionSet(id: string, questionSetUpdate: Partial<QuestionSet>) {
    const index = store.exam.questionSets.findIndex(qs => qs.id === id)
    if (index !== -1) {
      Object.assign(store.exam.questionSets[index], questionSetUpdate)
    }
  },

  deleteQuestionSet(id: string) {
    store.exam.questionSets = store.exam.questionSets.filter(qs => qs.id !== id)
  },
}

// Participant Actions
export const participantActions = {
  setGroups(groups: Group[]) {
    store.participant.groups = groups
  },

  setParticipants(participants: Participant[]) {
    store.participant.participants = participants
  },

  setResults(results: Result[]) {
    store.participant.results = results
  },

  setCurrentGroup(group: Group | null) {
    store.participant.currentGroup = group
  },

  setCurrentParticipant(participant: Participant | null) {
    store.participant.currentParticipant = participant
  },

  addGroup(group: Group) {
    store.participant.groups.push(group)
  },

  updateGroup(id: string, groupUpdate: Partial<Group>) {
    const index = store.participant.groups.findIndex(g => g.id === id)
    if (index !== -1) {
      Object.assign(store.participant.groups[index], groupUpdate)
    }
  },

  deleteGroup(id: string) {
    store.participant.groups = store.participant.groups.filter(g => g.id !== id)
  },

  addParticipant(participant: Participant) {
    store.participant.participants.push(participant)
  },

  updateParticipant(id: string, participantUpdate: Partial<Participant>) {
    const index = store.participant.participants.findIndex(c => c.id === id)
    if (index !== -1) {
      Object.assign(store.participant.participants[index], participantUpdate)
    }
  },

  deleteParticipant(id: string) {
    store.participant.participants = store.participant.participants.filter(c => c.id !== id)
  },

  addResult(result: Result) {
    store.participant.results.push(result)
  },

  updateResult(id: string, resultUpdate: Partial<Result>) {
    const index = store.participant.results.findIndex(r => r.id === id)
    if (index !== -1) {
      Object.assign(store.participant.results[index], resultUpdate)
    }
  },
}

// Persist auth state
const storedAuth = localStorage.getItem('auth-storage')
if (storedAuth) {
  try {
    const parsed = JSON.parse(storedAuth)
    if (parsed.state) {
      store.auth.user = parsed.state.user
      store.auth.token = parsed.state.token
      store.auth.isAuthenticated = parsed.state.isAuthenticated
    }
  } catch (error) {
    console.error('Failed to parse stored auth:', error)
  }
}

// Save auth state on changes
export const persistAuth = () => {
  localStorage.setItem('auth-storage', JSON.stringify({
    state: {
      user: store.auth.user,
      token: store.auth.token,
      isAuthenticated: store.auth.isAuthenticated,
    },
    version: 0,
  }))
}