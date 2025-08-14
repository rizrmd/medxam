import { useFastInput } from '@/hooks/useFastInput'
import { useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Search,
  Edit,
  Trash2,
  UserCheck,
  Package,
  BarChart3
} from 'lucide-react'
import { useParticipantStore } from '@/store/participantStore'

export function GroupDetails() {
  const { id } = useParams<{ id: string }>()
  const searchCandidateInput = useFastInput('')
  const searchNameEmailInput = useFastInput('')
  const { groups } = useParticipantStore()

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled locally in this component
  }, [])

  const handleClear = useCallback(() => {
    searchCandidateInput.setValue('')
    searchNameEmailInput.setValue('')
  }, [searchCandidateInput, searchNameEmailInput])

  const group = groups.find(g => g.id === id)

  // Mock group members
  const groupMembers = [
    {
      id: 'member_1',
      code: 'REG00001',
      name: 'Dr. John Smith',
      email: 'john.smith@example.com'
    }
  ]

  // Mock deliveries for this group
  const groupDeliveries = [
    {
      id: 'delivery_1',
      name: 'Primary Board Exam - August 2025',
      schedule: '2025-08-15',
      status: 'scheduled'
    },
    {
      id: 'delivery_2', 
      name: 'Mock Exam - July 2025',
      schedule: '2025-07-28',
      status: 'completed'
    }
  ]

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/back-office/group">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Group Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/group">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Authoring Group - IoNbEc</h1>
            <p className="text-muted-foreground">{group.name} ({group.code})</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          <Tabs defaultValue="candidates" className="w-full">
            <TabsList>
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="candidates" className="space-y-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <Input
                  placeholder="Search Candidate"
                  {...searchCandidateInput.inputProps}
                  className="flex-1"
                />
                <Input
                  placeholder="Search Name or Email"
                  {...searchNameEmailInput.inputProps}
                  className="flex-1"
                />
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </form>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NO</TableHead>
                        <TableHead>CODE</TableHead>
                        <TableHead>NAME</TableHead>
                        <TableHead>EMAIL</TableHead>
                        <TableHead>Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupMembers.map((member, index) => (
                        <TableRow key={member.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{member.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{member.email}</TableCell>
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

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="default" size="sm">1</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="deliveries" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Group Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupDeliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{delivery.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Scheduled: {delivery.schedule}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          delivery.status === 'scheduled' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {delivery.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="results" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Results Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">1</div>
                      <div className="text-sm text-muted-foreground">Total Members</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">1</div>
                      <div className="text-sm text-muted-foreground">Completed Exams</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">85%</div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Detailed Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}