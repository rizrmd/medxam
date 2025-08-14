import { useLocalStateSync } from '@/hooks/useLocalState'
import { useParams, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Save, 
  FileText,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit
} from 'lucide-react'
import { useExamStore } from '@/store/examStore'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'

export function ExamDetails() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useLocalStateSync({
    examName: '',
    examCode: '',
    duration: '120',
    description: '',
    loading: true,
    error: null as string | null,
    exam: null as any,
    examQuestions: [] as any[]
  })

  useEffect(() => {
    if (id) {
      fetchExamDetails(id)
    }
  }, [id])

  const fetchExamDetails = async (examId: string) => {
    setState.loading = true
    setState.error = null
    
    try {
      const response = await apiClient.exams.get(examId)
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        const examData = (response as any).data
        setState.exam = examData
        setState.examName = examData.name || ''
        setState.examCode = examData.code || ''
        setState.duration = examData.duration?.toString() || '120'
        setState.description = examData.description || ''
        
        // Fetch exam questions if they exist
        if (examData.question_sets || examData.questions) {
          setState.examQuestions = examData.question_sets || examData.questions || []
        }
      }
    } catch (err) {
      setState.error = 'Failed to load exam details'
      console.error('Error fetching exam:', err)
    } finally {
      setState.loading = false
    }
  }

  if (state.loading) {
    return <Loading message="Loading exam details..." />
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={() => fetchExamDetails(id!)} />
  }

  const exam = state.exam
  const examQuestions = state.examQuestions

  if (!exam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/back-office/test">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Exam Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/test">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Configure Exam - IoNbEc</h1>
            <p className="text-muted-foreground">{exam.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="delivery">Delivery Settings</TabsTrigger>
              <TabsTrigger value="scoring">Scoring Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Exam Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="examName">Exam Name</Label>
                      <Input
                        id="examName"
                        value={state.examName || exam.name}
                        onChange={(e) => setState.examName = e.target.value}
                        placeholder="Enter exam name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="examCode">Exam Code</Label>
                      <Input
                        id="examCode"
                        value={state.examCode || exam.code}
                        onChange={(e) => setState.examCode = e.target.value}
                        placeholder="Enter exam code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={state.description}
                        onChange={(e) => setState.description = e.target.value}
                        placeholder="Enter exam description..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Exam Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={state.duration}
                        onChange={(e) => setState.duration = e.target.value}
                        placeholder="120"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={exam.status}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passingScore">Passing Score (%)</Label>
                      <Input
                        id="passingScore"
                        type="number"
                        placeholder="70"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAttempts">Maximum Attempts</Label>
                      <Input
                        id="maxAttempts"
                        type="number"
                        placeholder="3"
                        min="1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="questions" className="space-y-6 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Exam Questions</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question Set
                </Button>
              </div>

              <div className="space-y-4">
                {examQuestions.map((questionSet) => (
                  <Card key={questionSet.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{questionSet.questionSetTitle || questionSet.title || questionSet.name || `Question Set ${questionSet.id}`}</h4>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>{questionSet.questionCount || questionSet.question_count || questionSet.questions?.length || 0} questions</span>
                              <span>{questionSet.points || 10} points</span>
                              <span>{questionSet.timeLimit || questionSet.time_limit || 30} min</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Question Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">40</div>
                      <div className="text-sm text-muted-foreground">Total Questions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">80</div>
                      <div className="text-sm text-muted-foreground">Total Points</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">50</div>
                      <div className="text-sm text-muted-foreground">Estimated Time (min)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="delivery" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Delivery Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time Limit Enforcement</Label>
                      <Select defaultValue="strict">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strict">Strict - Auto submit</SelectItem>
                          <SelectItem value="grace">Grace period allowed</SelectItem>
                          <SelectItem value="flexible">Flexible timing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Question Navigation</Label>
                      <Select defaultValue="free">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free navigation</SelectItem>
                          <SelectItem value="linear">Linear only</SelectItem>
                          <SelectItem value="restricted">Restricted back</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Instructions for Candidates</Label>
                    <Textarea
                      placeholder="Enter instructions that candidates will see before starting the exam..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="scoring" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scoring Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Scoring Method</Label>
                      <Select defaultValue="weighted">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equal">Equal weight per question</SelectItem>
                          <SelectItem value="weighted">Weighted by difficulty</SelectItem>
                          <SelectItem value="custom">Custom scoring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Negative Marking</Label>
                      <Select defaultValue="none">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No negative marking</SelectItem>
                          <SelectItem value="quarter">-0.25 per wrong answer</SelectItem>
                          <SelectItem value="half">-0.5 per wrong answer</SelectItem>
                          <SelectItem value="full">-1 per wrong answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade Scale</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 border rounded">
                        <div className="font-medium">A</div>
                        <div className="text-sm text-muted-foreground">85-100%</div>
                      </div>
                      <div className="text-center p-2 border rounded">
                        <div className="font-medium">B</div>
                        <div className="text-sm text-muted-foreground">70-84%</div>
                      </div>
                      <div className="text-center p-2 border rounded">
                        <div className="font-medium">C</div>
                        <div className="text-sm text-muted-foreground">55-69%</div>
                      </div>
                      <div className="text-center p-2 border rounded">
                        <div className="font-medium">F</div>
                        <div className="text-sm text-muted-foreground">0-54%</div>
                      </div>
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