import { useLocalStateSync } from '@/hooks/useLocalState'
import { useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Save,
  Calculator
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { format } from 'date-fns'
import { MainContent } from '@/components/layout/MainContent'

interface Question {
  id: number
  question_number: string
  question_text: string
  question_type: 'multiple_choice' | 'essay' | 'short_answer'
  options?: string[]
  correct_answer?: string
  points: number
}

interface ParticipantAnswer {
  question_id: number
  answer: string
  is_correct?: boolean
  points_earned?: number
}

interface AttemptDetails {
  id: number
  participant: {
    id: number
    name: string
    identifier: string
    email: string
  }
  delivery: {
    id: number
    name: string
    scheduled_at: string
  }
  started_at: string
  ended_at?: string
  status: string
  total_score?: number
  questions: Question[]
  answers: ParticipantAnswer[]
}

export function QuestionScoring() {
  const { deliveryId, attemptId } = useParams<{ deliveryId: string; attemptId: string }>()
  const navigate = useNavigate()
  
  const [state, setState] = useLocalStateSync({
    attemptDetails: null as AttemptDetails | null,
    currentQuestionIndex: 0,
    loading: true,
    error: '',
    saving: false,
    scoreChanges: {} as Record<number, number>
  })

  const fetchAttemptDetails = useCallback(async () => {
    if (!attemptId) return
    
    try {
      setState.loading = true
      const detailsResponse = await apiClient.attempts.getDetails(attemptId)
      const answersResponse = await apiClient.attempts.getAnswers(attemptId)
      
      if (detailsResponse.error) {
        setState.error = detailsResponse.error
      } else if (answersResponse.error) {
        setState.error = answersResponse.error
      } else {
        // For now, create dummy questions from answers if questions aren't provided
        const answers = answersResponse.data || []
        const questions = detailsResponse.data?.questions || answers.map((answer: any, index: number) => ({
          id: answer.question_id,
          question_number: `Q${index + 1}`,
          question_text: `Question ${index + 1}`,
          question_type: 'multiple_choice' as const,
          points: answer.score || 10,
          correct_answer: answer.is_correct ? answer.answer : undefined
        }))
        
        // Ensure participant data exists
        const participant = detailsResponse.data?.participant || {
          id: detailsResponse.data?.attempted_by || 0,
          name: detailsResponse.data?.taker?.name || 'Unknown',
          identifier: detailsResponse.data?.taker?.code || detailsResponse.data?.taker?.reg || 'N/A',
          email: detailsResponse.data?.taker?.email || ''
        }
        
        // Ensure delivery data exists
        const delivery = detailsResponse.data?.delivery || {
          id: detailsResponse.data?.delivery_id || 0,
          name: detailsResponse.data?.delivery_name || 'Unknown Delivery'
        }
        
        setState.attemptDetails = {
          ...detailsResponse.data,
          participant,
          delivery,
          questions: questions,
          answers: answers,
          started_at: detailsResponse.data?.started_at || new Date().toISOString(),
          ended_at: detailsResponse.data?.ended_at,
          total_score: detailsResponse.data?.score || detailsResponse.data?.total_score
        }
        setState.error = ''
      }
    } catch (error) {
      setState.error = 'Failed to load attempt details'
      console.error('Error loading attempt details:', error)
    } finally {
      setState.loading = false
    }
  }, [attemptId, setState])

  const handleScoreChange = useCallback((questionId: number, score: number) => {
    setState.scoreChanges = {
      ...state.scoreChanges,
      [questionId]: score
    }
  }, [state.scoreChanges, setState])

  const handleSaveScores = useCallback(async () => {
    if (!state.attemptDetails || !attemptId) return
    
    try {
      setState.saving = true
      
      // Calculate total score with changes
      let totalScore = 0
      state.attemptDetails.questions.forEach(question => {
        const answer = state.attemptDetails!.answers.find(a => a.question_id === question.id)
        const changedScore = state.scoreChanges[question.id]
        
        if (changedScore !== undefined) {
          totalScore += changedScore
        } else if (answer?.points_earned !== undefined) {
          totalScore += answer.points_earned
        } else if (answer?.is_correct) {
          totalScore += question.points
        }
      })
      
      const response = await apiClient.attempts.updateScore(attemptId, totalScore)
      
      if (response.error) {
        setState.error = response.error
      } else {
        // Update local state to reflect saved changes
        if (state.attemptDetails) {
          state.attemptDetails.total_score = totalScore
          Object.entries(state.scoreChanges).forEach(([questionId, score]) => {
            const answer = state.attemptDetails!.answers.find(a => a.question_id === parseInt(questionId))
            if (answer) {
              answer.points_earned = score
            }
          })
          setState.scoreChanges = {}
        }
        setState.error = ''
      }
    } catch (error) {
      setState.error = 'Failed to save scores'
      console.error('Error saving scores:', error)
    } finally {
      setState.saving = false
    }
  }, [state.attemptDetails, state.scoreChanges, attemptId, setState])

  const handlePreviousQuestion = useCallback(() => {
    if (state.currentQuestionIndex > 0) {
      setState.currentQuestionIndex = state.currentQuestionIndex - 1
    }
  }, [state.currentQuestionIndex, setState])

  const handleNextQuestion = useCallback(() => {
    if (state.attemptDetails && state.currentQuestionIndex < state.attemptDetails.questions.length - 1) {
      setState.currentQuestionIndex = state.currentQuestionIndex + 1
    }
  }, [state.currentQuestionIndex, state.attemptDetails, setState])

  const goToQuestion = useCallback((index: number) => {
    setState.currentQuestionIndex = index
  }, [setState])

  useEffect(() => {
    fetchAttemptDetails()
  }, [fetchAttemptDetails])

  // Set dashboard header
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline"
        onClick={handleSaveScores}
        disabled={state.saving || Object.keys(state.scoreChanges).length === 0}
        className="flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        {state.saving ? 'Saving...' : 'Save Scores'}
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate(`/back-office/scoring/${deliveryId}`)}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Participants
      </Button>
    </div>
  )

  if (state.loading) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading scoring details...</p>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  if (state.error) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{state.error}</p>
              <Button onClick={fetchAttemptDetails}>Try Again</Button>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  if (!state.attemptDetails) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">Attempt details not found</p>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  if (!state.attemptDetails.questions || state.attemptDetails.questions.length === 0) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">No questions found for this attempt</p>
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/back-office/scoring/${deliveryId}`)}
                className="mt-4 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Participants
              </Button>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  const currentQuestion = state.attemptDetails.questions[state.currentQuestionIndex]
  const currentAnswer = state.attemptDetails.answers.find(a => a.question_id === currentQuestion?.id)
  const hasChanges = Object.keys(state.scoreChanges).length > 0

  return (
    <MainContent>
      <div className="space-y-6">
      {/* Participant Info */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{state.attemptDetails.delivery.name}</CardTitle>
              <p className="text-muted-foreground mt-1">
                Test Code: {state.attemptDetails.participant.identifier || 'NO CODE'}
              </p>
              <p className="text-sm text-muted-foreground">
                Started: {format(new Date(state.attemptDetails.started_at), 'MMM dd, yyyy HH:mm')}
                {state.attemptDetails.ended_at && (
                  <> • Ended: {format(new Date(state.attemptDetails.ended_at), 'MMM dd, yyyy HH:mm')}</>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Score</div>
              <div className="text-2xl font-bold">
                {state.attemptDetails.total_score ?? 'Not scored'}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousQuestion}
                disabled={state.currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Question {state.currentQuestionIndex + 1} of {state.attemptDetails.questions.length}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextQuestion}
                disabled={state.currentQuestionIndex === state.attemptDetails.questions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {hasChanges && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </Badge>
            )}
          </div>
          
          {/* Question Grid for Quick Navigation */}
          <div className="grid grid-cols-10 gap-2">
            {state.attemptDetails.questions.map((question, index) => {
              const answer = state.attemptDetails!.answers.find(a => a.question_id === question.id)
              const hasAnswer = answer?.answer && answer.answer.trim() !== ''
              const isCorrect = answer?.is_correct
              const isCurrentQuestion = index === state.currentQuestionIndex
              const hasScoreChange = state.scoreChanges[question.id] !== undefined
              
              return (
                <Button
                  key={question.id}
                  variant={isCurrentQuestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToQuestion(index)}
                  className={`relative ${
                    hasAnswer 
                      ? isCorrect 
                        ? 'ring-2 ring-green-200' 
                        : 'ring-2 ring-red-200'
                      : 'ring-2 ring-gray-200'
                  } ${hasScoreChange ? 'ring-orange-300' : ''}`}
                  title={`Question ${index + 1}${hasAnswer ? (isCorrect ? ' (Correct)' : ' (Incorrect)') : ' (No answer)'}`}
                >
                  {index + 1}
                  {hasAnswer && (
                    isCorrect 
                      ? <div className="absolute -top-2 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-[12px] h-[12px] text-white stroke-[2]" />
                        </div>
                      : <div className="absolute -top-2 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="w-[12px] h-[12px] text-white stroke-[2]" />
                        </div>
                  )}
                  {hasScoreChange && <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Question {currentQuestion.question_number}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {currentQuestion.question_type.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary">
                  {currentQuestion.points} pts
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text */}
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }} />
            </div>
            
            {/* Multiple Choice Options */}
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-2">
                <h4 className="font-medium">Options:</h4>
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index) // A, B, C, D, E
                  const isCorrect = currentQuestion.correct_answer === letter
                  const isParticipantAnswer = currentAnswer?.answer === letter
                  const isIncorrectAnswer = isParticipantAnswer && !isCorrect
                  
                  return (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${
                        isCorrect 
                          ? 'border-green-500 bg-green-50' 
                          : isIncorrectAnswer
                            ? 'border-red-500 bg-red-50'
                            : isParticipantAnswer 
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{letter}.</span>
                        <span>{option}</span>
                        {isCorrect && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                        {isIncorrectAnswer && (
                          <>
                            <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                            <Badge variant="destructive" className="ml-2">Incorrect</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Participant's Answer for Essay/Short Answer */}
            {(currentQuestion.question_type === 'essay' || currentQuestion.question_type === 'short_answer') && (
              <div className="space-y-2">
                <h4 className="font-medium">Participant's Answer:</h4>
                <div className="p-4 border rounded-lg bg-gray-50">
                  {currentAnswer?.answer ? (
                    <div className="whitespace-pre-wrap">{currentAnswer.answer}</div>
                  ) : (
                    <span className="text-muted-foreground italic">No answer provided</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Scoring Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Score:</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={currentQuestion.points}
                    step="0.01"
                    value={
                      state.scoreChanges[currentQuestion.id] !== undefined
                        ? state.scoreChanges[currentQuestion.id]
                        : currentAnswer?.points_earned !== undefined
                          ? currentAnswer.points_earned
                          : currentAnswer?.is_correct
                            ? currentQuestion.points
                            : 0
                    }
                    onChange={(e) => handleScoreChange(currentQuestion.id, parseFloat(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">/ {currentQuestion.points}</span>
                </div>
                
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="ml-auto">
                    {currentAnswer?.is_correct ? (
                      <Badge className="bg-green-100 text-green-800">Correct</Badge>
                    ) : currentAnswer?.answer ? (
                      <Badge variant="destructive">Incorrect</Badge>
                    ) : (
                      <Badge variant="secondary">No Answer</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </MainContent>
  )
}