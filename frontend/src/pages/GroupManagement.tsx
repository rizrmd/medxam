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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Users, Edit, Trash2, Plus, Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { useHeaderActions } from '@/hooks/useHeaderActions'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'

export function GroupManagement() {
  const searchInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    groups: [] as any[],
    loading: true,
    error: null as string | null,
    showEditDialog: false,
    editingGroup: null as any,
    formData: {
      name: '',
      description: '',
      code: ''
    }
  })
  const navigate = useNavigate()

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredGroups
  }, [])

  const handleClear = useCallback(() => {
    searchInput.setValue('')
  }, [searchInput])

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      const response = await apiClient.groups.list()
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        // Handle paginated response
        const groupData = (response as any).data.data || (response as any).data
        setState.groups = Array.isArray(groupData) ? groupData : []
      }
    } catch (err) {
      setState.error = 'Failed to load groups'
    } finally {
      setState.loading = false
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return
    
    try {
      const response = await apiClient.groups.delete(id)
      
      if (response.error) {
        alert('Failed to delete group: ' + response.error)
      } else {
        await fetchGroups()
      }
    } catch (err) {
      alert('Failed to delete group')
    }
  }

  const openEditDialog = (group: any) => {
    setState.editingGroup = group
    setState.formData = {
      name: group.name || '',
      description: group.description || '',
      code: group.code || ''
    }
    setState.showEditDialog = true
  }

  const handleEditGroup = async () => {
    if (!state.editingGroup) return
    
    try {
      const response = await apiClient.groups.update(state.editingGroup.id, state.formData)
      
      if (response.error) {
        alert('Failed to update group: ' + response.error)
      } else {
        setState.showEditDialog = false
        setState.editingGroup = null
        await fetchGroups()
      }
    } catch (err) {
      alert('Failed to update group')
    }
  }

  if (state.loading) {
    return <Loading message="Loading groups..." />
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={fetchGroups} />
  }

  const filteredGroups = state.groups.filter(group =>
    group.name.toLowerCase().includes(searchInput.getValue().toLowerCase()) ||
    group.description.toLowerCase().includes(searchInput.getValue().toLowerCase())
  )

  const headerActions = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Group
    </Button>
  )
  
  useHeaderActions(headerActions)

  return (
    <div className="space-y-6">

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search group name or description"
              {...searchInput.inputProps}
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO</TableHead>
                <TableHead>GROUP NAME</TableHead>
                <TableHead>CODE</TableHead>
                <TableHead>PARTICIPANTS</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.slice(0, 15).map((group, index) => (
                <TableRow key={group.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{group.code}</span>
                  </TableCell>
                  <TableCell>{group.participant_count || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/back-office/group/${group.id}/participants`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(group)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteGroup(group.id)}
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
        {[1, 2, 3, 4, 5].map((page) => (
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

      {/* Edit Dialog */}
      <Dialog open={state.showEditDialog} onOpenChange={(open) => setState.showEditDialog = open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={state.formData.name}
                onChange={(e) => setState.formData = {...state.formData, name: e.target.value}}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={state.formData.description}
                onChange={(e) => setState.formData = {...state.formData, description: e.target.value}}
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">
                Code
              </Label>
              <Input
                id="edit-code"
                value={state.formData.code}
                onChange={(e) => setState.formData = {...state.formData, code: e.target.value}}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setState.showEditDialog = false
              setState.editingGroup = null
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}