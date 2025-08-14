// Re-export types from the new centralized store
export type { Group, Candidate, Result } from '@/store'

// Re-export hook from the new centralized store for backward compatibility
export { useParticipantStore } from '@/hooks/useStore'