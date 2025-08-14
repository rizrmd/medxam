import { useLocalStateSync } from '@/hooks/useLocalState'
import { useCallback, useEffect, useState } from 'react'
import { useFastInput } from '@/hooks/useFastInput'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Save, 
  BarChart3,
  Trash2,
  Edit,
  Search
} from 'lucide-react'
import { useExamStore } from '@/store/examStore'

export function QuestionSetDetails() {
  const { id } = useParams<{ id: string }>()
  const searchTestInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    selectedType: 'all',
    loading: true,
    error: null as string | null,
    questionSet: null as any,
    questions: [] as any[]
  })

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled locally in this component
  }, [])

  const handleClear = useCallback(() => {
    searchTestInput.setValue('')
    setState.selectedType = 'all'
  }, [searchTestInput, setState])

  useEffect(() => {
    if (id) {
      fetchQuestionSet(id)
    }
  }, [id])

  const fetchQuestionSet = async (setId: string) => {
    setState.loading = true
    setState.error = null
    
    try {
      // Fetch the question set details
      const response = await apiClient.get(`/items/${setId}`)
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        const item = (response as any).data
        setState.questionSet = {
          id: item.id?.toString() || '',
          title: item.title || item.name || `Question Set ${item.id}`,
          questions: item.questions || [],
          type: item.type || 'multiple-choice',
          vignette: item.vignette || false,
          categories: item.categories || []
        }
        
        // If there are question IDs, fetch the actual questions
        if (item.questions && item.questions.length > 0) {
          // This would fetch the actual question details
          setState.questions = item.questions
        }
      }
    } catch (err) {
      setState.error = 'Failed to load question set'
      console.error('Error fetching question set:', err)
    } finally {
      setState.loading = false
    }
  }

  const { categories } = useExamStore()
  const questionSet = state.questionSet

  // Use actual questions from state or provide empty array
  const questions = state.questions.length > 0 ? state.questions : []

  if (state.loading) {
    return <Loading message="Loading question set..." />
  }

  if (state.error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/back-office/question-set">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Error Loading Question Set</h1>
            <p className="text-muted-foreground mt-2">{state.error}</p>
            <Button onClick={() => fetchQuestionSet(id!)} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!questionSet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/back-office/question-set">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Question Set Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/question-set">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Authoring Question Set - IoNbEc</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Show Stats
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload an Image
          </Button>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add a Question
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{questionSet.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions" className="w-full">
            <TabsList>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions" className="space-y-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <Input
                  placeholder="Search Tests"
                  {...searchTestInput.inputProps}
                  className="flex-1"
                />
                <Select value={state.selectedType} onValueChange={(value) => setState.selectedType = value}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Question Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </form>

              <div className="space-y-4">
                {questions.map((question) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Question {question.id}</CardTitle>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">{question.text}</p>
                      {question.type === 'multiple-choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full border flex items-center justify-center text-sm">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className={option === question.correctAnswer ? 'font-medium text-green-600' : ''}>
                                {option}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {question.points && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          Points: {question.points}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Question Set Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <Input value={questionSet.title} readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <Select value={questionSet.type}>
                      <SelectTrigger>
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea placeholder="Enter description..." />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="categories" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Disease Group</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Disease Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c.type === 'disease-group').slice(0, 13).map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Region Group</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Region Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c.type === 'region-group').slice(0, 22).map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Typical Group</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Typical Group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified">Unspecified</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                          <SelectItem value="recall">Recall Type</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Specific Part</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Specific Part" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified">Unspecified</SelectItem>
                          <SelectItem value="pathogenesis">Pathogenesis</SelectItem>
                          <SelectItem value="diagnosis">Diagnosis/Investigation</SelectItem>
                          <SelectItem value="treatment">Treatment/Management</SelectItem>
                          <SelectItem value="prognosis">Prognosis and Complication</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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