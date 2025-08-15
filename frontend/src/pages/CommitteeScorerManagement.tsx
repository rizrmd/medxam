import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Users, 
  UserCheck, 
  CheckCircle, 
  Search,
  Calendar,
  AlertCircle,
  Eye,
  Settings
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface User {
  id: number
  name: string
  username: string
  email: string
  roles?: Array<{ id: number; name: string; display_name: string }>
}

interface DeliveryAssignment {
  delivery: {
    id: number
    name: string
    scheduled_at: string
    status: string
  }
  committee: User[]
  scorers: User[]
}

export function CommitteeScorerManagement() {
  const { user } = useAuthStore()
  const [state, setState] = useLocalStateSync({
    users: [] as User[],
    filteredUsers: [] as User[],
    assignments: [] as DeliveryAssignment[],
    searchTerm: '',
    selectedUser: null as User | null,
    isLoading: true,
    error: '',
    activeTab: 'users'
  })

  useEffect(() => {
    loadUsers()
    loadAssignments()
  }, [])

  useEffect(() => {
    // Filter users based on search term
    const filtered = state.users.filter(user => 
      user.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(state.searchTerm.toLowerCase())
    )
    setState.filteredUsers = filtered
  }, [state.users, state.searchTerm])

  const loadUsers = async () => {
    setState.isLoading = true
    setState.error = ''
    
    try {
      const response = await apiClient.getScorerUsers()
      
      if (response.error) {
        setState.error = response.error
      } else {
        setState.users = response.data || []
      }
    } catch (error) {
      setState.error = 'Failed to load users'
      console.error('Error loading users:', error)
    } finally {
      setState.isLoading = false
    }
  }

  const loadAssignments = async () => {
    try {
      // TODO: Create endpoint to get all delivery assignments for admin overview
      // For now, we'll show a placeholder
      setState.assignments = []
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const hasRole = (user: User, roleName: string) => {
    return user.roles?.some(role => 
      role.name === roleName || role.display_name === roleName
    ) || false
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getRolesBadges = (user: User) => {
    if (!user.roles || user.roles.length === 0) {
      return <Badge variant="outline">No Roles</Badge>
    }

    return user.roles.map((role) => (
      <Badge 
        key={role.id} 
        className={
          role.name === 'Administrator' ? 'bg-red-500 text-white' :
          role.name === 'Scorer / Committee' ? 'bg-blue-500 text-white' :
          'bg-gray-500 text-white'
        }
      >
        {role.display_name || role.name}
      </Badge>
    ))
  }

  const getUserStats = () => {
    const totalUsers = state.users.length
    const committeeUsers = state.users.filter(user => hasRole(user, 'Scorer / Committee')).length
    const adminUsers = state.users.filter(user => hasRole(user, 'Administrator')).length
    
    return { totalUsers, committeeUsers, adminUsers }
  }

  const stats = getUserStats()

  if (state.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Committee & Scorer Management</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Committee & Scorer Management</h1>
          <p className="text-gray-600">Manage committee members and scorers for exam deliveries</p>
        </div>
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
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.committeeUsers}</p>
                <p className="text-sm text-gray-600">Committee/Scorers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.adminUsers}</p>
                <p className="text-sm text-gray-600">Administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={state.activeTab} onValueChange={(tab) => setState.activeTab = tab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Overview</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Committee & Scorer Users</CardTitle>
                  <CardDescription>
                    Users with committee or scorer roles who can be assigned to deliveries
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={state.searchTerm}
                    onChange={(e) => setState.searchTerm = e.target.value}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {state.filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {state.searchTerm ? 'No users found matching your search' : 'No users with committee/scorer roles found'}
                  </div>
                ) : (
                  state.filteredUsers.map((user) => (
                    <Card key={user.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-medium">{user.name}</h3>
                              <div className="flex flex-wrap gap-1">
                                {getRolesBadges(user)}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Username:</strong> @{user.username}</p>
                              <p><strong>Email:</strong> {user.email}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setState.selectedUser = user}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>{user.name}</DialogTitle>
                                  <DialogDescription>
                                    User details and role information
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-medium">Username</Label>
                                    <p className="text-sm text-gray-600">@{user.username}</p>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium">Email</Label>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium">Roles</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {getRolesBadges(user)}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium">Capabilities</Label>
                                    <div className="text-sm text-gray-600 space-y-1 mt-1">
                                      {hasRole(user, 'Administrator') && (
                                        <div className="flex items-center space-x-1">
                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                          <span>Can manage all system settings</span>
                                        </div>
                                      )}
                                      {hasRole(user, 'Scorer / Committee') && (
                                        <>
                                          <div className="flex items-center space-x-1">
                                            <CheckCircle className="w-3 h-3 text-blue-500" />
                                            <span>Can be assigned as committee member</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <CheckCircle className="w-3 h-3 text-blue-500" />
                                            <span>Can score participant results</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setState.selectedUser = null}>
                                    Close
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Overview</CardTitle>
              <CardDescription>
                Overview of all committee and scorer assignments across deliveries
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Assignment Overview</h3>
                <p className="mb-4">This feature shows a comprehensive view of all delivery assignments.</p>
                <p className="text-sm">For now, manage assignments through individual delivery pages in the "Assignments" tab.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}