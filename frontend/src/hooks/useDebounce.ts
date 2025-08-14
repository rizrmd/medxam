import { useEffect } from 'react'
import { useLocalState } from '@/hooks/useLocalState'

export function useDebounce<T>(value: T, delay: number): T {
  const [state, setState] = useLocalState<{ debouncedValue: T }>({ debouncedValue: value })

  useEffect(() => {
    const handler = setTimeout(() => {
      setState.debouncedValue = value
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay, setState])

  return state.debouncedValue as T
}