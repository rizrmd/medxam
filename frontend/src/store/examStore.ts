// Re-export types from the new centralized store
export type { Exam, Delivery, QuestionCategory, QuestionSet, Question } from '@/store'

// Re-export hook from the new centralized store for backward compatibility
export { useExamStore } from '@/hooks/useStore'