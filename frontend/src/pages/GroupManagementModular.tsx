import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Users, Edit, Trash2, Plus, Search, Eye, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { useListManagement } from '@/hooks/useListManagement'
import { DataTable, type Column, Pagination } from '@/components/ui/data-table'
// import { DateFilter, DateFilterValue } from '@/components/ui/date-filter'
import { useFastInput } from '@/hooks/useFastInput'
import { format } from 'date-fns'

interface Group {
  id: number
  name: string
  description: string
  code: string
  participant_count?: number
  created_at: string
  updated_at: string
}

interface GroupFormData {
  name: string
  description: string
  code: string
}

export function GroupManagementModular() {
  const navigate = useNavigate()
  const searchInput = useFastInput('')
  
  // Use the modular list management hook
  const [listState, listActions] = useListManagement<Group>({
    endpoint: '/groups',
    perPage: 15,
    // dateField: 'created_at',
  })

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    code: ''
  })

  // Table columns configuration
  const columns: Column<Group>[] = [
    {
      key: 'index',
      label: 'NO',
      render: (_, index) => (
        <span className="font-medium">{((listState.currentPage || 1) - 1) * listState.perPage + (index || 0) + 1}</span>
      )
    },
    {
      key: 'name',
      label: 'GROUP NAME',
      sortable: true,
      render: (group) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{group.name}</p>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
        </div>
      )
    },
    {
      key: 'code',
      label: 'CODE',
      sortable: true,
      render: (group) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
          {group.code}
        </span>
      )
    },
    {
      key: 'participant_count',
      label: 'PARTICIPANTS',
      sortable: true,
      render: (group) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{group.participant_count || 0}</span>
        </div>
      )
    }
  ]

  // Actions column
  const renderActions = (group: Group) => (
    <div className="flex gap-2">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => navigate(`/back-office/group/${group.id}`)}
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
        onClick={() => handleDeleteGroup(group.id.toString())}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  // Handlers
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    listActions.setSearchQuery(searchInput.getValue())
    listActions.applyFilters()
  }

  // const handleDateFilterChange = (filter: DateFilterValue) => {
  //   listActions.setDateFilter(filter)
  // }

  const handleClear = () => {
    searchInput.clear()
    listActions.clearFilters()
  }

  const handleCreateGroup = async () => {
    try {
      const response = await apiClient.groups.create(formData)
      
      if (response.error) {
        alert('Failed to create group: ' + response.error)
      } else {
        setShowCreateDialog(false)
        listActions.refresh()
        // Reset form
        setFormData({
          name: '',
          description: '',
          code: ''
        })
      }
    } catch (err) {
      alert('Failed to create group')
    }
  }

  const handleEditGroup = async () => {
    if (!editingGroup) return
    
    try {
      const response = await apiClient.groups.update(editingGroup.id.toString(), formData)
      
      if (response.error) {
        alert('Failed to update group: ' + response.error)
      } else {
        setShowEditDialog(false)
        setEditingGroup(null)
        listActions.refresh()
      }
    } catch (err) {
      alert('Failed to update group')
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return
    
    try {
      const response = await apiClient.groups.delete(id)
      
      if (response.error) {
        alert('Failed to delete group: ' + response.error)
      } else {
        listActions.refresh()
      }
    } catch (err) {
      alert('Failed to delete group')
    }
  }

  const openEditDialog = (group: Group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name || '',
      description: group.description || '',
      code: group.code || ''
    })
    setShowEditDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input 
              placeholder="Search group name, description or code"
              className="max-w-sm"
              {...searchInput.inputProps}
            />
            {/* <DateFilter 
              value={listState.dateFilter} 
              onChange={handleDateFilterChange}
              label="Filter by date"
            /> */}
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={listState.items}
        loading={listState.loading}
        error={listState.error}
        onSort={listActions.setSort}
        sortBy={listState.sortBy}
        sortOrder={listState.sortOrder}
        renderActions={renderActions}
        onRefresh={listActions.refresh}
      />

      <Pagination
        currentPage={listState.currentPage}
        totalPages={listState.totalPages}
        totalItems={listState.totalItems}
        perPage={listState.perPage}
        onPageChange={listActions.setPage}
        onPerPageChange={listActions.setPerPage}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Add a new group to organize participants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Group Name</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="create-code">Group Code</Label>
              <Input
                id="create-code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="Enter unique group code"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update group information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="edit-code">Group Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="Enter unique group code"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup}>Update Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}