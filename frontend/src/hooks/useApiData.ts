import { useEffect } from 'react'
import { useLocalState } from '@/hooks/useLocalState'

interface UseApiDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApiData<T>(
  fetchFn: () => Promise<{ data?: T; error?: string }>,
  dependencies: any[] = []
): UseApiDataResult<T> {
  const [state, setState] = useLocalState({
    data: null as T | null,
    loading: true,
    error: null as string | null
  })

  const fetchData = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      const response = await fetchFn()
      
      if (response.error) {
        setState.error = response.error
        setState.data = null
      } else if (response.data) {
        setState.data = response.data
        setState.error = null
      }
    } catch (err) {
      setState.error = err instanceof Error ? err.message : 'An error occurred'
      setState.data = null
    } finally {
      setState.loading = false
    }
  }

  useEffect(() => {
    fetchData()
  }, dependencies)

  return { data: state.data as T | null, loading: state.loading, error: state.error, refetch: fetchData }
}