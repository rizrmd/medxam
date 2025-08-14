import { useRef } from 'react'
import { proxy } from 'valtio'
import { useSnapshot } from 'valtio'

/**
 * A hook that replaces useState with Valtio proxy state
 * Useful for local component state management
 */
export function useLocalState<T extends object>(initialState: T) {
  const stateRef = useRef<T | null>(null)
  
  if (!stateRef.current) {
    stateRef.current = proxy(initialState)
  }
  
  const snap = useSnapshot(stateRef.current)
  
  return [snap, stateRef.current] as const
}

/**
 * A hook that replaces useState with Valtio proxy state with sync mode
 * Use this for input fields and forms
 */
export function useLocalStateSync<T extends object>(initialState: T) {
  const stateRef = useRef<T | null>(null)
  
  if (!stateRef.current) {
    stateRef.current = proxy(initialState)
  }
  
  const snap = useSnapshot(stateRef.current, { sync: true })
  
  return [snap, stateRef.current] as const
}