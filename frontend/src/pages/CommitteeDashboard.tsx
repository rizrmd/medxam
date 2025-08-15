import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Clock, 
  Users, 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Timer,
  User
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface DeliveryAssignment {
  delivery: {
    id: number
    exam_id: number
    group_id: number
    name: string
    scheduled_at: string
    duration: number
    ended_at?: string
    is_anytime: boolean
    automatic_start: boolean
    is_finished?: string
    last_status?: string
    display_name?: string
    started_at?: string
    participant_count?: number
    completed_count?: number
    in_progress_count?: number
  }
  committee: Array<{
    user: {
      id: number
      name: string
      username: string
      email: string
    }
    assigned_at: string
    is_active: boolean
  }>
  scorers: Array<{
    user: {
      id: number
      name: string
      username: string
      email: string
    }
    assigned_at: string
    is_active: boolean
  }>
}

export function CommitteeDashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [state, setState] = useLocalStateSync({
    deliveries: [] as DeliveryAssignment[],
    isLoading: true,
    error: ''
  })
  const [confirmStart, setConfirmStart] = useState<{ show: boolean; deliveryId: number | null; deliveryName: string }>({
    show: false,
    deliveryId: null,
    deliveryName: ''
  })

  // Check authentication and role
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/committee/login')
      return
    }

    const hasCommitteeRole = user?.roles?.some(role => 
      role.name === 'Scorer / Committee' || role.name === 'scorer'
    )
    
    if (!hasCommitteeRole) {
      navigate('/login')
      return
    }

    loadUserDeliveries()
  }, [isAuthenticated, user, navigate])

  const loadUserDeliveries = async () => {
    setState.isLoading = true
    setState.error = ''
    
    try {
      const response = await apiClient.myDeliveries()
      
      if (response.error) {
        setState.error = response.error
      } else {
        setState.deliveries = response.data || []
      }
    } catch (error) {
      setState.error = 'Failed to load deliveries'
      console.error('Error loading deliveries:', error)
    } finally {
      setState.isLoading = false
    }
  }

  const controlDelivery = async (deliveryId: number, action: string) => {
    try {
      const response = await apiClient.deliveries.control(deliveryId.toString(), action)
      
      if (response.error) {
        toast({
          title: "Error",
          description: `Failed to ${action} delivery: ${response.error}`,
          variant: "destructive",
        })
      } else {
        // Update local state based on action
        setState.deliveries = state.deliveries.map(assignment => {
          if (assignment.delivery.id === deliveryId) {
            const updatedDelivery = { ...assignment.delivery }
            
            switch(action) {
              case 'start':
                updatedDelivery.last_status = 'started'
                updatedDelivery.started_at = new Date().toISOString()
                break
              case 'pause':
                updatedDelivery.last_status = 'paused'
                break
              case 'stop':
                updatedDelivery.is_finished = new Date().toISOString()
                updatedDelivery.last_status = 'stopped'
                break
              case 'resume':
                updatedDelivery.last_status = 'started'
                break
            }
            
            return { ...assignment, delivery: updatedDelivery }
          }
          return assignment
        })
        
        // Show success message with appropriate icon and description
        const actionMessages = {
          start: { title: "Exam Started", description: "The exam delivery has been started successfully." },
          pause: { title: "Exam Paused", description: "The exam has been paused. Participants cannot continue until resumed." },
          resume: { title: "Exam Resumed", description: "The exam has been resumed. Participants can continue." },
          stop: { title: "Exam Stopped", description: "The exam has been stopped and finalized." }
        }
        
        const message = actionMessages[action as keyof typeof actionMessages] || { 
          title: "Success", 
          description: `Delivery ${action} successful` 
        }
        
        toast({
          title: message.title,
          description: message.description,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} delivery. Please try again.`,
        variant: "destructive",
      })
      console.error('Error controlling delivery:', error)
    }
  }

  const getDeliveryStatus = (delivery: DeliveryAssignment['delivery']) => {
    if (delivery.is_finished) {
      return { label: 'Finished', color: 'bg-gray-500' }
    }
    if (delivery.last_status === 'started' || delivery.last_status === 'running' || delivery.last_status === 'ongoing') {
      return { label: 'Running', color: 'bg-green-500' }
    }
    if (delivery.last_status === 'paused') {
      return { label: 'Paused', color: 'bg-yellow-500' }
    }
    if (delivery.last_status === 'stopped') {
      return { label: 'Stopped', color: 'bg-red-500' }
    }
    return { label: 'Not Started', color: 'bg-blue-500' }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }
  
  const getRemainingTime = (delivery: DeliveryAssignment['delivery']) => {
    if (!delivery.started_at || delivery.is_finished) {
      return 'N/A'
    }
    
    const startTime = new Date(delivery.started_at).getTime()
    const durationMs = delivery.duration * 60 * 1000 // Convert minutes to milliseconds
    const endTime = startTime + durationMs
    const now = Date.now()
    
    if (now >= endTime) {
      return 'Time expired'
    }
    
    const remainingMs = endTime - now
    const remainingMinutes = Math.floor(remainingMs / 60000)
    const remainingHours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60
    
    if (remainingHours > 0) {
      return `${remainingHours}h ${minutes}m`
    }
    return `${minutes} minutes`
  }

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading deliveries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {state.error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{state.error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {state.deliveries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Deliveries Assigned</h3>
              <p className="text-gray-600">You haven't been assigned to any exam deliveries yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6">
              {state.deliveries.map((assignment) => {
                const status = getDeliveryStatus(assignment.delivery)
                const isCommittee = assignment.committee.some(c => c.user.id === user?.id)
                const isScorer = assignment.scorers.some(s => s.user.id === user?.id)
                
                return (
                  <Card key={assignment.delivery.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            {assignment.delivery.display_name || assignment.delivery.name}
                          </CardTitle>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDateTime(assignment.delivery.scheduled_at)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Timer className="w-4 h-4" />
                                <span>{assignment.delivery.duration} minutes</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Role Badges */}
                      <div className="mb-4">
                        <div className="flex space-x-2">
                          {isCommittee && (
                            <Badge variant="outline" className="border-blue-200 text-blue-800">
                              <User className="w-3 h-3 mr-1" />
                              Committee Member
                            </Badge>
                          )}
                          {isScorer && (
                            <Badge variant="outline" className="border-green-200 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Scorer
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Committee Controls (only for committee members) */}
                      {isCommittee && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-3">Committee Controls</h4>
                          
                          {/* Show remaining time if delivery is running */}
                          {(assignment.delivery.last_status === 'started' || assignment.delivery.last_status === 'running' || assignment.delivery.last_status === 'ongoing' || assignment.delivery.last_status === 'paused') && !assignment.delivery.is_finished && (
                            <div className="mb-3 flex items-center space-x-2 text-sm">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-900">
                                Time Remaining: {getRemainingTime(assignment.delivery)}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            {/* Show Start button only if not started */}
                            {(!assignment.delivery.last_status || assignment.delivery.last_status === 'stopped') && !assignment.delivery.is_finished && (
                              <Button
                                size="sm"
                                onClick={() => setConfirmStart({
                                  show: true,
                                  deliveryId: assignment.delivery.id,
                                  deliveryName: assignment.delivery.display_name || assignment.delivery.name
                                })}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Start Exam
                              </Button>
                            )}
                            
                            {/* Show Resume button only if paused */}
                            {assignment.delivery.last_status === 'paused' && !assignment.delivery.is_finished && (
                              <Button
                                size="sm"
                                onClick={() => controlDelivery(assignment.delivery.id, 'resume')}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Resume
                              </Button>
                            )}
                            
                            {/* Show Pause button only if running */}
                            {(assignment.delivery.last_status === 'started' || assignment.delivery.last_status === 'running' || assignment.delivery.last_status === 'ongoing') && !assignment.delivery.is_finished && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => controlDelivery(assignment.delivery.id, 'pause')}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                            )}
                            
                            {/* Show message if finished */}
                            {assignment.delivery.is_finished && (
                              <span className="text-sm text-gray-600 py-1">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Exam completed
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Participant Summary */}
                      {(assignment.delivery.last_status === 'started' || assignment.delivery.last_status === 'paused' || assignment.delivery.is_finished) && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">Participant Progress</h4>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {assignment.delivery.participant_count || 0}
                              </div>
                              <div className="text-sm text-gray-600">Total Participants</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">
                                {assignment.delivery.in_progress_count || 0}
                              </div>
                              <div className="text-sm text-gray-600">In Progress</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {assignment.delivery.completed_count || 0}
                              </div>
                              <div className="text-sm text-gray-600">Completed</div>
                            </div>
                          </div>
                          
                          {/* Live Progress Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate(`/committee/delivery/${assignment.delivery.id}/live-progress`)}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            View Live Participant Progress
                          </Button>
                        </div>
                      )}

                      {/* Assignment Info */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {assignment.committee.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Committee Members</h4>
                            <div className="space-y-1">
                              {assignment.committee.map((member) => (
                                <div key={member.user.id} className="text-sm text-gray-600">
                                  {member.user.name} ({member.user.username})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {assignment.scorers.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Scorers</h4>
                            <div className="space-y-1">
                              {assignment.scorers.map((scorer) => (
                                <div key={scorer.user.id} className="text-sm text-gray-600">
                                  {scorer.user.name} ({scorer.user.username})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Scorer Actions */}
                      {isScorer && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/scorer/delivery/${assignment.delivery.id}/results`)}
                            >
                              View Results
                            </Button>
                            <Button
                              onClick={() => navigate(`/scorer/delivery/${assignment.delivery.id}/scoring`)}
                              disabled={!assignment.delivery.is_finished}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Score Results
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Confirmation Dialog for Starting Delivery */}
        <AlertDialog open={confirmStart.show} onOpenChange={(open) => !open && setConfirmStart({ show: false, deliveryId: null, deliveryName: '' })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Exam Delivery</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to start "<strong>{confirmStart.deliveryName}</strong>"? 
                <br />
                <br />
                Once started:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Participants will be able to access the exam</li>
                  <li>The timer will begin counting down</li>
                  <li>You can pause but cannot fully stop until time expires</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (confirmStart.deliveryId) {
                  controlDelivery(confirmStart.deliveryId, 'start')
                  setConfirmStart({ show: false, deliveryId: null, deliveryName: '' })
                }
              }}>
                Start Exam
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}