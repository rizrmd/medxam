import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome - MedXam
          </h1>
          <p className="text-xl text-gray-600">
            National Orthopaedic and Traumatology Board Examination
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Primary action - Test Code */}
          <Card className="mb-8 border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-2xl text-center">Take an Exam</CardTitle>
              <CardDescription className="text-center text-base">
                Have a test code? Enter it to start your exam immediately
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                onClick={() => navigate('/exam/code')}
                size="lg"
                className="w-full py-6 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Enter Test Code
              </Button>
            </CardContent>
          </Card>

          {/* Secondary actions */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Administrator Portal</CardTitle>
                <CardDescription>
                  Access the administrative dashboard to manage exams, questions, and participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Administrator Login
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Committee & Scorer</CardTitle>
                <CardDescription>
                  Access exam delivery management and scoring tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/committee/login')}
                  variant="secondary"
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  Committee Login
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Participant Portal</CardTitle>
                <CardDescription>
                  View your profile, exam history, and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/participant/login')}
                  variant="secondary"
                  className="w-full"
                >
                  Participant Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>About MedXam</CardTitle>
            </CardHeader>
            <CardContent className="text-left space-y-4">
              <p className="text-gray-600">
                The National Orthopaedic and Traumatology Board Examination (MedXam) is a comprehensive 
                assessment system designed to evaluate the knowledge and competency of medical professionals 
                in the field of orthopaedics and traumatology.
              </p>
              <p className="text-gray-600">
                Our platform provides a secure and efficient examination environment with advanced features 
                including automated scoring, comprehensive reporting, and detailed analytics.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => window.location.href = '#'}
                  variant="outline"
                  className="w-full"
                >
                  Submit Inquiry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}