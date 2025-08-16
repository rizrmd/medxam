import { useEffect } from 'react'
import { useParams, Link, NavLink } from 'react-router-dom'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Save, 
  Play,
  Pause,
  Square,
  Timer
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { MainContent } from '@/components/layout/MainContent'

// Import modular components
import { DeliveryBasicInfo } from '@/components/delivery/DeliveryBasicInfo'
import { DeliverySchedule } from '@/components/delivery/DeliverySchedule'
import { DeliveryParticipants } from '@/components/delivery/DeliveryParticipants'
import { DeliveryMonitoring } from '@/components/delivery/DeliveryMonitoring'
import { DeliveryReports } from '@/components/delivery/DeliveryReports'
import { DeliveryAssignments } from '@/components/delivery/DeliveryAssignments'

export function DeliveryDetails() {
  const { id, tab } = useParams<{ id: string; tab?: string }>()
  const currentTab = tab || 'basic'
  const [state, setState] = useLocalStateSync({
    delivery: null as any,
    deliveryName: '',
    selectedDate: '',
    selectedTime: '',
    loading: true,
    error: null as string | null
  })

  useEffect(() => {
    fetchDelivery()
  }, [id])

  const fetchDelivery = async () => {
    if (!id) return
    
    setState.loading = true
    setState.error = null
    
    try {
      const response = await apiClient.deliveries.get(id)
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        setState.delivery = (response as any).data
        setState.deliveryName = (response as any).data.name || ''
        if ((response as any).data.start_date) {
          const date = new Date((response as any).data.start_date)
          setState.selectedDate = date.toISOString().split('T')[0]
          setState.selectedTime = date.toTimeString().slice(0, 5)
        }
      }
    } catch (err) {
      setState.error = 'Failed to load delivery details'
    } finally {
      setState.loading = false
    }
  }

  const handleSave = async () => {
    if (!id || !state.delivery) return
    
    try {
      const updateData = {
        name: state.deliveryName,
        scheduled_at: state.selectedDate && state.selectedTime ? `${state.selectedDate}T${state.selectedTime}:00` : null,
      }
      
      const response = await apiClient.deliveries.update(id, updateData)
      
      if (response.error) {
        alert('Failed to update delivery: ' + response.error)
      } else {
        alert('Delivery updated successfully')
        fetchDelivery()
      }
    } catch (err) {
      alert('Failed to update delivery')
    }
  }

  const handleManualStart = async () => {
    if (!id || !state.delivery) return
    
    if (!confirm('Are you sure you want to manually start this delivery? This will allow participants to begin the exam.')) {
      return
    }
    
    try {
      const response = await apiClient.post(`/deliveries/${id}/start`)
      
      if (response.error) {
        alert('Failed to start delivery: ' + response.error)
      } else {
        alert('Delivery started successfully')
        fetchDelivery()
      }
    } catch (err) {
      alert('Failed to start delivery')
    }
  }

  if (state.loading) {
    return (
      <MainContent>
        <Loading message="Loading delivery details..." />
      </MainContent>
    )
  }

  if (state.error) {
    return (
      <MainContent>
        <ErrorMessage error={state.error} onRetry={fetchDelivery} />
      </MainContent>
    )
  }


  if (!state.delivery) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/back-office/delivery">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Delivery Not Found</h1>
          </div>
        </div>
      </MainContent>
    )
  }

  return (
    <MainContent>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/delivery">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="text-muted-foreground">{state.delivery.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {state.delivery.status === 'scheduled' && !state.delivery.automatic_start && (
            <Button 
              variant="outline"
              onClick={handleManualStart}
              className="bg-orange-50 hover:bg-orange-100 border-orange-200"
            >
              <Play className="h-4 w-4 mr-2 text-orange-600" />
              Manual Start
            </Button>
          )}
          {state.delivery.status === 'scheduled' && state.delivery.automatic_start && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md border border-blue-200">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">Auto-starts at scheduled time</span>
            </div>
          )}
          {state.delivery.status === 'ongoing' && (
            <>
              <Button variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                End Delivery
              </Button>
            </>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="w-full">
            {/* Tab Navigation */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 mb-6">
              <NavLink
                to={`/back-office/delivery/${id}/basic`}
                className={({ isActive }) =>
                  `flex-1 rounded-md px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                Basic Info
              </NavLink>
              <NavLink
                to={`/back-office/delivery/${id}/schedule`}
                className={({ isActive }) =>
                  `flex-1 rounded-md px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                Schedule
              </NavLink>
              <NavLink
                to={`/back-office/delivery/${id}/participants`}
                className={({ isActive }) =>
                  `flex-1 rounded-md px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                Participants
              </NavLink>
              <NavLink
                to={`/back-office/delivery/${id}/monitoring`}
                className={({ isActive }) =>
                  `flex-1 rounded-md px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                Monitoring
              </NavLink>
              <NavLink
                to={`/back-office/delivery/${id}/reports`}
                className={({ isActive }) =>
                  `flex-1 rounded-md px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                Reports
              </NavLink>
              <NavLink
                to={`/back-office/delivery/${id}/assignments`}
                className={({ isActive }) =>
                  `flex-1 rounded-md px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                Assignments
              </NavLink>
            </div>
            
            {/* Tab Content */}
            {currentTab === 'basic' && (
              <DeliveryBasicInfo
                delivery={state.delivery}
                deliveryName={state.deliveryName}
                onNameChange={(name) => setState.deliveryName = name}
              />
            )}
            
            {currentTab === 'schedule' && (
              <DeliverySchedule
                delivery={state.delivery}
                selectedDate={state.selectedDate}
                selectedTime={state.selectedTime}
                onDateChange={(date) => setState.selectedDate = date}
                onTimeChange={(time) => setState.selectedTime = time}
              />
            )}
            
            {currentTab === 'participants' && (
              <DeliveryParticipants deliveryId={id!} />
            )}
            
            {currentTab === 'monitoring' && (
              <DeliveryMonitoring deliveryId={id!} delivery={state.delivery} />
            )}
            
            {currentTab === 'reports' && (
              <DeliveryReports deliveryId={id!} delivery={state.delivery} />
            )}
            
            {currentTab === 'assignments' && (
              <DeliveryAssignments deliveryId={parseInt(id!)} />
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </MainContent>
  )
}