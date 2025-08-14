import { useEffect, useCallback } from 'react'
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
import { UserCheck, Edit, Trash2, Plus, Search, CheckCircle, XCircle } from 'lucide-react'
import { formatShortDate } from '@/lib/date-utils'
import { apiClient } from '@/lib/api'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'

export function CandidateManagement() {
  const searchInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    selectedGroup: 'all',
    candidates: [] as any[],
    groups: [] as any[],
    loading: true,
    error: null as string | null
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      const [takersRes, groupsRes] = await Promise.all([
        apiClient.takers.list(),
        apiClient.groups.list()
      ])
      
      if (takersRes.error) {
        setState.error = takersRes.error
      } else if ((takersRes as any).data) {
        // Handle paginated response
        const takerData = (takersRes as any).data.data || (takersRes as any).data
        setState.candidates = Array.isArray(takerData) ? takerData : []
      }
      
      if ((groupsRes as any).data) {
        // Handle paginated response
        const groupData = (groupsRes as any).data.data || (groupsRes as any).data
        setState.groups = Array.isArray(groupData) ? groupData : []
      }
    } catch (err) {
      setState.error = 'Failed to load candidates'
    } finally {
      setState.loading = false
    }
  }

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return
    
    try {
      const response = await apiClient.takers.delete(id)
      
      if (response.error) {
        alert('Failed to delete candidate: ' + response.error)
      } else {
        await fetchData()
      }
    } catch (err) {
      alert('Failed to delete candidate')
    }
  }

  if (state.loading) {
    return <Loading message="Loading candidates..." />
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={fetchData} />
  }

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredCandidates
  }, [])

  const handleClear = useCallback(() => {
    searchInput.setValue('')
    setState.selectedGroup = 'all'
  }, [searchInput, setState])

  const filteredCandidates = state.candidates.filter(candidate => {
    const matchesSearch = (candidate.name || '').toLowerCase().includes(searchInput.getValue().toLowerCase()) ||
      (candidate.email || '').toLowerCase().includes(searchInput.getValue().toLowerCase())
    const matchesGroup = state.selectedGroup === 'all' || (candidate.group_id && candidate.group_id.toString() === state.selectedGroup)
    return matchesSearch && matchesGroup
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Candidates - IoNbEc</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Candidate
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
              {...searchInput.inputProps}
              className="flex-1"
            />
            <Select value={state.selectedGroup} onValueChange={(value) => setState.selectedGroup = value}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {state.groups.slice(0, 10).map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
                <SelectItem value="more">70 items available</SelectItem>
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
                <TableHead>REG</TableHead>
                <TableHead>NAME</TableHead>
                <TableHead>EMAIL</TableHead>
                <TableHead>GROUPS</TableHead>
                <TableHead>CREATED AT</TableHead>
                <TableHead>VERIFIED</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.slice(0, 15).map((candidate, index) => (
                <TableRow key={candidate.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{candidate.registration_number || candidate.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{candidate.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{candidate.email}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {candidate.group_id ? 'Assigned' : 'Unassigned'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatShortDate(candidate.created_at)}
                  </TableCell>
                  <TableCell>
                    {candidate.verified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                      >
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
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((page) => (
          <Button
            key={page}
            variant={page === 1 ? "default" : "outline"}
            size="sm"
          >
            {page}
          </Button>
        ))}
        <span className="px-2">...</span>
        {[59, 60].map((page) => (
          <Button
            key={page}
            variant="outline"
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