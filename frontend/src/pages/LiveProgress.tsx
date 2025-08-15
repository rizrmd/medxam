import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useHeaderActions } from '@/hooks/useHeaderActions'
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
  WifiOff
} from 'lucide-react'
import { apiClient } from '@/lib/api'

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
        return <Badge className="bg-red-500 text-white">Abandoned</Badge>
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

  // Header actions for DashboardLayout - Set immediately to ensure they always appear
  const headerActions = (
    <>
      <div className="flex items-center space-x-4 ml-4">
        <div className="flex items-center space-x-2 text-sm">
          {state.isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-red-600">Reconnecting...</span>
            </>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Updated: {state.lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </>
  )

  // Title with back button and delivery name - VERY OBVIOUS STYLING FOR DEBUG
  const titleWithBackButton = (
    <div 
      className="flex items-center gap-3 bg-red-500 text-white p-4 border-4 border-yellow-400" 
      style={{ 
        fontSize: '24px', 
        fontWeight: 'bold',
        minHeight: '60px',
        zIndex: 9999,
        position: 'relative'
      }}
    >
      <Button
        variant="default"
        size="lg"
        onClick={() => {
          console.log('Back button clicked in header!')
          navigate('/committee/deliveries')
        }}
        className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 text-lg px-4 py-2"
      >
        <ArrowLeft className="w-6 h-6" />
        BACK BUTTON
      </Button>
      <span className="text-yellow-300 text-2xl">|</span>
      <span className="text-2xl">
        {state.deliveryInfo ? (
          state.deliveryInfo.display_name || state.deliveryInfo.name
        ) : (
          'LIVE PARTICIPANT PROGRESS - DEBUG'
        )}
      </span>
    </div>
  )

  // Set header actions and title - will update when deliveryInfo changes
  useHeaderActions(headerActions, titleWithBackButton, [state.deliveryInfo])

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading participant progress...</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: state.participants.length,
    completed: state.participants.filter(p => p.attempt?.status === 'completed').length,
    inProgress: state.participants.filter(p => p.attempt?.status === 'in_progress').length,
    notStarted: state.participants.filter(p => !p.attempt || p.attempt.status === 'not_started').length,
  }

  return (
    <div className="p-6">
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
              <div className="space-y-4">
                {state.participants.map((participant) => (
                  <div key={participant.participant.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{participant.participant.name}</span>
                          {getStatusBadge(participant.attempt?.status || 'not_started')}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {participant.participant.email} • ID: {participant.participant.identifier}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            {participant.attempt?.started_at 
                              ? calculateTimeSpent(participant.attempt.started_at, participant.attempt.ended_at)
                              : 'Not started'}
                          </span>
                        </div>
                        {participant.attempt?.last_activity && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last activity: {new Date(participant.attempt.last_activity).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {participant.attempt && participant.attempt.status !== 'not_started' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">
                            Questions: {participant.attempt.questions_answered} / {participant.attempt.total_questions}
                          </span>
                          <span className="text-sm font-medium">
                            {getProgressPercentage(participant.attempt.questions_answered, participant.attempt.total_questions)}%
                          </span>
                        </div>
                        <Progress 
                          value={getProgressPercentage(participant.attempt.questions_answered, participant.attempt.total_questions)} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}