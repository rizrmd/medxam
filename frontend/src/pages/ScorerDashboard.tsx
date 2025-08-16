import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  AlertCircle,
  User,
  Clock,
  FileText,
  Save,
  ArrowLeft
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MainContent } from '@/components/layout/MainContent'

interface ParticipantResult {
  id: number
  participant_id: number
  delivery_id: number
  participant_name: string
  participant_reg: string
  started_at: string
  finished_at: string
  total_score?: number
  max_score: number
  status: 'completed' | 'in_progress' | 'not_started'
  answers: Array<{
    question_id: number
    question_text: string
    answer_text: string
    score?: number
    max_score: number
    scorer_comment?: string
  }>
}

export function ScorerDashboard() {
  const navigate = useNavigate()
  const { deliveryId } = useParams<{ deliveryId: string }>()
  const { isAuthenticated, user } = useAuthStore()
  const [state, setState] = useLocalStateSync({
    results: [] as ParticipantResult[],
    selectedResult: null as ParticipantResult | null,
    isLoading: true,
    isSaving: false,
    error: ''
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/committee/login')
      return
    }

    const hasScorerRole = user?.roles?.some(role => 
      role.name === 'Scorer / Committee' || role.name === 'scorer'
    )
    
    if (!hasScorerRole) {
      navigate('/login')
      return
    }

    if (deliveryId) {
      loadDeliveryResults()
    }
  }, [isAuthenticated, user, navigate, deliveryId])

  const loadDeliveryResults = async () => {
    if (!deliveryId) return
    
    setState.isLoading = true
    setState.error = ''
    
    try {
      // TODO: Replace with actual API endpoint for getting delivery results
      const response = await apiClient.get(`/deliveries/${deliveryId}/results`)
      
      if (response.error) {
        setState.error = response.error
      } else {
        setState.results = response.data || []
      }
    } catch (error) {
      setState.error = 'Failed to load delivery results'
      console.error('Error loading results:', error)
    } finally {
      setState.isLoading = false
    }
  }

  const saveScore = async (questionId: number, score: number, comment: string) => {
    if (!state.selectedResult) return

    setState.isSaving = true
    
    try {
      const response = await apiClient.post(`/attempts/${state.selectedResult.id}/score`, {
        question_id: questionId,
        score,
        comment
      })
      
      if (response.error) {
        alert(`Failed to save score: ${response.error}`)
      } else {
        // Update local state
        const updatedResult = { ...state.selectedResult }
        const answerIndex = updatedResult.answers.findIndex(a => a.question_id === questionId)
        if (answerIndex >= 0) {
          updatedResult.answers[answerIndex].score = score
          updatedResult.answers[answerIndex].scorer_comment = comment
        }
        setState.selectedResult = updatedResult
        
        // Update results list
        const resultIndex = state.results.findIndex(r => r.id === state.selectedResult!.id)
        if (resultIndex >= 0) {
          const newResults = [...state.results]
          newResults[resultIndex] = updatedResult
          setState.results = newResults
        }
      }
    } catch (error) {
      alert('Failed to save score')
      console.error('Error saving score:', error)
    } finally {
      setState.isSaving = false
    }
  }

  const getScorePercentage = (result: ParticipantResult) => {
    const totalScored = result.answers.reduce((sum, answer) => sum + (answer.score || 0), 0)
    return result.max_score > 0 ? Math.round((totalScored / result.max_score) * 100) : 0
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-500 text-white">In Progress</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">Not Started</Badge>
    }
  }

  if (state.isLoading) {
    return (
      <MainContent>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading results...</p>
          </div>
        </div>
      </MainContent>
    )
  }

  return (
    <MainContent>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/committee/deliveries')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scoring Dashboard</h1>
                <p className="text-gray-600">Delivery #{deliveryId}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{state.error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Results List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Participant Results</CardTitle>
                <CardDescription>
                  {state.results.length} participants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.results.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No results available</p>
                ) : (
                  state.results.map((result) => (
                    <Card
                      key={result.id}
                      className={`cursor-pointer transition-colors ${
                        state.selectedResult?.id === result.id
                          ? 'ring-2 ring-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setState.selectedResult = result}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{result.participant_name}</h4>
                            <p className="text-sm text-gray-600">Reg: {result.participant_reg}</p>
                          </div>
                          {getStatusBadge(result.status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Score: {getScorePercentage(result)}%
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scoring Interface */}
          <div className="lg:col-span-2">
            {!state.selectedResult ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Participant</h3>
                  <p className="text-gray-600">Choose a participant from the list to start scoring their answers.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        {state.selectedResult.participant_name}
                      </CardTitle>
                      <CardDescription>
                        Registration: {state.selectedResult.participant_reg}
                      </CardDescription>
                    </div>
                    {getStatusBadge(state.selectedResult.status)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Started: {new Date(state.selectedResult.started_at).toLocaleString()}</span>
                    </span>
                    {state.selectedResult.finished_at && (
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Finished: {new Date(state.selectedResult.finished_at).toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    {state.selectedResult.answers.map((answer, index) => (
                      <Card key={answer.question_id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            {/* Question */}
                            <div>
                              <Label className="text-base font-medium">
                                Question {index + 1}
                              </Label>
                              <p className="mt-1 text-gray-700">{answer.question_text}</p>
                            </div>

                            {/* Answer */}
                            <div>
                              <Label className="text-sm font-medium text-gray-600">
                                Participant's Answer:
                              </Label>
                              <div className="mt-1 p-3 bg-gray-50 border rounded">
                                {answer.answer_text || <span className="text-gray-400 italic">No answer provided</span>}
                              </div>
                            </div>

                            {/* Scoring */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`score-${answer.question_id}`}>
                                  Score (Max: {answer.max_score})
                                </Label>
                                <Input
                                  id={`score-${answer.question_id}`}
                                  type="number"
                                  min="0"
                                  max={answer.max_score}
                                  defaultValue={answer.score || 0}
                                  onBlur={(e) => {
                                    const score = parseFloat(e.target.value) || 0
                                    const comment = (document.getElementById(`comment-${answer.question_id}`) as HTMLTextAreaElement)?.value || ''
                                    saveScore(answer.question_id, score, comment)
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`comment-${answer.question_id}`}>
                                  Scorer Comments
                                </Label>
                                <Textarea
                                  id={`comment-${answer.question_id}`}
                                  placeholder="Add comments about this answer..."
                                  defaultValue={answer.scorer_comment || ''}
                                  onBlur={(e) => {
                                    const comment = e.target.value
                                    const scoreInput = document.getElementById(`score-${answer.question_id}`) as HTMLInputElement
                                    const score = parseFloat(scoreInput?.value) || 0
                                    saveScore(answer.question_id, score, comment)
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Summary */}
                  <Card className="mt-6 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-blue-900">
                          Total Score: {getScorePercentage(state.selectedResult)}%
                        </h3>
                        <p className="text-blue-700">
                          ({state.selectedResult.answers.reduce((sum, answer) => sum + (answer.score || 0), 0)} / {state.selectedResult.max_score} points)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      </div>
    </MainContent>
  )
}