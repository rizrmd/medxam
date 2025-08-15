import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText, Edit, Trash2, Plus, Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CreateExamForm } from '@/components/forms/CreateExamForm'
import { apiClient } from '@/lib/api'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { useHeaderActions } from '@/hooks/useHeaderActions'

export function ExamManagement() {
  const searchCodeInput = useFastInput('')
  const searchNameInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    showCreateForm: false,
    exams: [] as any[],
    loading: true,
    error: null as string | null,
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 10,
    appliedSearchCode: '',
    appliedSearchName: ''
  })
  const navigate = useNavigate()

  // Initial load
  useEffect(() => {
    fetchExams()
  }, [])

  // Handle pagination and search changes
  useEffect(() => {
    if (state.currentPage > 1 || state.appliedSearchCode || state.appliedSearchName) {
      fetchExams()
    }
  }, [state.currentPage, state.appliedSearchCode, state.appliedSearchName])

  const fetchExams = async () => {
    setState.loading = true
    setState.error = null
    
    try {
      // Build query params for pagination and search
      const params = new URLSearchParams()
      params.append('page', state.currentPage.toString())
      params.append('per_page', state.perPage.toString())
      if (state.appliedSearchCode) params.append('code', state.appliedSearchCode)
      if (state.appliedSearchName) params.append('name', state.appliedSearchName)
      
      const response = await apiClient.get(`/exams?${params.toString()}`)
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        // Handle paginated response
        const examData = (response as any).data.data || (response as any).data
        setState.exams = Array.isArray(examData) ? examData : []
        setState.total = (response as any).data.total || 0
        setState.totalPages = (response as any).data.total_pages || 1
      }
    } catch (err) {
      setState.error = 'Failed to load exams'
    } finally {
      setState.loading = false
    }
  }

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Apply search filters and reset to first page
    setState.appliedSearchCode = searchCodeInput.getValue()
    setState.appliedSearchName = searchNameInput.getValue()
    setState.currentPage = 1
  }, [searchCodeInput, searchNameInput, setState])

  const handleClear = useCallback(() => {
    searchCodeInput.clear()
    searchNameInput.clear()
    setState.appliedSearchCode = ''
    setState.appliedSearchName = ''
    setState.currentPage = 1
  }, [searchCodeInput, searchNameInput, setState])

  // No need for client-side filtering since we're doing server-side pagination
  const filteredExams = state.exams

  const handleCreateExam = async (formData: any) => {
    try {
      const response = await apiClient.exams.create({
        name: formData.name,
        code: formData.code,
        duration: parseInt(formData.duration),
        status: formData.status
      })
      
      if (response.error) {
        alert('Failed to create exam: ' + response.error)
      } else {
        await fetchExams()
        setState.showCreateForm = false
      }
    } catch (err) {
      alert('Failed to create exam')
    }
  }

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return
    
    try {
      const response = await apiClient.exams.delete(id)
      
      if (response.error) {
        alert('Failed to delete exam: ' + response.error)
      } else {
        await fetchExams()
      }
    } catch (err) {
      alert('Failed to delete exam')
    }
  }

  if (state.loading) {
    return <Loading message="Loading exams..." />
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={fetchExams} />
  }

  const headerActions = (
    <Button onClick={() => setState.showCreateForm = true}>
      <Plus className="h-4 w-4 mr-2" />
      Exam
    </Button>
  )
  
  useHeaderActions(headerActions)

  return (
    <div className="space-y-6">

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search code"
              {...searchCodeInput.inputProps}
              className="flex-1"
            />
            <Input
              placeholder="Search name"
              {...searchNameInput.inputProps}
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
                <TableHead>EXAM NAME</TableHead>
                <TableHead>QUESTION</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <button 
                          className="font-medium text-left hover:text-primary cursor-pointer"
                          onClick={() => navigate(`/back-office/test/${exam.id}`)}
                        >
                          {exam.name}
                        </button>
                        <p className="text-sm text-muted-foreground">Code: {exam.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{exam.question_count || 0} questions</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/back-office/test/${exam.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/back-office/test/${exam.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteExam(exam.id)}
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
      {state.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={state.currentPage === 1}
            onClick={() => setState.currentPage = state.currentPage - 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(5, state.totalPages) }, (_, i) => {
            const startPage = Math.max(1, state.currentPage - 2)
            const page = startPage + i
            if (page > state.totalPages) return null
            
            return (
              <Button
                key={page}
                variant={page === state.currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setState.currentPage = page}
              >
                {page}
              </Button>
            )
          }).filter(Boolean)}
          
          <Button 
            variant="outline" 
            size="sm"
            disabled={state.currentPage === state.totalPages}
            onClick={() => setState.currentPage = state.currentPage + 1}
          >
            Next
          </Button>
        </div>
      )}

      <CreateExamForm 
        open={state.showCreateForm}
        onOpenChange={(open) => setState.showCreateForm = open}
        onSubmit={handleCreateExam}
      />
    </div>
  )
}