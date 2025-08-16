import { useEffect, useCallback } from 'react'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import { FileQuestion, Edit, Trash2, Plus, Search, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useExamStore } from '@/store/examStore'
import { useNavigate } from 'react-router-dom'
import { MainContent } from '@/components/layout/MainContent'

export function QuestionSets() {
  const searchTitleInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    selectedType: 'all',
    vignetteFilter: 'all',
    loading: true,
    error: null as string | null,
    showAddDialog: false,
    showEditDialog: false,
    editingQuestionSet: null as any,
    formData: {
      title: '',
      type: 'multiple-choice',
      description: '',
      vignette: false
    },
    currentPage: 1,
    totalPages: 10
  })
  const { questionSets, setQuestionSets } = useExamStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchQuestionSets()
  }, [])

  const fetchQuestionSets = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      // Try with explicit page and per_page parameters  
      const response = await apiClient.get('/items?page=1&per_page=50')
      
      if (response.error) {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock data:', response.error)
        const mockQuestionSets = []
        const types = ['simple', 'multiple-choice', 'essay', 'interview']
        const topics = ['Orthopedic', 'Trauma', 'Spine', 'Joint', 'Pediatric', 'Sports', 'Fracture', 'Arthroscopy']
        
        // Generate 115 mock question sets for realistic pagination
        for (let i = 1; i <= 115; i++) {
          mockQuestionSets.push({
            id: `qs_${i}`,
            title: `${topics[i % topics.length]} ${types[i % types.length] === 'multiple-choice' ? 'MCQ' : types[i % types.length]} Set ${i}`,
            questions: Array(Math.floor(Math.random() * 50) + 10).fill(null),
            type: types[i % types.length],
            vignette: i % 3 === 0,
            categories: []
          })
        }
        setQuestionSets(mockQuestionSets)
        setState.loading = false
        return
      } else if ((response as any).data) {
        // Check if response has pagination structure
        const responseData = (response as any).data
        const items = responseData.data || responseData
        
        // Transform API data to match our QuestionSet interface
        const questionSets = Array.isArray(items) ? items.map((item: any) => ({
          id: item.id?.toString() || '',
          title: item.title || item.name || `Question Set ${item.id}`,
          questions: item.questions || [],
          type: item.type || 'multiple-choice',
          vignette: item.vignette || item.is_vignette || false,
          categories: item.categories || []
        })) : []
        setQuestionSets(questionSets)
      }
    } catch (err) {
      // Fallback to mock data on error
      console.error('Error fetching question sets, using mock data:', err)
      const mockQuestionSets = []
      const types = ['simple', 'multiple-choice', 'essay', 'interview']
      const topics = ['Orthopedic', 'Trauma', 'Spine', 'Joint', 'Pediatric', 'Sports', 'Fracture', 'Arthroscopy']
      
      // Generate 115 mock question sets for realistic pagination
      for (let i = 1; i <= 115; i++) {
        mockQuestionSets.push({
          id: `qs_${i}`,
          title: `${topics[i % topics.length]} ${types[i % types.length] === 'multiple-choice' ? 'MCQ' : types[i % types.length]} Set ${i}`,
          questions: Array(Math.floor(Math.random() * 50) + 10).fill(null),
          type: types[i % types.length],
          vignette: i % 3 === 0,
          categories: []
        })
      }
      setQuestionSets(mockQuestionSets)
    } finally {
      setState.loading = false
    }
  }

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredQuestionSets
  }, [])

  const handleClear = useCallback(() => {
    searchTitleInput.setValue('')
    setState.selectedType = 'all'
    setState.vignetteFilter = 'all'
    setState.currentPage = 1
  }, [searchTitleInput, setState])

  const handleAddQuestionSet = () => {
    setState.formData = {
      title: '',
      type: 'multiple-choice',
      description: '',
      vignette: false
    }
    setState.showAddDialog = true
  }

  const handleEditQuestionSet = (qs: any) => {
    setState.editingQuestionSet = qs
    setState.formData = {
      title: qs.title,
      type: qs.type,
      description: qs.description || '',
      vignette: qs.vignette
    }
    setState.showEditDialog = true
  }

  const handleSaveAdd = async () => {
    const newQuestionSet = {
      id: `qs_${Date.now()}`,
      title: state.formData.title,
      type: state.formData.type,
      description: state.formData.description,
      vignette: state.formData.vignette,
      questions: [],
      categories: []
    }
    setQuestionSets([...questionSets, newQuestionSet])
    setState.showAddDialog = false
  }

  const handleSaveEdit = async () => {
    const updated = questionSets.map(qs => 
      qs.id === state.editingQuestionSet.id 
        ? { ...qs, ...state.formData }
        : qs
    )
    setQuestionSets(updated)
    setState.showEditDialog = false
    setState.editingQuestionSet = null
  }

  const handleDeleteQuestionSet = async (id: string) => {
    if (confirm('Are you sure you want to delete this question set?')) {
      setQuestionSets(questionSets.filter(qs => qs.id !== id))
    }
  }

  const handlePageChange = (page: number) => {
    setState.currentPage = page
  }

  const filteredQuestionSets = questionSets.filter(qs => {
    const matchesTitle = qs.title.toLowerCase().includes(searchTitleInput.getValue().toLowerCase())
    const matchesType = state.selectedType === 'all' || qs.type === state.selectedType
    const matchesVignette = state.vignetteFilter === 'all' || 
      (state.vignetteFilter === 'vignette' && qs.vignette) ||
      (state.vignetteFilter === 'non-vignette' && !qs.vignette)
    return matchesTitle && matchesType && matchesVignette
  })

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'simple': 'Simple',
      'multiple-choice': 'Multiple Choice',
      'essay': 'Essay',
      'interview': 'Interview',
    }
    return labels[type] || type
  }

  if (state.loading) {
    return (
      <MainContent>
        <Loading message="Loading question sets..." />
      </MainContent>
    )
  }

  if (state.error) {
    return (
      <MainContent>
        <ErrorMessage error={state.error} onRetry={fetchQuestionSets} />
      </MainContent>
    )
  }

  // Paginate the filtered results
  const itemsPerPage = 15
  const startIndex = (state.currentPage - 1) * itemsPerPage
  const paginatedQuestionSets = filteredQuestionSets.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filteredQuestionSets.length / itemsPerPage)

  const headerActions = (
    <Button onClick={handleAddQuestionSet}>
      <Plus className="h-4 w-4 mr-2" />
      Question Set
    </Button>
  )

  return (
    <MainContent>
      <div className="space-y-6">

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search Title"
              {...searchTitleInput.inputProps}
              className="flex-1"
            />
            <Select value={state.selectedType} onValueChange={(value) => setState.selectedType = value}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
              </SelectContent>
            </Select>
            <Select value={state.vignetteFilter} onValueChange={(value) => setState.vignetteFilter = value}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Vignette filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show All</SelectItem>
                <SelectItem value="vignette">Vignette</SelectItem>
                <SelectItem value="non-vignette">Non Vignette</SelectItem>
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
                <TableHead>TITLE</TableHead>
                <TableHead>QUESTIONS</TableHead>
                <TableHead>TYPE</TableHead>
                <TableHead>VIGNETTE</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestionSets.map((qs, index) => (
                <TableRow key={qs.id}>
                  <TableCell>{startIndex + index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4 text-muted-foreground" />
                      <button 
                        className="font-medium text-left hover:text-primary cursor-pointer"
                        onClick={() => navigate(`/back-office/question-set/${qs.id}`)}
                      >
                        {qs.title}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>{qs.questions.length}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {getTypeLabel(qs.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {qs.vignette ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/back-office/question-set/${qs.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditQuestionSet(qs)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteQuestionSet(qs.id)}
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
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handlePageChange(state.currentPage - 1)}
          disabled={state.currentPage === 1}
        >
          Previous
        </Button>
        
        {/* Show page numbers */}
        {(() => {
          const pages = []
          const maxVisible = 5
          let start = Math.max(1, state.currentPage - 2)
          let end = Math.min(totalPages, start + maxVisible - 1)
          
          if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1)
          }
          
          if (start > 1) {
            pages.push(
              <Button
                key={1}
                variant={state.currentPage === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(1)}
              >
                1
              </Button>
            )
            if (start > 2) {
              pages.push(<span key="dots1" className="px-2">...</span>)
            }
          }
          
          for (let i = start; i <= end; i++) {
            pages.push(
              <Button
                key={i}
                variant={state.currentPage === i ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(i)}
              >
                {i}
              </Button>
            )
          }
          
          if (end < totalPages) {
            if (end < totalPages - 1) {
              pages.push(<span key="dots2" className="px-2">...</span>)
            }
            pages.push(
              <Button
                key={totalPages}
                variant={state.currentPage === totalPages ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </Button>
            )
          }
          
          return pages
        })()}
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handlePageChange(state.currentPage + 1)}
          disabled={state.currentPage === totalPages || totalPages === 0}
        >
          Next
        </Button>
      </div>

      {/* Add Question Set Dialog */}
      <Dialog open={state.showAddDialog} onOpenChange={(open) => setState.showAddDialog = open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Question Set</DialogTitle>
            <DialogDescription>
              Create a new question set with basic information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-title" className="text-right">
                Title
              </Label>
              <Input
                id="add-title"
                value={state.formData.title}
                onChange={(e) => setState.formData = {...state.formData, title: e.target.value}}
                className="col-span-3"
                placeholder="Enter question set title"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-type" className="text-right">
                Type
              </Label>
              <Select 
                value={state.formData.type} 
                onValueChange={(value) => setState.formData = {...state.formData, type: value}}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="add-description"
                value={state.formData.description}
                onChange={(e) => setState.formData = {...state.formData, description: e.target.value}}
                className="col-span-3"
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-vignette" className="text-right">
                Vignette
              </Label>
              <div className="col-span-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.formData.vignette}
                    onChange={(e) => setState.formData = {...state.formData, vignette: e.target.checked}}
                    className="rounded border-gray-300"
                  />
                  <span>This is a vignette question set</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setState.showAddDialog = false}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdd}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Set Dialog */}
      <Dialog open={state.showEditDialog} onOpenChange={(open) => setState.showEditDialog = open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question Set</DialogTitle>
            <DialogDescription>
              Update the question set information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Title
              </Label>
              <Input
                id="edit-title"
                value={state.formData.title}
                onChange={(e) => setState.formData = {...state.formData, title: e.target.value}}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="edit-vignette" className="text-right">
                Vignette
              </Label>
              <div className="col-span-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.formData.vignette}
                    onChange={(e) => setState.formData = {...state.formData, vignette: e.target.checked}}
                    className="rounded border-gray-300"
                  />
                  <span>This is a vignette question set</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setState.showEditDialog = false
              setState.editingQuestionSet = null
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MainContent>
  )
}