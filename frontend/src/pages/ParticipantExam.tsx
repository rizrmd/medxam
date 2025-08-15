import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParticipantStore } from '@/store/participantStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, FileText, LogOut } from 'lucide-react'

export function ParticipantExam() {
  const [state, setState] = useLocalStateSync({
    isLoading: true,
    error: ''
  })
  
  const navigate = useNavigate()
  const { participant, currentDelivery, isAuthenticated, logout } = useParticipantStore()

  useEffect(() => {
    // Check if participant is authenticated
    if (!isAuthenticated || !participant) {
      navigate('/')
      return
    }
    
    setState.isLoading = false
  }, [isAuthenticated, participant, navigate])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your exam...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome to Your Exam</h1>
            <p className="text-gray-600 mt-2">
              Hello, {participant?.name || 'Participant'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Exam Information Card */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participant?.reg}</div>
              <p className="text-xs text-muted-foreground">Registration Number</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentDelivery?.name || 'Exam Session'}
              </div>
              <p className="text-xs text-muted-foreground">Current Exam</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Not Started</div>
              <p className="text-xs text-muted-foreground">Exam Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Exam Area */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Instructions</CardTitle>
            <CardDescription>
              Please read the following instructions carefully before starting your exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Before You Begin:</h3>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• Ensure you have a stable internet connection</li>
                <li>• Close all other browser tabs and applications</li>
                <li>• Do not navigate away from this page during the exam</li>
                <li>• Your exam will be auto-submitted when time expires</li>
              </ul>
            </div>

            {currentDelivery && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Exam Details:</h3>
                <div className="text-green-700 text-sm space-y-1">
                  <p><strong>Delivery:</strong> {currentDelivery.name}</p>
                  {currentDelivery.description && (
                    <p><strong>Description:</strong> {currentDelivery.description}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-6">
              <Button
                size="lg"
                className="px-12 py-4 text-lg"
                onClick={() => {
                  // TODO: Start the actual exam
                  alert('Exam functionality coming soon!')
                }}
              >
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}