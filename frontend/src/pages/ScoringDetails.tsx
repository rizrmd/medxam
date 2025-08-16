import { useFastInput } from '@/hooks/useFastInput'
import { useCallback, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft, 
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Edit
} from 'lucide-react'
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { format } from 'date-fns'
import { MainContent } from '@/components/layout/MainContent'

interface AttemptForScoring {
  id: number
  participant: {
    id: number
    name: string
    email: string
    identifier: string
  }
  attempt: {
    id: number
    started_at: string
    ended_at?: string
    questions_answered: number
    total_questions: number
    status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
    score?: number
  }
}

interface DeliveryInfo {
  id: number
  name: string
  scheduled_at: string
  duration: number
  status: string
}

export function ScoringDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const searchTermInput = useFastInput('')
  
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null)
  const [attempts, setAttempts] = useState<AttemptForScoring[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchDeliveryInfo = useCallback(async () => {
    if (!id) return
    
    try {
      const response = await apiClient.deliveries.get(id)
      if (response.error) {
        setError(response.error)
      } else {
        setDelivery(response.data)
      }
    } catch (error) {
      setError('Failed to load delivery information')
      console.error('Error loading delivery:', error)
    }
  }, [id])

  const fetchAttempts = useCallback(async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await apiClient.scoring.getDeliveryAttempts(id, currentPage)
      
      if (response.error) {
        setError(response.error)
        setAttempts([])
      } else {
        // Transform backend response to expected format
        const transformedAttempts = (response.data?.data || []).map((item: any) => ({
          id: item.id,
          participant: {
            id: item.attempted_by,
            name: item.taker?.name || 'Unknown',
            identifier: item.taker?.code || '',
            email: item.taker?.email || ''
          },
          attempt: {
            id: item.id,
            started_at: item.started_at,
            ended_at: item.ended_at,
            questions_answered: item.progress || 0,
            total_questions: item.total_questions || 0,
            status: item.ended_at ? 'completed' : (item.started_at ? 'in_progress' : 'not_started'),
            score: item.score
          }
        }))
        setAttempts(transformedAttempts)
        setTotalPages(response.data?.pagination?.total_pages || 1)
        setError('')
      }
    } catch (error) {
      setError('Failed to load participant attempts')
      setAttempts([])
      console.error('Error loading attempts:', error)
    } finally {
      setLoading(false)
    }
  }, [id, currentPage])

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    fetchAttempts()
  }, [fetchAttempts])

  const handleClear = useCallback(() => {
    searchTermInput.setValue('')
    fetchAttempts()
  }, [searchTermInput, fetchAttempts])

  const filteredAttempts = attempts.filter(attempt => {
    if (!attempt?.participant) return false
    const searchTerm = searchTermInput.getValue().toLowerCase()
    return (
      (attempt.participant.identifier?.toLowerCase() || '').includes(searchTerm) ||
      (attempt.participant.email?.toLowerCase() || '').includes(searchTerm) ||
      (attempt.participant.name?.toLowerCase() || '').includes(searchTerm)
    )
  })


  const getProgressPercentage = (answered: number, total: number) => {
    if (total === 0) return 0
    return Math.round((answered / total) * 100)
  }

  useEffect(() => {
    if (id) {
      fetchDeliveryInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (id) {
      fetchAttempts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentPage])

  // Header actions
  const headerActions = (
    <Link to="/back-office/scoring">
      <Button variant="ghost" size="sm" className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Scoring
      </Button>
    </Link>
  )

  if (loading && !delivery) {
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

  if (error && !delivery) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => { fetchDeliveryInfo(); fetchAttempts(); }}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  if (!delivery) {
    return (
      <MainContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">Delivery not found</p>
              <Link to="/back-office/scoring">
                <Button className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Scoring
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </MainContent>
    )
  }

  // Calculate stats
  const totalAttempts = filteredAttempts.length
  const scoringCount = filteredAttempts.filter(a => a.attempt?.status === 'completed').length
  const totalQuestions = 100 // This should come from exam data

  return (
    <MainContent>
      <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/back-office/scoring')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Scoring Detail</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span className="font-medium">Test Agustus</span>
              <span>•</span>
              <span>BE 210525 - MCQ - BE 210525 - MCQ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{scoringCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Scoring</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalAttempts}</div>
              <div className="text-sm text-muted-foreground mt-1">Takers</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground mt-1">Question</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search Code or Email"
              {...searchTermInput.inputProps}
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

      {/* Attempts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO</TableHead>
                <TableHead>CODE</TableHead>
                <TableHead>PROGRESS</TableHead>
                <TableHead>ATTEMPTED AT</TableHead>
                <TableHead>STATUS SCORING</TableHead>
                <TableHead>SCORE</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading participants...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAttempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No participant attempts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttempts.map((attempt, index) => (
                  <TableRow key={attempt.id}>
                    <TableCell>{(currentPage - 1) * 15 + index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {attempt.participant?.identifier || attempt.participant?.name || 'UNKNOWN'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          {getProgressPercentage(attempt.attempt?.questions_answered || 0, attempt.attempt?.total_questions || 0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({attempt.attempt?.questions_answered || 0}/{attempt.attempt?.total_questions || 0})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {attempt.attempt?.started_at ? (
                        <div className="text-sm">
                          {format(new Date(attempt.attempt.started_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not started</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={attempt.attempt?.score !== undefined && attempt.attempt?.score !== null ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {attempt.attempt?.score !== undefined && attempt.attempt?.score !== null ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Scored
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" />
                            Not finished yet
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {attempt.attempt?.score !== undefined ? attempt.attempt.score : 'Not scored'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!attempt.attempt?.id && !attempt.id}
                          title={(!attempt.attempt?.id && !attempt.id) ? "No results to download" : "Download results"}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const attemptId = attempt.attempt?.id || attempt.id
                            if (attemptId) {
                              navigate(`/back-office/scoring/${id}/attempt/${attemptId}`)
                            }
                          }}
                          disabled={!attempt.attempt?.id && !attempt.id}
                          title={(!attempt.attempt?.id && !attempt.id) ? "No attempt to score" : "Edit scoring"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
      </div>
    </MainContent>
  )
}