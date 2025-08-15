import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserCheck, Users, AlertCircle, Plus } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'

interface DeliveryParticipantsProps {
  deliveryId: string
}

export function DeliveryParticipants({ deliveryId }: DeliveryParticipantsProps) {
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    registered: 0,
    inProgress: 0,
    completed: 0,
    absent: 0
  })
  const [groups, setGroups] = useState<any[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participantForm, setParticipantForm] = useState({
    name: '',
    email: '',
    registration_number: '',
    group_id: '',
    test_code: ''
  })

  useEffect(() => {
    fetchAttempts()
    fetchGroups()
  }, [deliveryId])

  const fetchGroups = async () => {
    try {
      const response = await apiClient.groups.list()
      if (response.data?.items) {
        setGroups(response.data.items)
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    }
  }

  const fetchAttempts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.get(`/deliveries/${deliveryId}/attempts`)
      
      if (response.error) {
        setError(response.error)
      } else if ((response as any).data) {
        const items = (response as any).data.items || []
        setAttempts(items)
        
        // Calculate stats
        const newStats = {
          registered: 0,
          inProgress: 0,
          completed: 0,
          absent: 0
        }
        
        items.forEach((attempt: any) => {
          switch (attempt.status) {
            case 'not_started':
            case 'pending':
              newStats.registered++
              break
            case 'in_progress':
            case 'started':
              newStats.inProgress++
              break
            case 'submitted':
            case 'completed':
              newStats.completed++
              break
            case 'absent':
              newStats.absent++
              break
            default:
              newStats.registered++
          }
        })
        
        setStats(newStats)
      }
    } catch (err) {
      setError('Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  const handleAddParticipant = async () => {
    if (!participantForm.name || !participantForm.email || !participantForm.registration_number || !participantForm.group_id) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      // First create the participant
      const participantResponse = await apiClient.participants.create({
        name: participantForm.name,
        email: participantForm.email,
        registration_number: participantForm.registration_number,
        password: 'Test123!', // Default password - should be changed in production
        is_verified: true
      })

      if (participantResponse.error) {
        throw new Error(participantResponse.error)
      }

      const participant = participantResponse.data

      // Then create the group-taker relationship with test code
      const groupTakerResponse = await apiClient.post('/group-takers', {
        group_id: parseInt(participantForm.group_id),
        taker_id: participant.id,
        taker_code: participantForm.test_code || `${participantForm.registration_number}-${Date.now()}`
      })

      if (groupTakerResponse.error) {
        throw new Error(groupTakerResponse.error)
      }

      // Refresh the participants list
      await fetchAttempts()
      
      // Reset form and close dialog
      setParticipantForm({
        name: '',
        email: '',
        registration_number: '',
        group_id: '',
        test_code: ''
      })
      setIsAddDialogOpen(false)
      
      alert('Participant added successfully!')
    } catch (err) {
      console.error('Failed to add participant:', err)
      alert(`Failed to add participant: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'not_started': { label: 'Registered', className: 'bg-blue-100 text-blue-800' },
      'pending': { label: 'Registered', className: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'In Progress', className: 'bg-orange-100 text-orange-800' },
      'started': { label: 'In Progress', className: 'bg-orange-100 text-orange-800' },
      'submitted': { label: 'Completed', className: 'bg-green-100 text-green-800' },
      'completed': { label: 'Completed', className: 'bg-green-100 text-green-800' },
      'absent': { label: 'Absent', className: 'bg-gray-100 text-gray-800' },
    }
    
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  if (loading) {
    return (
      <div className="pt-6">
        <Loading message="Loading participants..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Participant Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.registered}</div>
              <div className="text-sm text-muted-foreground">Registered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.absent}</div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Registered Participants</h3>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Participant</DialogTitle>
                <DialogDescription>
                  Create a new participant and assign them to this delivery.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name *
                  </Label>
                  <Input
                    id="name"
                    value={participantForm.name}
                    onChange={(e) => setParticipantForm({...participantForm, name: e.target.value})}
                    className="col-span-3"
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={participantForm.email}
                    onChange={(e) => setParticipantForm({...participantForm, email: e.target.value})}
                    className="col-span-3"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="registration_number" className="text-right">
                    Reg Number *
                  </Label>
                  <Input
                    id="registration_number"
                    value={participantForm.registration_number}
                    onChange={(e) => setParticipantForm({...participantForm, registration_number: e.target.value})}
                    className="col-span-3"
                    placeholder="REG001"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="group_id" className="text-right">
                    Group *
                  </Label>
                  <Select 
                    value={participantForm.group_id} 
                    onValueChange={(value) => setParticipantForm({...participantForm, group_id: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="test_code" className="text-right">
                    Test Code
                  </Label>
                  <Input
                    id="test_code"
                    value={participantForm.test_code}
                    onChange={(e) => setParticipantForm({...participantForm, test_code: e.target.value.toUpperCase()})}
                    className="col-span-3"
                    placeholder="Optional - auto-generated if empty"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleAddParticipant}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Participant'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No participants yet</p>
              <p className="text-sm mt-2">Add participants to this delivery to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CODE</TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead>EMAIL</TableHead>
                  <TableHead>GROUP</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>SCORE</TableHead>
                  <TableHead>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => {
                  const statusInfo = getStatusBadge(attempt.status)
                  return (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {attempt.participant?.code || `ATT-${attempt.id}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {attempt.participant?.name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {attempt.participant?.email || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {attempt.group?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {attempt.status === 'submitted' || attempt.status === 'completed'
                          ? `${attempt.score || 0}%`
                          : '-'}
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
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}