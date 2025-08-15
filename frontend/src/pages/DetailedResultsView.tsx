import { useFastInput } from '@/hooks/useFastInput'
import { useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
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
import { ArrowLeft, Search } from 'lucide-react'
import { useParticipantStore } from '@/store/participantStore'

export function DetailedResultsView() {
  const { id } = useParams<{ id: string }>()
  const searchTermInput = useFastInput('')
  const { groups } = useParticipantStore()

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled locally in this component
  }, [])

  const handleClear = useCallback(() => {
    searchTermInput.setValue('')
  }, [searchTermInput])

  const group = groups.find(g => g.id === id)

  // Mock results data matching the screenshot
  const resultsData = [
    {
      no: 1,
      code: 'REG00001',
      summary: 'Passed',
      testScore: '85/100',
      testName: 'Test Agustus (BE 210525 - MCQ)02 Aug 2025',
      summaryStatus: 'PASS'
    }
  ]

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/back-office/result">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Group Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/back-office/result">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="text-muted-foreground">{group.name}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>CODE</TableHead>
                  <TableHead>SUMMARY</TableHead>
                  <TableHead className="min-w-[300px]">Test Agustus (BE 210525 - MCQ)02 Aug 2025</TableHead>
                  <TableHead>SUMMARY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsData.map((result) => (
                  <TableRow key={result.no}>
                    <TableCell className="font-medium">{result.no}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{result.code}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.summary === 'Passed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.summary}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {result.testScore}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Score: 85%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.summaryStatus === 'PASS' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.summaryStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <div className="text-sm text-muted-foreground">Total Participants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">1</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">85%</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        <Button variant="default" size="sm">1</Button>
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </div>
  )
}