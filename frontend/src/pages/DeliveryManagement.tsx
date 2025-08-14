import { useEffect, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, Edit, Trash2, Plus, Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatLongDate, formatDateForInput } from '@/lib/date-utils'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { DateFilterAdvanced, getDateFilterRange } from '@/components/ui/date-filter-advanced'
import type { DateFilterValue } from '@/components/ui/date-filter-advanced'

interface DeliveryFormData {
  name: string
  exam_id: number
  group_id: number
  start_date: string
  end_date: string
  duration: number
  status: string
}

export function DeliveryManagement() {
  const [, startTransition] = useTransition()
  const searchInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    dateFilter: undefined as DateFilterValue | undefined,
    appliedDateFilter: undefined as DateFilterValue | undefined,
    appliedSearchName: '',
    deliveries: [] as any[],
    loading: true,
    error: null as string | null,
    currentPage: 1,
    totalPages: 1,
    total: 0,
    showCreateDialog: false,
    showEditDialog: false,
    editingDelivery: null as any,
    formData: {
      name: '',
      exam_id: 0,
      group_id: 0,
      start_date: '',
      end_date: '',
      duration: 120,
      status: 'scheduled'
    } as DeliveryFormData
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchDeliveries()
  }, [state.currentPage, state.appliedSearchName, state.appliedDateFilter])

  const fetchDeliveries = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      // Build query params for server-side filtering
      const params = new URLSearchParams()
      params.append('page', state.currentPage.toString())
      params.append('per_page', '10')
      if (state.appliedSearchName) params.append('name', state.appliedSearchName)
      
      // Add date filter params based on filter type
      if (state.appliedDateFilter) {
        const dateRange = getDateFilterRange(state.appliedDateFilter)
        // Format dates for filtering
        const formatDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        
        // Set the date filter parameters that the backend expects
        params.append('date_field', 'scheduled_at')
        
        // Use the appropriate filter mode based on the selection
        switch (state.appliedDateFilter.mode) {
          case 'exact':
            params.append('date_filter_mode', 'exact')
            params.append('exact_date', formatDate(dateRange.from))
            break
          case 'month':
            params.append('date_filter_mode', 'month')
            const monthStr = `${dateRange.from.getFullYear()}-${String(dateRange.from.getMonth() + 1).padStart(2, '0')}`
            params.append('month', monthStr)
            break
          case 'year':
            params.append('date_filter_mode', 'year')
            params.append('year', dateRange.from.getFullYear().toString())
            break
          case 'range':
            params.append('date_filter_mode', 'range')
            params.append('start_date', formatDate(dateRange.from))
            params.append('end_date', formatDate(dateRange.to))
            break
        }
      }
      
      // Fetching deliveries with params
      const response = await apiClient.get(`/deliveries?${params.toString()}`)
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        // Handle paginated response
        const deliveryData = (response as any).data.data || []
        setState.deliveries = Array.isArray(deliveryData) ? deliveryData : []
        setState.total = (response as any).data.total || 0
        setState.totalPages = (response as any).data.total_pages || 1
      }
    } catch (err) {
      setState.error = 'Failed to load deliveries'
    } finally {
      setState.loading = false
    }
  }

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Apply search filters
    setState.appliedSearchName = searchInput.getValue()
    setState.appliedDateFilter = state.dateFilter
    setState.currentPage = 1
    // The useEffect will trigger fetchDeliveries automatically
  }, [searchInput, state.dateFilter, setState])

  const handleClear = useCallback(() => {
    // Clear all filters
    setState.dateFilter = undefined
    searchInput.clear()
    setState.appliedSearchName = ''
    setState.appliedDateFilter = undefined
    setState.currentPage = 1
  }, [setState, searchInput])

  const handleCreateDelivery = async () => {
    try {
      const response = await apiClient.deliveries.create(state.formData)
      
      if (response.error) {
        alert('Failed to create delivery: ' + response.error)
      } else {
        setState.showCreateDialog = false
        await fetchDeliveries()
        // Reset form
        setState.formData = {
          name: '',
          exam_id: 0,
          group_id: 0,
          start_date: '',
          end_date: '',
          duration: 120,
          status: 'scheduled'
        }
      }
    } catch (err) {
      alert('Failed to create delivery')
    }
  }

  const handleEditDelivery = async () => {
    if (!state.editingDelivery) return
    
    try {
      const response = await apiClient.deliveries.update(state.editingDelivery.id, state.formData)
      
      if (response.error) {
        alert('Failed to update delivery: ' + response.error)
      } else {
        setState.showEditDialog = false
        setState.editingDelivery = null
        await fetchDeliveries()
      }
    } catch (err) {
      alert('Failed to update delivery')
    }
  }

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery?')) return
    
    try {
      const response = await apiClient.deliveries.delete(id)
      
      if (response.error) {
        alert('Failed to delete delivery: ' + response.error)
      } else {
        await fetchDeliveries()
      }
    } catch (err) {
      alert('Failed to delete delivery')
    }
  }

  const openEditDialog = (delivery: any) => {
    setState.editingDelivery = delivery
    setState.formData = {
      name: delivery.name || '',
      exam_id: delivery.exam_id || 0,
      group_id: delivery.group_id || 0,
      start_date: formatDateForInput(delivery.scheduled_at || delivery.start_date),
      end_date: formatDateForInput(delivery.end_date),
      duration: delivery.duration || 120,
      status: delivery.status || 'scheduled'
    }
    setState.showEditDialog = true
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const renderPagination = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, state.currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(state.totalPages, start + maxVisible - 1)
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return (
      <div className="flex items-center justify-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          disabled={state.currentPage === 1}
          onClick={() => setState.currentPage = state.currentPage - 1}
        >
          Previous
        </Button>
        
        {start > 1 && (
          <>
            <Button
              variant={state.currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setState.currentPage = 1}
            >
              1
            </Button>
            {start > 2 && <span className="px-2">...</span>}
          </>
        )}
        
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === state.currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => setState.currentPage = page}
          >
            {page}
          </Button>
        ))}
        
        {end < state.totalPages && (
          <>
            {end < state.totalPages - 1 && <span className="px-2">...</span>}
            <Button
              variant={state.currentPage === state.totalPages ? "default" : "outline"}
              size="sm"
              onClick={() => setState.currentPage = state.totalPages}
            >
              {state.totalPages}
            </Button>
          </>
        )}
        
        <Button 
          variant="outline" 
          size="sm"
          disabled={state.currentPage === state.totalPages}
          onClick={() => setState.currentPage = state.currentPage + 1}
        >
          Next
        </Button>
      </div>
    )
  }

  if (state.loading && state.deliveries.length === 0) {
    return <Loading message="Loading deliveries..." />
  }

  if (state.error && state.deliveries.length === 0) {
    return <ErrorMessage error={state.error} onRetry={fetchDeliveries} />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Deliveries - IoNbEc</h1>
        <Button onClick={() => setState.showCreateDialog = true}>
          <Plus className="h-4 w-4 mr-2" />
          Delivery
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search name"
                {...searchInput.inputProps}
                className="w-full"
              />
            </div>
            <DateFilterAdvanced
              value={state.dateFilter}
              onChange={(value) => {
                startTransition(() => {
                  setState.dateFilter = value
                })
              }}
              placeholder="Filter by date"
              className="w-64"
            />
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DELIVERY NAME</TableHead>
                <TableHead>SCHEDULE</TableHead>
                <TableHead>DURATION</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.deliveries.length > 0 ? (
                state.deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <button 
                        className="font-medium text-left hover:text-primary cursor-pointer"
                        onClick={() => {
                          // Navigate to delivery details
                          navigate(`/back-office/delivery/${delivery.id}`)
                        }}
                      >
                        {delivery.name || `Delivery #${delivery.id}`}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatLongDate(delivery.scheduled_at || delivery.start_date || delivery.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {delivery.duration || 0} minutes
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery.status || 'scheduled')}`}>
                        {delivery.status || 'scheduled'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            // View delivery details
                            navigate(`/back-office/delivery/${delivery.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            // Edit delivery
                            openEditDialog(delivery)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteDelivery(delivery.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No deliveries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {state.totalPages > 1 && renderPagination()}
      
      {/* Create Dialog */}
      <Dialog open={state.showCreateDialog} onOpenChange={(open) => setState.showCreateDialog = open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Delivery</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={state.formData.name}
                onChange={(e) => setState.formData = {...state.formData, name: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={state.formData.start_date}
                onChange={(e) => setState.formData = {...state.formData, start_date: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                End Date
              </Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={state.formData.end_date}
                onChange={(e) => setState.formData = {...state.formData, end_date: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                value={state.formData.duration}
                onChange={(e) => setState.formData = {...state.formData, duration: parseInt(e.target.value) || 0}}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setState.showCreateDialog = false}>
              Cancel
            </Button>
            <Button onClick={handleCreateDelivery}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={state.showEditDialog} onOpenChange={(open) => setState.showEditDialog = open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Update the delivery details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={state.formData.name}
                onChange={(e) => setState.formData = {...state.formData, name: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="edit-start_date"
                type="datetime-local"
                value={state.formData.start_date}
                onChange={(e) => setState.formData = {...state.formData, start_date: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-end_date" className="text-right">
                End Date
              </Label>
              <Input
                id="edit-end_date"
                type="datetime-local"
                value={state.formData.end_date}
                onChange={(e) => setState.formData = {...state.formData, end_date: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-duration" className="text-right">
                Duration (min)
              </Label>
              <Input
                id="edit-duration"
                type="number"
                value={state.formData.duration}
                onChange={(e) => setState.formData = {...state.formData, duration: parseInt(e.target.value) || 0}}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setState.showEditDialog = false
              setState.editingDelivery = null
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditDelivery}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}