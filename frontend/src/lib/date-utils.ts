import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { INDONESIAN_MONTHS_SHORT } from './date-constants'

/**
 * Format date with Indonesian month names
 * @param dateObj - Date object
 * @param formatStr - Format string
 * @param useUTC - Whether to use UTC
 * @returns Formatted date string with Indonesian months
 */
function formatWithIndonesianMonth(dateObj: Date, formatStr: string, useUTC: boolean): string {
  // First format the date normally
  const formatted = useUTC 
    ? formatInTimeZone(dateObj, 'UTC', formatStr)
    : format(dateObj, formatStr)
  
  // Get the month index (0-11)
  const month = useUTC 
    ? new Date(dateObj.toISOString()).getUTCMonth()
    : dateObj.getMonth()
  
  // Replace MMM with Indonesian month abbreviation
  if (formatStr.includes('MMM')) {
    const monthName = INDONESIAN_MONTHS_SHORT[month]
    // Replace the English month with Indonesian
    const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    let result = formatted
    englishMonths.forEach((engMonth, index) => {
      if (result.includes(engMonth)) {
        result = result.replace(engMonth, INDONESIAN_MONTHS_SHORT[index])
      }
    })
    return result
  }
  
  return formatted
}

/**
 * Format date in short format (date only)
 * @param date - Date string or Date object
 * @param useUTC - Whether to display in UTC (default: true)
 * @returns Formatted date string like "01 Agu 2025"
 */
export function formatShortDate(date: string | Date | null | undefined, useUTC = true): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatted = formatWithIndonesianMonth(dateObj, 'dd MMM yyyy', useUTC)
  
  return formatted
}

/**
 * Format date in long format (date and time)
 * @param date - Date string or Date object
 * @param useUTC - Whether to display in UTC (default: true)
 * @returns Formatted date string like "01 Agu 2025 17:00"
 */
export function formatLongDate(date: string | Date | null | undefined, useUTC = true): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatted = formatWithIndonesianMonth(dateObj, 'dd MMM yyyy HH:mm', useUTC)
  
  return formatted
}

/**
 * Format date for display based on context
 * @param date - Date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    showTime?: boolean
    useUTC?: boolean
    format?: string
  } = {}
): string {
  const { showTime = false, useUTC = true, format: customFormat } = options
  
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (customFormat) {
    if (useUTC) {
      return formatInTimeZone(dateObj, 'UTC', customFormat)
    }
    return format(dateObj, customFormat)
  }
  
  return showTime ? formatLongDate(date, useUTC) : formatShortDate(date, useUTC)
}

/**
 * Format date for input fields (ISO format for datetime-local inputs)
 * @param date - Date string or Date object
 * @returns ISO formatted date string for input fields
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm format for datetime-local
}

/**
 * Format date for API submission (ISO format)
 * @param date - Date string or Date object
 * @returns ISO formatted date string
 */
export function formatDateForAPI(date: string | Date | null | undefined): string | null {
  if (!date) return null
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString()
}

/**
 * Get relative time description
 * @param date - Date string or Date object
 * @returns Relative time string like "2 hours ago", "in 3 days", etc.
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = dateObj.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)
  
  if (Math.abs(diffMins) < 60) {
    if (diffMins === 0) return 'now'
    return diffMins > 0 ? `in ${diffMins} minutes` : `${Math.abs(diffMins)} minutes ago`
  }
  
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`
  }
  
  if (Math.abs(diffDays) < 30) {
    return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`
  }
  
  // For dates further than 30 days, just show the formatted date
  return formatShortDate(date)
}