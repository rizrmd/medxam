import { useRef, useCallback } from 'react'

/**
 * Ultra-fast uncontrolled input hook that doesn't cause any re-renders
 * Perfect for search inputs and other frequently typed fields
 */
export function useFastInput(
  initialValue: string = '',
  onValueChange?: (value: string) => void
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(initialValue)
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    valueRef.current = e.target.value
    onValueChange?.(e.target.value)
  }, [onValueChange])
  
  const getValue = useCallback(() => valueRef.current, [])
  
  const setValue = useCallback((newValue: string) => {
    valueRef.current = newValue
    if (inputRef.current) {
      inputRef.current.value = newValue
    }
    onValueChange?.(newValue)
  }, [onValueChange])
  
  const clear = useCallback(() => {
    setValue('')
  }, [setValue])
  
  return {
    inputProps: {
      ref: inputRef,
      defaultValue: initialValue,
      onChange: handleChange
    },
    getValue,
    setValue,
    clear,
    value: valueRef.current // For immediate access (won't trigger re-render)
  }
}