import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/date-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Trash2, Copy, Clock, Tag, FileText, CheckCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { apiClient } from '@/lib/api'
import { Loading } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { MainContent } from '@/components/layout/MainContent'

export function QuestionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [state, setState] = useLocalStateSync({
    activeTab: 'overview',
    loading: true,
    error: null as string | null,
    question: null as any
  })

  useEffect(() => {
    if (id) {
      fetchQuestion(id)
    }
  }, [id])

  const fetchQuestion = async (questionId: string) => {
    setState.loading = true
    setState.error = null
    
    try {
      const response = await apiClient.get(`/questions/${questionId}`)
      
      if (response.error) {
        setState.error = response.error
      } else if ((response as any).data) {
        const data = (response as any).data
        setState.question = {
          id: data.id || questionId,
          text: data.text || data.question || `Question ${data.id}`,
          type: data.type || 'Multiple Choice',
          diseaseGroup: data.disease_group || data.diseaseGroup || 'Unspecified',
          regionGroup: data.region_group || data.regionGroup || 'Unspecified',
          specificPart: data.specific_part || data.specificPart || 'Unspecified',
          typicalGroup: data.typical_group || data.typicalGroup || 'Analysis',
          difficulty: data.difficulty || 'Medium',
          points: data.points || 10,
          timeLimit: data.time_limit || data.timeLimit || 120,
          options: data.options || data.answers || [],
          explanation: data.explanation || '',
          references: data.references || [],
          tags: data.tags || [],
          createdAt: data.created_at || data.createdAt || new Date().toISOString(),
          updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
          usageCount: data.usage_count || data.usageCount || 0,
          averageScore: data.average_score || data.averageScore || 0
        }
      }
    } catch (err) {
      setState.error = 'Failed to load question'
      console.error('Error fetching question:', err)
    } finally {
      setState.loading = false
    }
  }

  if (state.loading) {
    return (
      <MainContent>
        <Loading message="Loading question..." />
      </MainContent>
    )
  }

  if (state.error) {
    return (
      <MainContent>
        <ErrorMessage error={state.error} onRetry={() => fetchQuestion(id!)} />
      </MainContent>
    )
  }

  const question = state.question

  if (!question) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/back-office/question-pack')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Question Not Found</h1>
          </div>
        </div>
      </MainContent>
    )
  }

  return (
    <MainContent>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/back-office/question-pack')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Question Detail</h1>
          <Badge variant="outline">{question.type}</Badge>
          <Badge variant={question.difficulty === 'Easy' ? 'default' : question.difficulty === 'Medium' ? 'secondary' : 'destructive'}>
            {question.difficulty}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-6">{question.text}</p>
              
              {question.type === 'Multiple Choice' && question.options && (
                <div className="space-y-3">
                  <h4 className="font-semibold mb-2">Answer Options:</h4>
                  {question.options.map((option, index) => (
                    <div 
                      key={option.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        option.correct ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : ''
                      }`}
                    >
                      <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option.text}</span>
                      {option.correct && (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={state.activeTab} onValueChange={(value) => setState.activeTab = value}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" onClick={() => setState.activeTab = 'overview'}>Overview</TabsTrigger>
              <TabsTrigger value="explanation" onClick={() => setState.activeTab = 'explanation'}>Explanation</TabsTrigger>
              <TabsTrigger value="statistics" onClick={() => setState.activeTab = 'statistics'}>Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Disease Group</label>
                      <p className="mt-1">{question.diseaseGroup}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Region Group</label>
                      <p className="mt-1">{question.regionGroup}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Specific Part</label>
                      <p className="mt-1">{question.specificPart}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Typical Group</label>
                      <p className="mt-1">{question.typicalGroup}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {question.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="explanation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Explanation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{question.explanation}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>References</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {question.references.map((ref, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm">{ref}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="statistics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Times Used</p>
                      <p className="text-2xl font-bold">{question.usageCount}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-2xl font-bold">{question.averageScore}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Metadata - Right Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Question ID</label>
                <p className="mt-1 font-mono text-sm">{question.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Points</label>
                <p className="mt-1">{question.points} points</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Time Limit</label>
                <p className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {question.timeLimit} seconds
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="mt-1">{formatShortDate(question.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="mt-1">{formatShortDate(question.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                Add to Question Set
              </Button>
              <Button className="w-full" variant="outline">
                Preview in Exam
              </Button>
              <Button className="w-full" variant="outline">
                Export Question
              </Button>
              <Button className="w-full" variant="outline">
                View History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </MainContent>
  )
}