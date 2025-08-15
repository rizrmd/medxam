import { useEffect, useCallback } from 'react'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { formatShortDate } from '@/lib/date-utils'
import { useFastInput } from '@/hooks/useFastInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Edit, Trash2, Plus, Search, User } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: 'administrator' | 'scorer'
  status: 'active' | 'inactive'
  lastLogin: Date
}

export function UserAccessControl() {
  const searchTermInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    selectedRole: 'all',
    users: [] as User[]
  })

  useEffect(() => {
    // Simulate loading users
    const mockUsers: User[] = Array.from({ length: 60 }, (_, i) => ({
      id: `user_${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@medxam.com`,
      role: i % 3 === 0 ? 'administrator' : 'scorer',
      status: i % 10 === 0 ? 'inactive' : 'active',
      lastLogin: new Date(2025, 7, (i % 30) + 1),
    }))
    setState.users = mockUsers
  }, [])

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredUsers
  }, [])

  const handleClear = useCallback(() => {
    searchTermInput.setValue('')
    setState.selectedRole = 'all'
  }, [searchTermInput, setState])

  const filteredUsers = state.users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTermInput.getValue().toLowerCase()) ||
      user.email.toLowerCase().includes(searchTermInput.getValue().toLowerCase())
    const matchesRole = state.selectedRole === 'all' || user.role === state.selectedRole
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: string) => {
    return role === 'administrator' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800'
  }

  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search Name or Email"
              {...searchTermInput.inputProps}
              className="flex-1"
            />
            <Select value={state.selectedRole} onValueChange={(value) => setState.selectedRole = value}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
                <SelectItem value="scorer">Scorer / Committee</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO</TableHead>
                <TableHead>NAME</TableHead>
                <TableHead>EMAIL</TableHead>
                <TableHead>ROLE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>LAST LOGIN</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 15).map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role === 'administrator' ? 'Administrator' : 'Scorer / Committee'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatShortDate(user.lastLogin)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">
                {state.users.filter(u => u.role === 'administrator').length}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Administrators</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <User className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold text-green-600">
                {state.users.filter(u => u.role === 'scorer').length}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Scorers / Committee</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {state.users.filter(u => u.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {state.users.filter(u => u.status === 'inactive').length}
            </div>
            <div className="text-sm text-muted-foreground">Inactive Users</div>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        {[1, 2, 3, 4].map((page) => (
          <Button
            key={page}
            variant={page === 1 ? "default" : "outline"}
            size="sm"
          >
            {page}
          </Button>
        ))}
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </div>
  )
}