import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Hook to inject components into the header actions area of DashboardLayout
 * @param actions React component to render in the header
 * @param title Optional page title to set in the header (string or React element)
 * @param deps Optional dependency array to control when actions/title should update
 */
export function useHeaderActions(actions: React.ReactNode, title?: string | React.ReactNode, deps?: React.DependencyList) {
  const [actionsContainer, setActionsContainer] = useState<HTMLElement | null>(null)
  const [titleContainer, setTitleContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const findContainers = () => {
      // Try to find containers
      const actionsEl = document.getElementById('header-actions')
      const titleEl = document.getElementById('header-title')
      
      console.log('Looking for containers:', {
        actionsFound: !!actionsEl,
        titleFound: !!titleEl,
        actionsEl: actionsEl?.outerHTML,
        titleEl: titleEl?.outerHTML
      })
      
      // Test direct DOM manipulation
      if (titleEl) {
        console.log('Testing direct DOM manipulation...')
        titleEl.innerHTML = '<div style="background: red; color: white; padding: 10px; font-size: 20px;">DIRECT DOM TEST</div>'
        console.log('Injected test content directly into titleEl')
      }
      
      if (actionsEl) setActionsContainer(actionsEl)
      if (titleEl) setTitleContainer(titleEl)
      
      return actionsEl || titleEl
    }

    if (!findContainers()) {
      // Retry after a delay
      const timeout = setTimeout(findContainers, 100)
      return () => clearTimeout(timeout)
    }
  }, [])

  // Set document title
  useEffect(() => {
    if (title) {
      if (typeof title === 'string') {
        document.title = `${title} - MedXam`
      } else {
        document.title = 'Live Participant Progress - MedXam'
      }
    }
    
    return () => {
      document.title = 'MedXam'
    }
  }, deps ? [title, ...deps] : [title])

  // Clear title container and let portal take over
  useEffect(() => {
    if (titleContainer && title) {
      titleContainer.innerHTML = ''
    }
  }, [titleContainer, title, ...(deps || [])])

  return (
    <>
      {actionsContainer && createPortal(actions, actionsContainer)}
      {titleContainer && title && createPortal(title, titleContainer)}
    </>
  )
}