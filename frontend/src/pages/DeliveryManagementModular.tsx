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
import { Calendar, Clock, Edit, Trash2, Plus, Search, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api'
import { useListManagement } from '@/hooks/useListManagement'
import { DataTable, Column, Pagination } from '@/components/ui/data-table'
import { DateFilter, DateFilterValue } from '@/components/ui/date-filter'
import { useFastInput } from '@/hooks/useFastInput'

interface Delivery {
  id: number
  name: string
  exam_id: number
  group_id: number
  exam_code: string
  exam_name: string
  group_name: string
  group_code: string
  scheduled_at: string | null
  start_date: string | null
  created_at: string
  duration: number
  status: string
}

interface DeliveryFormData {
  name: string
  exam_id: number
  group_id: number
  start_date: string
  end_date: string
  duration: number
  status: string
}

export function DeliveryManagementModular() {
  const navigate = useNavigate()
  const searchInput = useFastInput('')
  
  // Use the modular list management hook
  const [listState, listActions] = useListManagement<Delivery>({
    endpoint: '/deliveries',
    perPage: 10,
    dateField: 'scheduled_at',
  })

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null)
  const [formData, setFormData] = useState<DeliveryFormData>({
    name: '',
    exam_id: 0,
    group_id: 0,
    start_date: '',
    end_date: '',
    duration: 120,
    status: 'scheduled'
  })

  // Table columns configuration
  const columns: Column<Delivery>[] = [
    {
      key: 'name',
      label: 'DELIVERY NAME',
      sortable: true,
      render: (delivery) => (
        <button 
          className="font-medium text-left hover:text-primary cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/back-office/delivery/${delivery.id}`)
          }}
        >
          {delivery.name || `Delivery #${delivery.id}`}
        </button>
      )
    },
    {
      key: 'scheduled_at',
      label: 'SCHEDULE',
      sortable: true,
      render: (delivery) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {delivery.scheduled_at || delivery.start_date ? 
            format(new Date(delivery.scheduled_at || delivery.start_date!), 'MMM dd, yyyy HH:mm') : 
            delivery.created_at ? 
              format(new Date(delivery.created_at), 'MMM dd, yyyy') : 
              '-'
          }
        </div>
      )
    },
    {
      key: 'duration',
      label: 'DURATION',
      sortable: true,
      render: (delivery) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {delivery.duration || 0} minutes
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (delivery) => {
        const getStatusBadge = (status: string) => {
          const colors = {
            scheduled: 'bg-blue-100 text-blue-800',
            ongoing: 'bg-orange-100 text-orange-800',
            completed: 'bg-green-100 text-green-800',
          }
          return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery.status || 'scheduled')}`}>
            {delivery.status || 'scheduled'}
          </span>
        )
      }
    }
  ]

  // Actions column
  const renderActions = (delivery: Delivery) => (
    <div className="flex gap-2">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => navigate(`/back-office/delivery/${delivery.id}`)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => openEditDialog(delivery)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => handleDeleteDelivery(delivery.id.toString())}
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

  const handleDateFilterChange = (filter: DateFilterValue) => {
    listActions.setDateFilter(filter)
  }

  const handleClear = () => {
    searchInput.clear()
    listActions.clearFilters()
  }

  const handleCreateDelivery = async () => {
    try {
      const response = await apiClient.deliveries.create(formData)
      
      if (response.error) {
        alert('Failed to create delivery: ' + response.error)
      } else {
        setShowCreateDialog(false)
        listActions.refresh()
        // Reset form
        setFormData({
          name: '',
          exam_id: 0,
          group_id: 0,
          start_date: '',
          end_date: '',
          duration: 120,
          status: 'scheduled'
        })
      }
    } catch (err) {
      alert('Failed to create delivery')
    }
  }

  const handleEditDelivery = async () => {
    if (!editingDelivery) return
    
    try {
      const response = await apiClient.deliveries.update(editingDelivery.id, formData)
      
      if (response.error) {
        alert('Failed to update delivery: ' + response.error)
      } else {
        setShowEditDialog(false)
        setEditingDelivery(null)
        listActions.refresh()
      }
    } catch (err) {
      alert('Failed to update delivery')
    }
  }

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery?')) return
    
    try {
      const response = await apiClient.deliveries.delete(id)
      
      if (response.error) {
        alert('Failed to delete delivery: ' + response.error)
      } else {
        listActions.refresh()
      }
    } catch (err) {
      alert('Failed to delete delivery')
    }
  }

  const openEditDialog = (delivery: Delivery) => {
    setEditingDelivery(delivery)
    setFormData({
      name: delivery.name || '',
      exam_id: delivery.exam_id || 0,
      group_id: delivery.group_id || 0,
      start_date: delivery.scheduled_at ? new Date(delivery.scheduled_at).toISOString().slice(0, 16) : '',
      end_date: '',
      duration: delivery.duration || 120,
      status: delivery.status || 'scheduled'
    })
    setShowEditDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Deliveries - Modular</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Delivery
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name"
                {...searchInput.inputProps}
                className="w-full"
              />
            </div>
            <div className="w-64">
              <DateFilter
                value={listState.dateFilter}
                onChange={handleDateFilterChange}
                placeholder="Filter by date"
              />
            </div>
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
        emptyMessage="No deliveries found"
        sortBy={listState.sortBy}
        sortOrder={listState.sortOrder}
        onSort={listActions.setSort}
        actions={renderActions}
        keyExtractor={(item) => item.id}
      />

      {listState.totalPages > 1 && (
        <Pagination
          currentPage={listState.currentPage}
          totalPages={listState.totalPages}
          onPageChange={listActions.setPage}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Delivery</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                End Date
              </Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDelivery}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Update the delivery details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="edit-start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-end_date" className="text-right">
                End Date
              </Label>
              <Input
                id="edit-end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-duration" className="text-right">
                Duration (min)
              </Label>
              <Input
                id="edit-duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false)
              setEditingDelivery(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditDelivery}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}