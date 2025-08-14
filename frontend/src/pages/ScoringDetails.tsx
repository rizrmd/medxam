import { useFastInput } from '@/hooks/useFastInput'
import { useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  ArrowLeft, 
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useExamStore } from '@/store/examStore'

export function ScoringDetails() {
  const { id } = useParams<{ id: string }>()
  const searchTermInput = useFastInput('')
  const { deliveries } = useExamStore()

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled locally in this component
  }, [])

  const handleClear = useCallback(() => {
    searchTermInput.setValue('')
  }, [searchTermInput])

  const delivery = deliveries.find(d => d.id === id)

  // Mock scoring data
  const scoringData = [
    {
      id: 'score_1',
      candidateCode: 'REG00001',
      progress: 100,
      attemptedAt: '2025-08-02 14:30:00',
      scoringStatus: 'completed',
      score: 85,
      totalScore: 100,
      email: 'candidate1@example.com'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in-progress':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      'in-progress': 'bg-orange-100 text-orange-800',
      pending: 'bg-blue-100 text-blue-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!delivery) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/back-office/scoring">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Delivery Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/scoring">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Scoring Detail - IoNbEc</h1>
            <p className="text-muted-foreground">{delivery.name}</p>
          </div>
        </div>
      </div>

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
                <TableHead>download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoringData.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm">{item.candidateCode}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-sm">{item.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(item.attemptedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.scoringStatus)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.scoringStatus)}`}>
                        {item.scoringStatus}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="text-lg font-bold">{item.score}</div>
                      <div className="text-xs text-muted-foreground">/ {item.totalScore}</div>
                      <div className="text-xs font-medium">
                        {Math.round((item.score / item.totalScore) * 100)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">1</div>
              <div className="text-sm text-muted-foreground">Total Attempts</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">1</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">85%</div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        <Button variant="default" size="sm">1</Button>
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </div>
  )
}