import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  UserCheck, 
  Users, 
  CheckCircle, 
  Plus,
  AlertCircle
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface User {
  id: number
  name: string
  username: string
  email: string
}

interface UserWithRole {
  user: User
  assigned_at: string
  is_active: boolean
}

interface DeliveryAssignmentsProps {
  deliveryId: number
}

export function DeliveryAssignments({ deliveryId }: DeliveryAssignmentsProps) {
  const [assignments, setAssignments] = useState<{
    committee: UserWithRole[]
    scorers: UserWithRole[]
  }>({ committee: [], scorers: [] })
  
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [assignmentType, setAssignmentType] = useState<'committee' | 'scorer'>('committee')
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadAssignments()
  }, [deliveryId])

  const loadAssignments = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await apiClient.deliveries.getAssignments(deliveryId.toString())
      
      if (response.error) {
        setError(response.error)
      } else {
        setAssignments(response.data || { committee: [], scorers: [] })
      }
    } catch (error) {
      setError('Failed to load assignments')
      console.error('Error loading assignments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const response = await apiClient.getScorerUsers()
      
      if (response.error) {
        setError(response.error)
      } else {
        setAvailableUsers(response.data || [])
      }
    } catch (error) {
      setError('Failed to load available users')
      console.error('Error loading users:', error)
    }
  }

  const openAssignmentDialog = (type: 'committee' | 'scorer') => {
    setAssignmentType(type)
    setSelectedUsers([])
    loadAvailableUsers()
    setDialogOpen(true)
  }

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const saveAssignment = async () => {
    setIsSaving(true)
    
    try {
      let response
      if (assignmentType === 'committee') {
        response = await apiClient.deliveries.assignCommittee(deliveryId.toString(), selectedUsers)
      } else {
        response = await apiClient.deliveries.assignScorers(deliveryId.toString(), selectedUsers)
      }
      
      if (response.error) {
        setError(response.error)
      } else {
        setDialogOpen(false)
        loadAssignments() // Refresh assignments
      }
    } catch (error) {
      setError(`Failed to assign ${assignmentType}`)
      console.error('Error saving assignment:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Committee Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5" />
                <span>Committee Members</span>
              </CardTitle>
              <CardDescription>
                Committee members can start, pause, and stop exam deliveries
              </CardDescription>
            </div>
            <Dialog open={dialogOpen && assignmentType === 'committee'} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openAssignmentDialog('committee')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Committee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Committee Members</DialogTitle>
                  <DialogDescription>
                    Select users to assign as committee members for this delivery.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`committee-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Label htmlFor={`committee-${user.id}`} className="flex-1">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">@{user.username}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveAssignment} disabled={isSaving || selectedUsers.length === 0}>
                    {isSaving ? 'Assigning...' : 'Assign Committee'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {assignments.committee.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>No committee members assigned</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.committee.map((member) => (
                <div key={member.user?.id || Math.random()} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{member.user?.name || member.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">@{member.user?.username || member.username || 'unknown'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-500 text-white mb-1">Committee</Badge>
                    <div className="text-xs text-gray-600">
                      Assigned: {formatDateTime(member.assigned_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scorers Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Scorers</span>
              </CardTitle>
              <CardDescription>
                Scorers can evaluate and score participant results
              </CardDescription>
            </div>
            <Dialog open={dialogOpen && assignmentType === 'scorer'} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openAssignmentDialog('scorer')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Scorers
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Scorers</DialogTitle>
                  <DialogDescription>
                    Select users to assign as scorers for this delivery.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`scorer-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Label htmlFor={`scorer-${user.id}`} className="flex-1">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">@{user.username}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveAssignment} disabled={isSaving || selectedUsers.length === 0}>
                    {isSaving ? 'Assigning...' : 'Assign Scorers'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {assignments.scorers.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No scorers assigned</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.scorers.map((scorer) => (
                <div key={scorer.user?.id || Math.random()} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">{scorer.user?.name || scorer.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">@{scorer.user?.username || scorer.username || 'unknown'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500 text-white mb-1">Scorer</Badge>
                    <div className="text-xs text-gray-600">
                      Assigned: {formatDateTime(scorer.assigned_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}