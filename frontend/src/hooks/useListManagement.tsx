import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { DateFilterValue } from '@/components/ui/date-filter'

export interface ListState<T> {
  items: T[]
  loading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  total: number
  perPage: number
  searchQuery: string
  dateFilter: DateFilterValue
  additionalFilters: Record<string, any>
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface ListConfig {
  endpoint: string
  perPage?: number
  initialFilters?: Record<string, any>
  initialSortBy?: string
  initialSortOrder?: 'asc' | 'desc'
  dateField?: string
}

export interface ListActions<T> {
  setPage: (page: number) => void
  setSearchQuery: (query: string) => void
  setDateFilter: (filter: DateFilterValue) => void
  setAdditionalFilter: (key: string, value: any) => void
  setSort: (field: string, order?: 'asc' | 'desc') => void
  refresh: () => Promise<void>
  clearFilters: () => void
  applyFilters: () => void
}

export function useListManagement<T = any>(
  config: ListConfig
): [ListState<T>, ListActions<T>] {
  const [state, setState] = useState<ListState<T>>({
    items: [],
    loading: true,
    error: null,
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: config.perPage || 15,
    searchQuery: '',
    dateFilter: { mode: 'none' },
    additionalFilters: config.initialFilters || {},
    sortBy: config.initialSortBy || 'created_at',
    sortOrder: config.initialSortOrder || 'desc',
  })

  // Applied filters state (for deferred application)
  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: '',
    dateFilter: { mode: 'none' } as DateFilterValue,
    additionalFilters: config.initialFilters || {},
  })

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    
    // Pagination
    params.append('page', state.currentPage.toString())
    params.append('per_page', state.perPage.toString())
    
    // Sorting
    params.append('sort_by', state.sortBy)
    params.append('sort_order', state.sortOrder)
    
    // Search
    if (appliedFilters.searchQuery) {
      params.append('search', appliedFilters.searchQuery)
    }
    
    // Date filtering
    const dateFilter = appliedFilters.dateFilter
    if (dateFilter.mode !== 'none') {
      params.append('date_filter_mode', dateFilter.mode)
      params.append('date_field', config.dateField || 'created_at')
      
      switch (dateFilter.mode) {
        case 'exact':
          if (dateFilter.exactDate) {
            params.append('exact_date', dateFilter.exactDate)
          }
          break
        case 'month':
          if (dateFilter.month) {
            params.append('month', dateFilter.month)
          }
          break
        case 'year':
          if (dateFilter.year) {
            params.append('year', dateFilter.year)
          }
          break
        case 'range':
          if (dateFilter.startDate) {
            params.append('start_date', dateFilter.startDate)
          }
          if (dateFilter.endDate) {
            params.append('end_date', dateFilter.endDate)
          }
          break
      }
    }
    
    // Additional filters
    Object.entries(appliedFilters.additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    
    return params
  }, [state.currentPage, state.perPage, state.sortBy, state.sortOrder, 
      appliedFilters, config.dateField])

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const params = buildQueryParams()
      const response = await apiClient.get(`${config.endpoint}?${params.toString()}`)
      
      if (response.error) {
        setState(prev => ({ ...prev, error: response.error, loading: false }))
      } else if ((response as any).data) {
        const data = (response as any).data
        setState(prev => ({
          ...prev,
          items: Array.isArray(data.data) ? data.data : [],
          total: data.total || 0,
          totalPages: data.total_pages || 1,
          loading: false,
        }))
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to load data',
        loading: false 
      }))
    }
  }, [config.endpoint, buildQueryParams])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData()
  }, [state.currentPage, state.sortBy, state.sortOrder, appliedFilters])

  // Actions
  const actions: ListActions<T> = {
    setPage: (page: number) => {
      setState(prev => ({ ...prev, currentPage: page }))
    },
    
    setSearchQuery: (query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }))
    },
    
    setDateFilter: (filter: DateFilterValue) => {
      setState(prev => ({ ...prev, dateFilter: filter }))
    },
    
    setAdditionalFilter: (key: string, value: any) => {
      setState(prev => ({
        ...prev,
        additionalFilters: { ...prev.additionalFilters, [key]: value }
      }))
    },
    
    setSort: (field: string, order?: 'asc' | 'desc') => {
      setState(prev => ({
        ...prev,
        sortBy: field,
        sortOrder: order || (prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc')
      }))
    },
    
    refresh: fetchData,
    
    clearFilters: () => {
      setState(prev => ({
        ...prev,
        searchQuery: '',
        dateFilter: { mode: 'none' },
        additionalFilters: config.initialFilters || {},
        currentPage: 1,
      }))
      setAppliedFilters({
        searchQuery: '',
        dateFilter: { mode: 'none' },
        additionalFilters: config.initialFilters || {},
      })
    },
    
    applyFilters: () => {
      setAppliedFilters({
        searchQuery: state.searchQuery,
        dateFilter: state.dateFilter,
        additionalFilters: state.additionalFilters,
      })
      setState(prev => ({ ...prev, currentPage: 1 }))
    },
  }

  return [state, actions]
}

// Type-safe hook factory for specific entities
export function createListHook<T>(endpoint: string, config?: Partial<ListConfig>) {
  return () => useListManagement<T>({ endpoint, ...config })
}