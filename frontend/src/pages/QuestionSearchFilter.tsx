import { useLocalStateSync } from '@/hooks/useLocalState'
import { useFastInput } from '@/hooks/useFastInput'
import { useCallback, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, FileQuestion } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function QuestionSearchFilter() {
  const searchInput = useFastInput('')
  const navigate = useNavigate()
  const [state, setState] = useLocalStateSync({
    // Form inputs (current values being typed/selected)
    selectedDiseaseGroup: 'all',
    selectedRegionGroup: 'all',
    selectedSpecificPart: 'all',
    selectedTypicalGroup: 'all',
    selectedQuestionType: 'all',
    // Applied filters (only updated on form submit)
    appliedSearchQuestion: '',
    appliedDiseaseGroup: 'all',
    appliedRegionGroup: 'all',
    appliedSpecificPart: 'all',
    appliedTypicalGroup: 'all',
    appliedQuestionType: 'all',
    currentPage: 1,
    itemsPerPage: 15
  })

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    // Apply current form values to the filters used for searching
    setState.appliedSearchQuestion = searchInput.getValue()
    setState.appliedDiseaseGroup = state.selectedDiseaseGroup
    setState.appliedRegionGroup = state.selectedRegionGroup
    setState.appliedSpecificPart = state.selectedSpecificPart
    setState.appliedTypicalGroup = state.selectedTypicalGroup
    setState.appliedQuestionType = state.selectedQuestionType
    setState.currentPage = 1 // Reset to first page when searching
  }, [setState, searchInput, state.selectedDiseaseGroup, state.selectedRegionGroup, 
      state.selectedSpecificPart, state.selectedTypicalGroup, state.selectedQuestionType])

  const handleClear = useCallback(() => {
    // Clear both form inputs and applied filters
    searchInput.setValue('')
    setState.selectedDiseaseGroup = 'all'
    setState.selectedRegionGroup = 'all'
    setState.selectedSpecificPart = 'all'
    setState.selectedTypicalGroup = 'all'
    setState.selectedQuestionType = 'all'
    setState.appliedSearchQuestion = ''
    setState.appliedDiseaseGroup = 'all'
    setState.appliedRegionGroup = 'all'
    setState.appliedSpecificPart = 'all'
    setState.appliedTypicalGroup = 'all'
    setState.appliedQuestionType = 'all'
    setState.currentPage = 1
  }, [setState, searchInput])

  const handleQuestionClick = useCallback((questionId: string) => {
    navigate(`/back-office/question/${questionId}`)
  }, [navigate])

  // Mock question data
  const mockQuestions = Array.from({ length: 2030 }, (_, i) => ({
    id: `q_${i + 1}`,
    text: `Question ${i + 1}: Which of the following best describes the pathophysiology of ${['shoulder impingement', 'hip dysplasia', 'spinal stenosis', 'knee osteoarthritis'][i % 4]}?`,
    type: ['Multiple Choice', 'Essay'][i % 2],
    diseaseGroup: ['Degenerative', 'Traumatic', 'Congenital', 'Inflammatory'][i % 4],
    regionGroup: ['Upper Extremity', 'Lower Extremity', 'Spine', 'Pelvis'][i % 4],
    specificPart: ['Pathogenesis', 'Diagnosis/Investigation', 'Treatment/Management', 'Prognosis'][i % 4],
    typicalGroup: ['Analysis', 'Recall Type'][i % 2]
  }))

  const diseaseGroups = [
    'Degenerative Disorders',
    'Traumatic Injuries', 
    'Congenital Abnormalities',
    'Inflammatory Conditions',
    'Neoplastic Disorders',
    'Infectious Diseases',
    'Metabolic Bone Disease',
    'Neuromuscular Disorders',
    'Sports Medicine',
    'Pediatric Orthopedics',
    'Geriatric Orthopedics',
    'Reconstructive Surgery',
    'Arthroscopic Surgery'
  ]

  const regionGroups = [
    'Shoulder and Upper Arm',
    'Elbow and Forearm',
    'Wrist and Hand',
    'Cervical Spine',
    'Thoracic Spine',
    'Lumbar Spine',
    'Hip and Pelvis',
    'Knee',
    'Ankle and Foot',
    'General Orthopedics',
    'Trauma Surgery',
    'Joint Replacement',
    'Sports Medicine',
    'Pediatric Conditions',
    'Spine Surgery',
    'Hand Surgery',
    'Foot and Ankle',
    'Orthopedic Oncology',
    'Musculoskeletal Infections',
    'Bone and Mineral Disorders',
    'Rehabilitation',
    'Research and Statistics'
  ]

  // Filter questions based on APPLIED search criteria (only updated on form submit)
  const filteredQuestions = useMemo(() => {
    return mockQuestions.filter(question => {
      // Text search
      const matchesSearch = state.appliedSearchQuestion === '' || 
        question.text.toLowerCase().includes(state.appliedSearchQuestion.toLowerCase())

      // Disease group filter
      const matchesDiseaseGroup = state.appliedDiseaseGroup === 'all' || 
        question.diseaseGroup.toLowerCase().includes(state.appliedDiseaseGroup.toLowerCase())

      // Region group filter  
      const matchesRegionGroup = state.appliedRegionGroup === 'all' || 
        question.regionGroup.toLowerCase().includes(state.appliedRegionGroup.toLowerCase())

      // Specific part filter
      const matchesSpecificPart = state.appliedSpecificPart === 'all' || 
        question.specificPart.toLowerCase().includes(state.appliedSpecificPart.toLowerCase())

      // Typical group filter
      const matchesTypicalGroup = state.appliedTypicalGroup === 'all' || 
        question.typicalGroup.toLowerCase().includes(state.appliedTypicalGroup.toLowerCase())

      // Question type filter
      const matchesQuestionType = state.appliedQuestionType === 'all' || 
        question.type.toLowerCase().replace(' ', '-') === state.appliedQuestionType

      return matchesSearch && matchesDiseaseGroup && matchesRegionGroup && 
             matchesSpecificPart && matchesTypicalGroup && matchesQuestionType
    })
  }, [mockQuestions, state.appliedSearchQuestion, state.appliedDiseaseGroup, state.appliedRegionGroup, 
      state.appliedSpecificPart, state.appliedTypicalGroup, state.appliedQuestionType])

  // Paginate filtered questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage
    const endIndex = startIndex + state.itemsPerPage
    return filteredQuestions.slice(startIndex, endIndex)
  }, [filteredQuestions, state.currentPage, state.itemsPerPage])

  const totalPages = Math.ceil(filteredQuestions.length / state.itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Question Pack - IoNbEc</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Input
                placeholder="Search question"
                {...searchInput.inputProps}
                className="md:col-span-2"
              />
              
              <Select value={state.selectedDiseaseGroup} onValueChange={(value) => setState.selectedDiseaseGroup = value}>
                <SelectTrigger>
                  <SelectValue placeholder="Disease Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Disease Groups</SelectItem>
                  {diseaseGroups.map((group, index) => (
                    <SelectItem key={index} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={state.selectedRegionGroup} onValueChange={(value) => setState.selectedRegionGroup = value}>
                <SelectTrigger>
                  <SelectValue placeholder="Region Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Region Groups</SelectItem>
                  {regionGroups.map((group, index) => (
                    <SelectItem key={index} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={state.selectedSpecificPart} onValueChange={(value) => setState.selectedSpecificPart = value}>
                <SelectTrigger>
                  <SelectValue placeholder="Specific Part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Specific Part</SelectItem>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                  <SelectItem value="pathogenesis">Pathogenesis</SelectItem>
                  <SelectItem value="diagnosis">Diagnosis/Investigation</SelectItem>
                  <SelectItem value="treatment">Treatment/Management</SelectItem>
                  <SelectItem value="prognosis">Prognosis and Complication</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={state.selectedTypicalGroup} onValueChange={(value) => setState.selectedTypicalGroup = value}>
                <SelectTrigger>
                  <SelectValue placeholder="Typical Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Typical Group</SelectItem>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="recall">Recall Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <Select value={state.selectedQuestionType} onValueChange={(value) => setState.selectedQuestionType = value}>
                <SelectTrigger>
                  <SelectValue placeholder="Question Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Show all</SelectItem>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                </SelectContent>
              </Select>
              
              <Button type="submit" className="md:col-start-3">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button type="button" onClick={handleClear} variant="outline">
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO</TableHead>
                <TableHead>QUESTION</TableHead>
                <TableHead>TYPE</TableHead>
                <TableHead>DISEASE GROUP</TableHead>
                <TableHead>REGION</TableHead>
                <TableHead>SPECIFIC PART</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestions.length > 0 ? (
                paginatedQuestions.map((question, index) => (
                <TableRow 
                  key={question.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleQuestionClick(question.id)}
                >
                  <TableCell>{(state.currentPage - 1) * state.itemsPerPage + index + 1}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="flex items-start gap-2">
                      <FileQuestion className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <p className="text-sm line-clamp-2">{question.text}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {question.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{question.diseaseGroup}</TableCell>
                  <TableCell className="text-sm">{question.regionGroup}</TableCell>
                  <TableCell className="text-sm">{question.specificPart}</TableCell>
                </TableRow>
              ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No questions found matching your search criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredQuestions.length > 0 ? (state.currentPage - 1) * state.itemsPerPage + 1 : 0} to{' '}
          {Math.min(state.currentPage * state.itemsPerPage, filteredQuestions.length)} of{' '}
          {filteredQuestions.length} questions
        </p>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={state.currentPage === 1}
            onClick={() => setState.currentPage = state.currentPage - 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
            const startPage = Math.max(1, state.currentPage - 5)
            const page = startPage + i
            if (page > totalPages) return null
            
            return (
              <Button
                key={page}
                variant={page === state.currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setState.currentPage = page}
              >
                {page}
              </Button>
            )
          }).filter(Boolean)}
          
          {totalPages > 10 && state.currentPage < totalPages - 5 && (
            <>
              <span className="px-2">...</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState.currentPage = totalPages}
              >
                {totalPages}
              </Button>
            </>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            disabled={state.currentPage === totalPages}
            onClick={() => setState.currentPage = state.currentPage + 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}