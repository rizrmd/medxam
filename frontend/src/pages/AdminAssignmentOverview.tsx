import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Users, 
  UserCheck, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Clock,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface DeliveryAssignment {
  delivery: {
    id: number
    name: string
    display_name?: string
    scheduled_at: string
    duration: number
    last_status?: string
    is_finished?: string
  }
  committee: Array<{
    user: { id: number; name: string; username: string }
    assigned_at: string
    is_active: boolean
  }>
  scorers: Array<{
    user: { id: number; name: string; username: string }
    assigned_at: string
    is_active: boolean
  }>
}

export function AdminAssignmentOverview() {
  const [state, setState] = useLocalStateSync({
    deliveries: [] as any[],
    assignments: {} as Record<number, DeliveryAssignment>,
    stats: {
      totalDeliveries: 0,
      assignedDeliveries: 0,
      activeCommittee: 0,
      activeScorers: 0
    },
    isLoading: true,
    error: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setState.isLoading = true
    setState.error = ''
    
    try {
      // Load all deliveries
      const deliveriesResponse = await apiClient.deliveries.list()
      if (deliveriesResponse.error) {
        setState.error = deliveriesResponse.error
        return
      }

      const deliveries = deliveriesResponse.data?.data || []
      setState.deliveries = deliveries

      // Load assignments for each delivery
      const assignmentPromises = deliveries.slice(0, 10).map(async (delivery: any) => {
        try {
          const assignmentResponse = await apiClient.deliveries.getAssignments(delivery.id.toString())
          if (!assignmentResponse.error && assignmentResponse.data) {
            return {
              id: delivery.id,
              assignment: {
                delivery,
                committee: assignmentResponse.data.committee || [],
                scorers: assignmentResponse.data.scorers || []
              }
            }
          }
        } catch (error) {
          console.error(`Error loading assignments for delivery ${delivery.id}:`, error)
        }
        return null
      })

      const assignmentResults = await Promise.all(assignmentPromises)
      const assignmentsMap: Record<number, DeliveryAssignment> = {}
      
      assignmentResults.forEach(result => {
        if (result) {
          assignmentsMap[result.id] = result.assignment
        }
      })

      setState.assignments = assignmentsMap

      // Calculate stats
      const totalDeliveries = deliveries.length
      const assignedDeliveries = Object.keys(assignmentsMap).length
      const activeCommittee = Object.values(assignmentsMap).reduce(
        (count, assignment) => count + assignment.committee.filter(c => c.is_active).length, 0
      )
      const activeScorers = Object.values(assignmentsMap).reduce(
        (count, assignment) => count + assignment.scorers.filter(s => s.is_active).length, 0
      )

      setState.stats = { totalDeliveries, assignedDeliveries, activeCommittee, activeScorers }

    } catch (error) {
      setState.error = 'Failed to load assignment data'
      console.error('Error loading data:', error)
    } finally {
      setState.isLoading = false
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle className="w-4 h-4 text-green-500" />
      case 'paused':
        return <PauseCircle className="w-4 h-4 text-yellow-500" />
      case 'finished':
        return <StopCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (state.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Assignment Overview</h1>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading assignment data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assignment Overview</h1>
          <p className="text-gray-600">Overview of committee and scorer assignments across all deliveries</p>
        </div>
        <Link to="/back-office/committee-scorers">
          <Button>
            <UserCheck className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
        </Link>
      </div>

      {/* Error Display */}
      {state.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{state.error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{state.stats.totalDeliveries}</p>
                <p className="text-sm text-gray-600">Total Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{state.stats.assignedDeliveries}</p>
                <p className="text-sm text-gray-600">With Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{state.stats.activeCommittee}</p>
                <p className="text-sm text-gray-600">Committee Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">{state.stats.activeScorers}</p>
                <p className="text-sm text-gray-600">Active Scorers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Delivery Assignments</CardTitle>
          <CardDescription>
            Latest 10 deliveries with their committee and scorer assignments
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {Object.keys(state.assignments).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assignment Data</h3>
              <p>No delivery assignments found. Start by assigning committee members and scorers to deliveries.</p>
              <div className="mt-4">
                <Link to="/back-office/delivery">
                  <Button variant="outline">
                    View Deliveries
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(state.assignments).map((assignment) => (
                <Card key={assignment.delivery.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium">
                            {assignment.delivery.display_name || assignment.delivery.name}
                          </h3>
                          {getStatusIcon(assignment.delivery.last_status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Scheduled: {formatDateTime(assignment.delivery.scheduled_at)}</p>
                          <p>Duration: {assignment.delivery.duration} minutes</p>
                        </div>
                      </div>
                      <Link to={`/back-office/delivery/${assignment.delivery.id}/assignments`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </Link>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Committee */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                          <UserCheck className="w-4 h-4 mr-1" />
                          Committee ({assignment.committee.filter(c => c.is_active).length})
                        </h4>
                        {assignment.committee.length === 0 ? (
                          <p className="text-sm text-gray-500">No committee assigned</p>
                        ) : (
                          <div className="space-y-1">
                            {assignment.committee.filter(c => c.is_active).map((member) => (
                              <div key={member.user.id} className="text-sm">
                                <Badge variant="outline" className="mr-2">
                                  {member.user.name}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Scorers */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Scorers ({assignment.scorers.filter(s => s.is_active).length})
                        </h4>
                        {assignment.scorers.length === 0 ? (
                          <p className="text-sm text-gray-500">No scorers assigned</p>
                        ) : (
                          <div className="space-y-1">
                            {assignment.scorers.filter(s => s.is_active).map((scorer) => (
                              <div key={scorer.user.id} className="text-sm">
                                <Badge variant="outline" className="mr-2">
                                  {scorer.user.name}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}