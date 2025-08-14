import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft, 
  Save, 
  Package,
  Calendar,
  Clock,
  Users,
  Settings,
  UserCheck,
  FileText,
  Play,
  Pause,
  Square,
  BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { formatLongDate, formatShortDate, formatDateForInput } from '@/lib/date-utils'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'

export function DeliveryDetails() {
  const { id } = useParams<{ id: string }>()
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
        start_date: state.selectedDate && state.selectedTime ? `${state.selectedDate}T${state.selectedTime}:00` : null,
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

  if (state.loading) {
    return <Loading message="Loading delivery details..." />
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={fetchDelivery} />
  }

  // Mock participants for this delivery
  const participants = [
    {
      id: 'p1',
      code: 'REG00001',
      name: 'Dr. John Smith',
      email: 'john.smith@example.com',
      status: 'registered',
      group: 'Primary Board Group 1'
    },
    {
      id: 'p2',
      code: 'REG00002',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@example.com',
      status: 'completed',
      group: 'Primary Board Group 1'
    }
  ]

  const getStatusBadge = (status: string) => {
    const colors = {
      registered: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      absent: 'bg-gray-100 text-gray-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!state.delivery) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/delivery">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Configure Delivery - IoNbEc</h1>
            <p className="text-muted-foreground">{state.delivery.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {state.delivery.status === 'scheduled' && (
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Start Delivery
            </Button>
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
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryName">Delivery Name</Label>
                      <Input
                        id="deliveryName"
                        value={state.deliveryName || state.delivery.name}
                        onChange={(e) => setState.deliveryName = e.target.value}
                        placeholder="Enter delivery name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exam">Associated Exam</Label>
                      <Select value={state.delivery.examId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exam_1">Primary Board Exam</SelectItem>
                          <SelectItem value="exam_2">Fellowship Exam</SelectItem>
                          <SelectItem value="exam_3">Mock Exam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group">Target Group</Label>
                      <Select value={state.delivery.groupId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="group_1">Primary Board Group 1</SelectItem>
                          <SelectItem value="group_2">Fellowship Group A</SelectItem>
                          <SelectItem value="group_3">Mock Exam Group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter delivery description..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Delivery Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Current Status</Label>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          state.delivery.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          state.delivery.status === 'ongoing' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {state.delivery.status}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{state.delivery.duration} minutes</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Auto-start</Label>
                      <Select defaultValue="disabled">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disabled">Manual start</SelectItem>
                          <SelectItem value="scheduled">Auto-start at scheduled time</SelectItem>
                          <SelectItem value="on-login">Start when first candidate logs in</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Late Entry Policy</Label>
                      <Select defaultValue="allowed">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allowed">Allow late entry</SelectItem>
                          <SelectItem value="grace-15">15 min grace period</SelectItem>
                          <SelectItem value="grace-30">30 min grace period</SelectItem>
                          <SelectItem value="strict">No late entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="schedule" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Exam Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={state.selectedDate || formatDateForInput(state.delivery.schedule)}
                        onChange={(e) => setState.selectedDate = e.target.value}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Start Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={state.selectedTime || (state.delivery.schedule ? format(new Date(state.delivery.schedule), 'HH:mm') : '')}
                        onChange={(e) => setState.selectedTime = e.target.value}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time Zone</Label>
                      <Select defaultValue="UTC+7">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC+7">WIB (UTC+7)</SelectItem>
                          <SelectItem value="UTC+8">WITA (UTC+8)</SelectItem>
                          <SelectItem value="UTC+9">WIT (UTC+9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Registration Deadline</Label>
                      <Input
                        type="datetime-local"
                        defaultValue="2025-08-14T23:59"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="participants" className="space-y-6 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Registered Participants</h3>
                <div className="flex gap-2">
                  <Button variant="outline">
                    Import Candidates
                  </Button>
                  <Button>
                    Add Participant
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CODE</TableHead>
                        <TableHead>NAME</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead>GROUP</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead>ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell>
                            <span className="font-mono text-sm">{participant.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{participant.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{participant.email}</TableCell>
                          <TableCell className="text-sm">{participant.group}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(participant.status)}`}>
                              {participant.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                              <Button variant="ghost" size="sm">
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Participant Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">2</div>
                      <div className="text-sm text-muted-foreground">Registered</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">0</div>
                      <div className="text-sm text-muted-foreground">In Progress</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">1</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">0</div>
                      <div className="text-sm text-muted-foreground">Absent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="monitoring" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">System Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Server Status</span>
                          <span className="text-sm text-green-600">Online</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Database</span>
                          <span className="text-sm text-green-600">Connected</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Active Sessions</span>
                          <span className="text-sm font-medium">1</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Exam Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Started</span>
                          <span className="text-sm font-medium">1/2</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Completed</span>
                          <span className="text-sm font-medium">1/2</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Average Progress</span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reports" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Quick Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Attendance Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Progress Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="h-4 w-4 mr-2" />
                      Time Analysis
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Participant Summary
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full">
                      Export to Excel
                    </Button>
                    <Button variant="outline" className="w-full">
                      Export to PDF
                    </Button>
                    <Button variant="outline" className="w-full">
                      Generate Certificate
                    </Button>
                    <Button variant="outline" className="w-full">
                      Bulk Email Results
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}