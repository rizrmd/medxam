import { useEffect } from 'react'
import { useDashboardHeader } from '@/contexts/DashboardHeaderContext'
import type { ReactNode } from 'react'

/**
 * Hook to set the dashboard header content from child components
 * @param title - The title to display in the header (string or React element)
 * @param actions - Optional React components to render in the header actions area
 * @param deps - Optional dependency array to control when header should update
 */
export function useSetDashboardHeader(
  title: string | ReactNode,
  actions?: ReactNode,
  deps?: React.DependencyList
) {
  const { setHeader } = useDashboardHeader()

  useEffect(() => {
    setHeader(title, actions)
    
    // Set document title if title is a string
    if (typeof title === 'string' && title) {
      document.title = `${title} - MedXam`
    }
    
    // Don't use deps array for cleanup to ensure it always runs
  }, deps ? deps : [title, actions])
  
  // Separate cleanup effect that always runs on unmount
  useEffect(() => {
    return () => {
      // Clear header when component unmounts
      setHeader('', null)
    }
  }, [setHeader])
}