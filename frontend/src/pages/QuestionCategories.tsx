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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tags, Edit, Trash2, Plus, Search } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { useHeaderActions } from '@/hooks/useHeaderActions'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'

export function QuestionCategories() {
  const searchNameInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    selectedType: 'all',
    categories: [] as any[],
    loading: true,
    error: null as string | null,
    showEditDialog: false,
    editingCategory: null as any,
    formData: {
      name: '',
      type: 'disease-group'
    }
  })

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredCategories
  }, [])

  const handleClear = useCallback(() => {
    searchNameInput.setValue('')
    setState.selectedType = 'all'
  }, [searchNameInput, setState])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      const response = await apiClient.categories.list()
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        // Handle paginated response
        const categoryData = (response as any).data.data || (response as any).data
        setState.categories = Array.isArray(categoryData) ? categoryData : []
      }
    } catch (err) {
      setState.error = 'Failed to load categories'
    } finally {
      setState.loading = false
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      const response = await apiClient.categories.delete(id)
      
      if (response.error) {
        alert('Failed to delete category: ' + response.error)
      } else {
        await fetchCategories()
      }
    } catch (err) {
      alert('Failed to delete category')
    }
  }

  const openEditDialog = (category: any) => {
    setState.editingCategory = category
    setState.formData = {
      name: category.name || '',
      type: category.type || 'disease-group'
    }
    setState.showEditDialog = true
  }

  const handleEditCategory = async () => {
    if (!state.editingCategory) return
    
    try {
      const response = await apiClient.categories.update(state.editingCategory.id, state.formData)
      
      if (response.error) {
        alert('Failed to update category: ' + response.error)
      } else {
        setState.showEditDialog = false
        setState.editingCategory = null
        await fetchCategories()
      }
    } catch (err) {
      alert('Failed to update category')
    }
  }

  if (state.loading) {
    return <Loading message="Loading categories..." />
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={fetchCategories} />
  }

  const filteredCategories = state.categories.filter(category => {
    const matchesName = category.name.toLowerCase().includes(searchNameInput.getValue().toLowerCase())
    const matchesType = state.selectedType === 'all' || category.type === state.selectedType
    return matchesName && matchesType
  })

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'disease-group': 'Disease Group',
      'region-group': 'Region Group',
      'specific-part': 'Specific Part',
      'typical-group': 'Typical Group',
    }
    return labels[type] || type
  }

  const headerActions = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Category
    </Button>
  )
  
  useHeaderActions(headerActions)

  return (
    <div className="space-y-6">

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search Name"
              {...searchNameInput.inputProps}
              className="flex-1"
            />
            <Select value={state.selectedType} onValueChange={(value) => setState.selectedType = value}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="disease-group">Disease Group</SelectItem>
                <SelectItem value="region-group">Region Group</SelectItem>
                <SelectItem value="specific-part">Specific Part</SelectItem>
                <SelectItem value="typical-group">Typical Group</SelectItem>
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
                <TableHead>TYPE</TableHead>
                <TableHead>QUESTION</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {getTypeLabel(category.type)}
                    </span>
                  </TableCell>
                  <TableCell>{category.question_count || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
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
        {[1, 2, 3].map((page) => (
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
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
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
              <Label htmlFor="edit-type" className="text-right">
                Type
              </Label>
              <Select 
                value={state.formData.type} 
                onValueChange={(value) => setState.formData = {...state.formData, type: value}}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disease-group">Disease Group</SelectItem>
                  <SelectItem value="region-group">Region Group</SelectItem>
                  <SelectItem value="specific-part">Specific Part</SelectItem>
                  <SelectItem value="typical-group">Typical Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setState.showEditDialog = false
              setState.editingCategory = null
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}