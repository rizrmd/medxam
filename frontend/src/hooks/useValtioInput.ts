import { useRef, useCallback, useState } from 'react'
import { proxy } from 'valtio'
import { useSnapshot } from 'valtio'

/**
 * Optimized input hook that uses uncontrolled input with local state
 * to prevent Valtio re-renders on every keystroke
 */
export function useValtioInput(initialValue: string = '') {
  // Use regular React state for the input value (fast, no proxy overhead)
  const [localValue, setLocalValue] = useState(initialValue)
  
  // Use Valtio proxy only for the debounced/committed value
  const stateRef = useRef<{ value: string } | null>(null)
  
  if (!stateRef.current) {
    stateRef.current = proxy({
      value: initialValue
    })
  }
  
  const state = stateRef.current
  const snap = useSnapshot(state)
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Update local state immediately (fast)
    setLocalValue(newValue)
    // Update Valtio state (for other components that need to react)
    state.value = newValue
  }, [state])
  
  const setValue = useCallback((newValue: string) => {
    setLocalValue(newValue)
    state.value = newValue
  }, [state])
  
  return {
    value: snap.value, // For other components to read
    displayValue: localValue, // For the input to display
    onChange: handleChange,
    setValue,
    inputProps: {
      value: localValue,
      onChange: handleChange
    }
  }
}

