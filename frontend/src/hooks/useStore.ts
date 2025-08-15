import { useSnapshot } from 'valtio'
import { store, authActions, examActions, participantActions } from '@/store'

export function useAuthStore() {
  const snap = useSnapshot(store.auth)
  return {
    user: snap.user,
    token: snap.token,
    isAuthenticated: snap.isAuthenticated,
    ...authActions,
  }
}

export function useExamStore() {
  const snap = useSnapshot(store.exam)
  return {
    exams: snap.exams,
    deliveries: snap.deliveries,
    categories: snap.categories,
    questionSets: snap.questionSets,
    currentExam: snap.currentExam,
    currentDelivery: snap.currentDelivery,
    ...examActions,
  }
}

export function useParticipantStore() {
  const snap = useSnapshot(store.participant)
  return {
    groups: snap.groups,
    participants: snap.participants,
    results: snap.results,
    currentGroup: snap.currentGroup,
    currentParticipant: snap.currentParticipant,
    ...participantActions,
  }
}

// For input fields that need sync mode
export function useAuthStoreSync() {
  const snap = useSnapshot(store.auth, { sync: true })
  return {
    user: snap.user,
    token: snap.token,
    isAuthenticated: snap.isAuthenticated,
    ...authActions,
  }
}

export function useExamStoreSync() {
  const snap = useSnapshot(store.exam, { sync: true })
  return {
    exams: snap.exams,
    deliveries: snap.deliveries,
    categories: snap.categories,
    questionSets: snap.questionSets,
    currentExam: snap.currentExam,
    currentDelivery: snap.currentDelivery,
    ...examActions,
  }
}

export function useParticipantStoreSync() {
  const snap = useSnapshot(store.participant, { sync: true })
  return {
    groups: snap.groups,
    participants: snap.participants,
    results: snap.results,
    currentGroup: snap.currentGroup,
    currentParticipant: snap.currentParticipant,
    ...participantActions,
  }
}