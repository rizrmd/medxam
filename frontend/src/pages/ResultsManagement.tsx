import { useFastInput } from '@/hooks/useFastInput'
import { useCallback } from 'react'
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
import { ChartBar, Users, Eye, Search } from 'lucide-react'
import { useParticipantStore } from '@/store/participantStore'
import { useNavigate } from 'react-router-dom'
import { MainContent } from '@/components/layout/MainContent'

export function ResultsManagement() {
  const searchTermInput = useFastInput('')
  const { groups } = useParticipantStore()
  const navigate = useNavigate()

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Search is handled reactively by filteredGroups
  }, [])

  const handleClear = useCallback(() => {
    searchTermInput.setValue('')
  }, [searchTermInput])

  const filteredGroups = (groups || []).filter(group =>
    group.name.toLowerCase().includes(searchTermInput.getValue().toLowerCase()) ||
    group.description.toLowerCase().includes(searchTermInput.getValue().toLowerCase())
  )

  return (
    <MainContent>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search Name or Description"
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
                <TableHead>NAME</TableHead>
                <TableHead>PARTICIPANTS</TableHead>
                <TableHead>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.slice(0, 15).map((group, index) => (
                <TableRow key={group.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChartBar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {group.participantCount} participants
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate(`/back-office/result/${group.id}`)}
                    >
                      <Eye className="h-4 w-4" />
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
        {[1, 2, 3, 4, 5].map((page) => (
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
    </MainContent>
  )
}