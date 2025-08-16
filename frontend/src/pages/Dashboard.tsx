import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { formatShortDate } from '@/lib/date-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  UserCheck, 
  FileText, 
  FileQuestion,
  Clock,
  CheckCircle,
  AlertCircle,
  ClipboardCheck,
  Award
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useLocalState } from '@/hooks/useLocalState'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { useAuthStore } from '@/store/authStore'
import { MainContent } from '@/components/layout/MainContent'

interface DashboardStats {
  deliveries: number
  exams: number
  participants: number
  categories: number
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [state, setState] = useLocalState({
    stats: null as DashboardStats | null,
    deliveries: [] as any[],
    myDeliveries: [] as any[],
    loading: true,
    error: null as string | null
  })
  
  // Check user roles
  const hasAdminRole = user?.roles?.some(role => 
    role.name === 'Administrator' || role.name === 'administrator'
  )
  
  const hasCommitteeRole = user?.roles?.some(role => 
    role.name === 'Scorer / Committee' || role.name === 'scorer'
  )
  
  const isCommitteeOnly = hasCommitteeRole && !hasAdminRole

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      if (isCommitteeOnly) {
        // For committee/scorer users, only fetch their assigned deliveries
        const myDeliveriesRes = await apiClient.myDeliveries()
        
        if (!myDeliveriesRes.error) {
          setState.myDeliveries = myDeliveriesRes.data || []
        }
      } else {
        // For admin users, fetch all data in parallel
        const [deliveriesRes, examsRes, takersRes, categoriesRes] = await Promise.all([
          apiClient.deliveries.list(),
          apiClient.exams.list(),
          apiClient.participants.list(),
          apiClient.categories.list()
        ])

        // Process stats - handle paginated responses
        const statsData: DashboardStats = {
          deliveries: (deliveriesRes as any).data?.total || (deliveriesRes as any).data?.length || 0,
          exams: (examsRes as any).data?.total || (examsRes as any).data?.length || 0,
          participants: (takersRes as any).data?.total || (takersRes as any).data?.length || 0,
          categories: (categoriesRes as any).data?.total || (categoriesRes as any).data?.length || 0
        }
        setState.stats = statsData

        // Set recent deliveries (last 4) - handle paginated response
        if ((deliveriesRes as any).data) {
          const deliveryData = (deliveriesRes as any).data.data || (deliveriesRes as any).data
          if (Array.isArray(deliveryData)) {
            const sortedDeliveries = deliveryData
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 4)
            setState.deliveries = sortedDeliveries
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setState.error = 'Failed to load dashboard data. Please check your connection.'
    } finally {
      setState.loading = false
    }
  }

  const statsCards = state.stats ? [
    { title: 'Total Deliveries', value: state.stats.deliveries.toString(), icon: Package },
    { title: 'Active Exams', value: state.stats.exams.toString(), icon: FileText },
    { title: 'Total Participants', value: state.stats.participants.toString(), icon: UserCheck },
    { title: 'Question Categories', value: state.stats.categories.toString(), icon: FileQuestion },
  ] : []

  const quickActions = [
    { label: 'New Delivery', path: '/back-office/delivery?modal_create=1', variant: 'default' as const },
    { label: 'New Group', path: '/back-office/group?modal_create=1', variant: 'secondary' as const },
    { label: 'Register Participant', path: '/back-office/participants?modal_create=1', variant: 'secondary' as const },
    { label: 'New Test', path: '/back-office/test?modal_create=1', variant: 'secondary' as const },
    { label: 'New Question Category', path: '/back-office/category?modal_create=1', variant: 'secondary' as const },
    { label: 'New Question Set', path: '/back-office/question-set?modal_create=1', variant: 'secondary' as const },
  ]

  const getDeliveryStatus = (delivery: any) => {
    const now = new Date()
    const startDate = new Date(delivery.start_date)
    const endDate = new Date(delivery.end_date)
    
    if (now < startDate) return 'scheduled'
    if (now >= startDate && now <= endDate) return 'ongoing'
    return 'completed'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'ongoing':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (state.loading) {
    return (
      <MainContent>
        <Loading message="Loading dashboard data..." />
      </MainContent>
    )
  }

  if (state.error) {
    return (
      <MainContent>
        <ErrorMessage error={state.error} onRetry={fetchDashboardData} />
      </MainContent>
    )
  }

  // Committee/Scorer only view
  if (isCommitteeOnly) {
    return (
      <MainContent>
        <div className="space-y-6">
        {/* Page Header */}
        <div>
          <p className="text-muted-foreground">Welcome, {user?.name}</p>
          <p className="text-sm text-gray-600">Committee & Scorer Dashboard</p>
        </div>

        {/* Committee Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Deliveries</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.myDeliveries.length}</div>
              <p className="text-xs text-muted-foreground">Assigned deliveries</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.myDeliveries.filter((d: any) => d.delivery?.last_status === 'running').length}
              </div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Scoring</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.myDeliveries.filter((d: any) => d.delivery?.is_finished).length}
              </div>
              <p className="text-xs text-muted-foreground">Ready for scoring</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Committee */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              <Button onClick={() => navigate('/committee/deliveries')} className="w-full">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                View My Deliveries
              </Button>
              <Button onClick={() => navigate('/back-office/scoring')} variant="outline" className="w-full">
                <Award className="mr-2 h-4 w-4" />
                Scoring Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Assigned Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>My Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {state.myDeliveries.length === 0 ? (
              <p className="text-muted-foreground">No deliveries assigned to you</p>
            ) : (
              <div className="space-y-2">
                {state.myDeliveries.slice(0, 4).map((assignment: any) => (
                  <div key={assignment.delivery?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{assignment.delivery?.name}</p>
                      <p className="text-sm text-gray-600">
                        Scheduled: {formatShortDate(assignment.delivery?.scheduled_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/committee/deliveries')}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </MainContent>
    )
  }

  // Admin view
  return (
    <MainContent>
      <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-muted-foreground">Welcome to the examination management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                onClick={() => navigate(action.path)}
                className="w-full"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {state.deliveries.length > 0 ? (
              state.deliveries.map((delivery) => {
                const status = getDeliveryStatus(delivery)
                return (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/back-office/delivery/${delivery.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <div>
                        <p className="font-medium">{delivery.name || `Delivery #${delivery.id}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatShortDate(delivery.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
                      {status}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">No deliveries found</p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </MainContent>
  )
}