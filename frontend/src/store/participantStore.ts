import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api'

// Re-export types from the new centralized store
export type { Group, Participant, Result } from '@/store'

interface ParticipantData {
  id: string
  name: string
  reg: string
  email: string
  is_verified: boolean
}

interface ParticipantAuthState {
  participant: ParticipantData | null
  token: string | null
  isAuthenticated: boolean
  currentDelivery: any | null
  login: (registrationNumber: string, password: string) => Promise<void>
  loginWithTestCode: (testCode: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useParticipantStore = create<ParticipantAuthState>()(
  persist(
    (set) => ({
      participant: null,
      token: null,
      isAuthenticated: false,
      currentDelivery: null,

      login: async (registrationNumber: string, password: string) => {
        try {
          const response = await apiClient.participants.login(registrationNumber, password)

          if (response.error) {
            throw new Error(response.error)
          }

          if (response.data?.success) {
            const { participant, token } = response.data
            
            set({
              participant,
              token,
              isAuthenticated: true
            })

            // Store token for future requests
            if (token) {
              localStorage.setItem('participant-token', token)
            }
          } else {
            throw new Error(response.data?.message || 'Login failed')
          }
        } catch (error: any) {
          set({
            participant: null,
            token: null,
            isAuthenticated: false
          })
          
          throw new Error(error.message || 'Login failed. Please check your credentials.')
        }
      },

      loginWithTestCode: async (testCode: string) => {
        try {
          const response = await apiClient.participants.loginWithTestCode(testCode)

          if (response.error) {
            throw new Error(response.error)
          }

          if (response.data?.success) {
            const { participant, token, delivery } = response.data
            
            set({
              participant,
              token,
              isAuthenticated: true,
              currentDelivery: delivery
            })

            // Store token for future requests
            if (token) {
              localStorage.setItem('participant-token', token)
            }
          } else {
            throw new Error(response.data?.message || 'Login failed')
          }
        } catch (error: any) {
          set({
            participant: null,
            token: null,
            isAuthenticated: false,
            currentDelivery: null
          })
          
          throw new Error(error.message || 'Invalid test code. Please check and try again.')
        }
      },

      logout: () => {
        set({
          participant: null,
          token: null,
          isAuthenticated: false,
          currentDelivery: null
        })
        
        // Clear persisted state
        localStorage.removeItem('participant-token')
        localStorage.removeItem('participant-auth-storage')
      },

      checkAuth: async () => {
        const state = useParticipantStore.getState()
        if (state.token) {
          try {
            // You might want to verify the token with the backend here
            // For now, we'll just check if we have a token
            set({ isAuthenticated: true })
          } catch (error) {
            // Token is invalid, clear auth state
            state.logout()
          }
        }
      }
    }),
    {
      name: 'participant-auth-storage',
      partialize: (state) => ({
        participant: state.participant,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        currentDelivery: state.currentDelivery
      })
    }
  )
)