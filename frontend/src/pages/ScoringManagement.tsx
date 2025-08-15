import { useLocalStateSync } from '@/hooks/useLocalState'
import { useCallback } from 'react'
import { useFastInput } from '@/hooks/useFastInput'
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
import { Calculator, Calendar, Clock, Edit, Search } from 'lucide-react'
import { useExamStore } from '@/store/examStore'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export function ScoringManagement() {
  const searchNameInput = useFastInput('')
  const [state, setState] = useLocalStateSync({
    selectedDate: ''
  })
  const { deliveries } = useExamStore()
  const navigate = useNavigate()

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredDeliveries
  }, [])

  const handleClear = useCallback(() => {
    searchNameInput.setValue('')
    setState.selectedDate = ''
  }, [searchNameInput, setState])

  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.name.toLowerCase().includes(searchNameInput.getValue().toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search a Name"
                {...searchNameInput.inputProps}
                className="w-full"
              />
            </div>
            <Input
              type="date"
              value={state.selectedDate}
              onChange={(e) => setState.selectedDate = e.target.value}
              className="w-48"
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
                <TableHead>DELIVERY NAME</TableHead>
                <TableHead>SCHEDULE</TableHead>
                <TableHead>DURATION</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{delivery.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(delivery.schedule, 'MMM dd, yyyy HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {delivery.duration} minutes
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery.status)}`}>
                      {delivery.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate(`/back-office/scoring/${delivery.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((page) => (
          <Button
            key={page}
            variant={page === 1 ? "default" : "outline"}
            size="sm"
          >
            {page}
          </Button>
        ))}
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </div>
  )
}