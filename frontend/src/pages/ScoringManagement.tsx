import { useLocalStateSync } from '@/hooks/useLocalState'
import { useCallback, useEffect } from 'react'
import { useFastInput } from '@/hooks/useFastInput'
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
import { Calculator, Calendar, Clock, Edit, Search, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { MainContent } from '@/components/layout/MainContent'
import { useAuthStore } from '@/store/authStore'

interface DeliveryForScoring {
  id: number
  name: string
  scheduled_at: string
  duration: number
  status: string
  participants_count?: number
  attempts_count?: number
  scored_count?: number
}

export function ScoringManagement() {
  const searchNameInput = useFastInput('')
  const { user } = useAuthStore()
  const [state, setState] = useLocalStateSync({
    selectedDate: '',
    deliveries: [] as DeliveryForScoring[],
    loading: true,
    error: '',
    currentPage: 1,
    totalPages: 1
  })
  const navigate = useNavigate()

  // Check user roles
  const hasAdminRole = user?.roles?.some(role => 
    role.name === 'Administrator' || role.name === 'administrator'
  )
  
  const hasCommitteeRole = user?.roles?.some(role => 
    role.name === 'Scorer / Committee' || 
    role.name === 'scorer' || 
    role.name === 'committee'
  )

  const isCommitteeOnly = hasCommitteeRole && !hasAdminRole

  const fetchDeliveries = useCallback(async () => {
    try {
      setState.loading = true
      
      // Different endpoints based on user role
      let response
      if (isCommitteeOnly) {
        // For committee/scorer, fetch only assigned deliveries
        response = await apiClient.myDeliveries('scorer')
        // Filter for finished deliveries only
        if (response.data) {
          const filteredData = response.data.filter((d: any) => 
            d.delivery?.status === 'finished' || 
            d.delivery?.is_finished ||
            new Date(d.delivery?.scheduled_at) < new Date()
          ).map((assignment: any) => ({
            id: assignment.delivery?.id,
            name: assignment.delivery?.name,
            scheduled_at: assignment.delivery?.scheduled_at,
            duration: assignment.delivery?.duration,
            status: assignment.delivery?.status || 'finished',
            participants_count: assignment.delivery?.participants_count || 0
          }))
          
          response = {
            ...response,
            data: {
              data: filteredData,
              pagination: { total_pages: 1 }
            }
          }
        }
      } else {
        // For admin, fetch all deliveries
        response = await apiClient.scoring.getDeliveries(state.currentPage)
      }
      
      if (response.error) {
        setState.error = response.error
        setState.deliveries = []
      } else {
        setState.deliveries = response.data?.data || []
        setState.totalPages = response.data?.pagination?.total_pages || 1
        setState.error = ''
      }
    } catch (error) {
      setState.error = isCommitteeOnly 
        ? 'Failed to load your assigned deliveries' 
        : 'Failed to load deliveries for scoring'
      setState.deliveries = []
      console.error('Error loading deliveries:', error)
    } finally {
      setState.loading = false
    }
  }, [state.currentPage, setState, isCommitteeOnly])

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    fetchDeliveries()
  }, [fetchDeliveries])

  const handleClear = useCallback(() => {
    searchNameInput.setValue('')
    setState.selectedDate = ''
    setState.currentPage = 1
    fetchDeliveries()
  }, [searchNameInput, setState, fetchDeliveries])

  const filteredDeliveries = state.deliveries.filter(delivery => {
    const searchTerm = searchNameInput.getValue().toLowerCase()
    const matchesSearch = !searchTerm || delivery.name?.toLowerCase().includes(searchTerm)
    const matchesDate = !state.selectedDate || 
      (delivery.scheduled_at && 
       new Date(delivery.scheduled_at).toISOString().split('T')[0] === state.selectedDate)
    return matchesSearch && matchesDate
  })

  useEffect(() => {
    fetchDeliveries()
  }, [state.currentPage])

  const getStatusBadge = (delivery: DeliveryForScoring) => {
    const now = new Date()
    const scheduledDate = new Date(delivery.scheduled_at)
    const isExpired = now > scheduledDate
    
    if (delivery.status === 'finished' || delivery.status === 'completed' || isExpired) {
      return 'bg-yellow-100 text-yellow-800'
    }
    
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    }
    return colors[delivery.status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (delivery: DeliveryForScoring) => {
    const now = new Date()
    const scheduledDate = new Date(delivery.scheduled_at)
    const isExpired = now > scheduledDate
    
    if (delivery.status === 'finished' || delivery.status === 'completed' || isExpired) {
      return 'Ready for Scoring'
    }
    
    return delivery.status
  }

  if (state.loading) {
    return (
      <MainContent>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading deliveries...</p>
          </div>
        </div>
      </MainContent>
    )
  }

  if (state.error) {
    return (
      <MainContent>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{state.error}</p>
            <Button onClick={fetchDeliveries}>Try Again</Button>
          </div>
        </div>
      </MainContent>
    )
  }

  return (
    <MainContent>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        {isCommitteeOnly && (
          <div className="text-sm text-muted-foreground">
            Showing only deliveries assigned to you
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search a Name"
                {...searchNameInput.inputProps}
                className="w-full"
              />
            </div>
            <Input
              type="date"
              value={state.selectedDate}
              onChange={(e) => setState.selectedDate = e.target.value}
              className="w-48"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
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
                <TableHead>PARTICIPANTS</TableHead>
                <TableHead>SCHEDULE</TableHead>
                <TableHead>DURATION</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No deliveries available for scoring
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{delivery.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {delivery.participants_count || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(delivery.scheduled_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {delivery.duration} minutes
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery)}`}>
                        {getStatusText(delivery)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/back-office/scoring/${delivery.id}`)}
                        title="View scoring details"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {state.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (state.currentPage > 1) {
                setState.currentPage = state.currentPage - 1
              }
            }}
            disabled={state.currentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(10, state.totalPages) }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === state.currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => setState.currentPage = page}
            >
              {page}
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (state.currentPage < state.totalPages) {
                setState.currentPage = state.currentPage + 1
              }
            }}
            disabled={state.currentPage === state.totalPages}
          >
            Next
          </Button>
        </div>
      )}
      </div>
    </MainContent>
  )
}