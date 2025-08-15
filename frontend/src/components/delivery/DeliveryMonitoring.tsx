import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Activity, Server, Users, Clock, TrendingUp, UserCheck } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface DeliveryMonitoringProps {
  deliveryId: string
  delivery: any
}

export function DeliveryMonitoring({ deliveryId, delivery }: DeliveryMonitoringProps) {
  const [monitoringData, setMonitoringData] = useState({
    serverStatus: 'online',
    databaseStatus: 'connected',
    activeSessions: 0,
    started: 0,
    completed: 0,
    averageProgress: 0,
    totalParticipants: 0,
    averageTimeSpent: 0,
    lastUpdated: new Date()
  })

  useEffect(() => {
    fetchMonitoringData()
    const interval = setInterval(fetchMonitoringData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [deliveryId])

  const fetchMonitoringData = async () => {
    try {
      // Fetch attempts to calculate real-time statistics
      const response = await apiClient.get(`/deliveries/${deliveryId}/attempts`)
      
      if ((response as any).data?.items) {
        const attempts = (response as any).data.items
        
        const stats = {
          started: 0,
          completed: 0,
          totalProgress: 0,
          totalTimeSpent: 0,
          activeCount: 0
        }
        
        attempts.forEach((attempt: any) => {
          if (attempt.status === 'in_progress' || attempt.status === 'started') {
            stats.started++
            stats.activeCount++
          }
          if (attempt.status === 'submitted' || attempt.status === 'completed') {
            stats.completed++
            stats.started++ // Completed means also started
          }
          
          // Calculate progress (assuming we have progress field)
          if (attempt.progress) {
            stats.totalProgress += attempt.progress
          }
          
          // Calculate time spent
          if (attempt.started_at) {
            const startTime = new Date(attempt.started_at).getTime()
            const endTime = attempt.ended_at 
              ? new Date(attempt.ended_at).getTime() 
              : Date.now()
            stats.totalTimeSpent += (endTime - startTime) / 60000 // Convert to minutes
          }
        })
        
        setMonitoringData(prev => ({
          ...prev,
          activeSessions: stats.activeCount,
          started: stats.started,
          completed: stats.completed,
          totalParticipants: attempts.length,
          averageProgress: attempts.length > 0 
            ? Math.round(stats.totalProgress / attempts.length) 
            : 0,
          averageTimeSpent: stats.started > 0 
            ? Math.round(stats.totalTimeSpent / stats.started) 
            : 0,
          lastUpdated: new Date()
        }))
      }
      
      // Check server health
      const healthResponse = await apiClient.health()
      if ((healthResponse as any).data) {
        setMonitoringData(prev => ({
          ...prev,
          serverStatus: 'online',
          databaseStatus: 'connected'
        }))
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err)
      setMonitoringData(prev => ({
        ...prev,
        serverStatus: 'error',
        databaseStatus: 'error'
      }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
        return 'text-green-600'
      case 'offline':
      case 'disconnected':
        return 'text-red-600'
      case 'error':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const completionRate = monitoringData.totalParticipants > 0
    ? Math.round((monitoringData.completed / monitoringData.totalParticipants) * 100)
    : 0

  return (
    <div className="space-y-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Monitoring</span>
            <span className="text-sm font-normal text-muted-foreground">
              Last updated: {monitoringData.lastUpdated.toLocaleTimeString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">System Status</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Server Status</span>
                  <span className={`text-sm font-medium ${getStatusColor(monitoringData.serverStatus)}`}>
                    {monitoringData.serverStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database</span>
                  <span className={`text-sm font-medium ${getStatusColor(monitoringData.databaseStatus)}`}>
                    {monitoringData.databaseStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Sessions</span>
                  <span className="text-sm font-medium">{monitoringData.activeSessions}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Exam Progress</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Started</span>
                  <span className="text-sm font-medium">
                    {monitoringData.started}/{monitoringData.totalParticipants}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed</span>
                  <span className="text-sm font-medium">
                    {monitoringData.completed}/{monitoringData.totalParticipants}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <span className="text-sm font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Performance Metrics</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg. Progress</span>
                  <span className="text-sm font-medium">{monitoringData.averageProgress}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg. Time Spent</span>
                  <span className="text-sm font-medium">{monitoringData.averageTimeSpent} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Delivery Status</span>
                  <span className={`text-sm font-medium ${
                    delivery?.status === 'ongoing' ? 'text-orange-600' :
                    delivery?.status === 'finished' ? 'text-green-600' :
                    'text-blue-600'
                  }`}>
                    {delivery?.status || 'pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-none bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {monitoringData.totalParticipants}
                      </p>
                      <p className="text-xs text-blue-600">Total Participants</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {monitoringData.activeSessions}
                      </p>
                      <p className="text-xs text-orange-600">Active Now</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {monitoringData.completed}
                      </p>
                      <p className="text-xs text-green-600">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {monitoringData.averageTimeSpent}
                      </p>
                      <p className="text-xs text-purple-600">Avg. Minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

