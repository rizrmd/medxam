import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft,
  Clock, 
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Circle
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MainContent } from '@/components/layout/MainContent'

interface ParticipantProgress {
  participant: {
    id: number
    name: string
    email: string
    identifier: string
  }
  attempt: {
    id: number
    started_at: string
    ended_at?: string
    last_activity?: string
    questions_answered: number
    total_questions: number
    status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
  }
}

export function LiveProgress() {
  const { deliveryId } = useParams<{ deliveryId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [state, setState] = useLocalStateSync({
    participants: [] as ParticipantProgress[],
    deliveryInfo: null as any,
    isLoading: true,
    error: '',
    isConnected: false,
    lastUpdated: new Date()
  })

  const connectWebSocket = () => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const wsUrl = `${protocol}//${host}:8080/api/deliveries/${deliveryId}/ws`
    
    console.log('Connecting to WebSocket:', wsUrl)
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setState.isConnected = true
      setState.error = ''
      
      // Send authentication message
      const authMessage = {
        type: 'auth',
        session_id: user?.sessionId || 'anonymous'
      }
      ws.send(JSON.stringify(authMessage))
      console.log('Sent auth message:', authMessage)
      
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('Received message:', message)
        
        if (message.type === 'auth_response') {
          if (message.success) {
            console.log('Authentication successful for delivery:', message.delivery_id)
          } else {
            console.error('Authentication failed:', message.message)
            setState.error = `Authentication failed: ${message.message}`
          }
        } else if (message.type === 'progress_update') {
          setState.participants = message.data.participants || []
          setState.deliveryInfo = message.data.delivery
          setState.lastUpdated = new Date(message.timestamp)
        } else if (message.type === 'pong') {
          console.log('Received pong from server')
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setState.error = 'Connection error. Retrying...'
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setState.isConnected = false
      wsRef.current = null
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connectWebSocket()
      }, 3000)
    }
  }

  // Initial load to get data immediately
  const loadInitialData = async () => {
    try {
      const response = await apiClient.deliveries.getParticipantProgress(deliveryId!)
      
      if (response.error) {
        setState.error = response.error
        setState.participants = [] // Set empty array to allow component to render
      } else {
        setState.participants = response.data.participants || []
        setState.deliveryInfo = response.data.delivery
        setState.lastUpdated = new Date()
      }
    } catch (error) {
      setState.error = 'Failed to load participant progress'
      setState.participants = [] // Set empty array to allow component to render
      console.error('Error loading progress:', error)
    } finally {
      setState.isLoading = false
    }
  }

  useEffect(() => {
    // Load initial data
    loadInitialData()
    
    // Connect WebSocket for real-time updates
    connectWebSocket()
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [deliveryId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>
      case 'abandoned':
        return <Badge className="bg-red-500 text-white">
          {!isDeliveryActive() ? 'Incomplete' : 'Abandoned'}
        </Badge>
      default:
        return <Badge className="bg-gray-500 text-white">Not Started</Badge>
    }
  }

  const calculateTimeSpent = (startedAt: string, endedAt?: string) => {
    if (!startedAt) return 'Not started'
    
    const start = new Date(startedAt).getTime()
    const end = endedAt ? new Date(endedAt).getTime() : Date.now()
    const diffMs = end - start
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutes`
  }

  const getProgressPercentage = (answered: number, total: number) => {
    if (total === 0) return 0
    return Math.round((answered / total) * 100)
  }

  const isParticipantOnline = (lastActivity?: string) => {
    if (!lastActivity) return false
    const lastActivityTime = new Date(lastActivity).getTime()
    const now = new Date().getTime()
    const timeDiff = now - lastActivityTime
    // Consider online if activity within last 2 minutes
    return timeDiff < 2 * 60 * 1000
  }

  const isDeliveryActive = () => {
    if (!state.deliveryInfo) return true // Assume active if no info yet
    
    const now = new Date()
    const startDate = state.deliveryInfo.start_date ? new Date(state.deliveryInfo.start_date) : null
    const endDate = state.deliveryInfo.end_date ? new Date(state.deliveryInfo.end_date) : null
    
    // Check if delivery hasn't started yet
    if (startDate && now < startDate) return false
    
    // Check if delivery has ended
    if (endDate && now > endDate) return false
    
    // Check delivery status
    if (state.deliveryInfo.status === 'completed' || 
        state.deliveryInfo.status === 'expired' || 
        state.deliveryInfo.status === 'cancelled') {
      return false
    }
    
    return true
  }

  const getAdjustedStatus = (originalStatus: string) => {
    // If delivery has ended, show all "in_progress" as "abandoned" or "incomplete"
    if (!isDeliveryActive() && originalStatus === 'in_progress') {
      return 'abandoned'
    }
    return originalStatus
  }

  // Header actions for DashboardLayout
  const headerActions = (
    <div className="flex items-center gap-3">
      <Badge variant={state.isConnected ? 'default' : 'destructive'} className="font-normal">
        {state.isConnected ? (
          <><Wifi className="w-3 h-3 mr-1" /> Live</>
        ) : (
          <><WifiOff className="w-3 h-3 mr-1" /> Reconnecting...</>
        )}
      </Badge>
      <span className="text-sm text-muted-foreground">
        Last updated: {state.lastUpdated.toLocaleTimeString()}
      </span>
    </div>
  )

  // Title with back button and delivery name
  const titleWithBackButton = (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/committee/deliveries')}
        className="flex items-center gap-1 -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      <span className="font-semibold">
        {state.deliveryInfo ? (
          <>Live Progress: {state.deliveryInfo.display_name || state.deliveryInfo.name}</>
        ) : (
          'Live Participant Progress'
        )}
      </span>
    </div>
  )

  // No longer need useSetDashboardHeader - will pass to MainLayout

  if (state.isLoading) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading participant progress...</p>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  const stats = {
    total: state.participants.length,
    completed: state.participants.filter(p => p.attempt?.status === 'completed').length,
    inProgress: state.participants.filter(p => p.attempt?.status === 'in_progress').length,
    notStarted: state.participants.filter(p => !p.attempt || p.attempt.status === 'not_started').length,
  }

  return (
    <MainContent>
      <div className="space-y-6">
      {/* Error Display */}
      {state.error && (
        <div className="mb-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Unable to load live data</p>
                  <p className="text-sm text-red-600 mt-1">{state.error}</p>
                  <p className="text-sm text-red-600 mt-1">
                    This appears to be a backend configuration issue. The page layout and navigation are working correctly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Status Alert */}
      {!isDeliveryActive() && state.deliveryInfo && (
        <div className="mb-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-900">Delivery Has Ended</p>
                  <p className="text-sm text-orange-700">
                    This delivery has {state.deliveryInfo.status === 'expired' ? 'expired' : 'ended'}. 
                    All participants who were still in progress are now marked as incomplete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Not Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Participant List */}
        <Card>
          <CardHeader>
            <CardTitle>Participant Details</CardTitle>
            <CardDescription>Real-time progress of all participants</CardDescription>
          </CardHeader>
          <CardContent>
            {state.participants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No participants assigned to this delivery
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {state.participants.map((participant) => {
                  const progress = participant.attempt 
                    ? getProgressPercentage(participant.attempt.questions_answered, participant.attempt.total_questions)
                    : 0;
                  const rawStatus = participant.attempt?.status || 'not_started';
                  const status = getAdjustedStatus(rawStatus);
                  
                  return (
                    <Card 
                      key={participant.participant.id} 
                      className={`
                        relative overflow-hidden transition-all duration-200 hover:shadow-lg
                        ${status === 'completed' ? 'border-green-200 bg-green-50/30' : ''}
                        ${status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' : ''}
                        ${status === 'abandoned' ? 'border-red-200 bg-red-50/30' : ''}
                      `}
                    >
                      <CardContent className="p-5">
                        {/* Header with name and status */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {participant.participant.name}
                                </h3>
                                {/* Connection status indicator */}
                                <div className="flex items-center gap-1" title={
                                  isParticipantOnline(participant.attempt?.last_activity) 
                                    ? "Online" 
                                    : participant.attempt?.last_activity 
                                    ? "Disconnected" 
                                    : "Not started"
                                }>
                                  <Circle 
                                    className={`w-2 h-2 fill-current ${
                                      !participant.attempt?.started_at ? 'text-gray-300' :
                                      isParticipantOnline(participant.attempt?.last_activity) ? 'text-green-500' : 
                                      'text-red-500'
                                    }`}
                                  />
                                  <span className={`text-xs ${
                                    !participant.attempt?.started_at ? 'text-gray-400' :
                                    isParticipantOnline(participant.attempt?.last_activity) ? 'text-green-600' : 
                                    'text-red-600'
                                  }`}>
                                    {!participant.attempt?.started_at ? 'Not started' :
                                     isParticipantOnline(participant.attempt?.last_activity) ? 'Online' : 'Disconnected'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {participant.participant.email}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(status)}
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="space-y-3">
                          {/* Identifier */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">ID</span>
                            <span className="font-mono text-gray-700">
                              {participant.participant.identifier}
                            </span>
                          </div>
                          
                          {/* Time spent */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Time
                            </span>
                            <span className="text-gray-700">
                              {participant.attempt?.started_at 
                                ? calculateTimeSpent(participant.attempt.started_at, participant.attempt.ended_at)
                                : 'Not started'}
                            </span>
                          </div>
                          
                          {/* Questions progress */}
                          {participant.attempt && status !== 'not_started' && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Questions</span>
                                <span className="text-gray-700 font-medium">
                                  {participant.attempt.questions_answered} / {participant.attempt.total_questions}
                                </span>
                              </div>
                              
                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Progress</span>
                                  <span className="font-medium text-gray-700">{progress}%</span>
                                </div>
                                <Progress 
                                  value={progress} 
                                  className="h-2"
                                />
                              </div>
                            </>
                          )}
                          
                          {/* Last activity */}
                          {participant.attempt?.last_activity && (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Last activity</span>
                                <span className="text-gray-600">
                                  {new Date(participant.attempt.last_activity).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      </div>
    </MainContent>
  )
}