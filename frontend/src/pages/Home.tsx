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
            Welcome - IoNbEc
          </h1>
          <p className="text-xl text-gray-600">
            National Orthopaedic and Traumatology Board Examination
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
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
              <CardTitle>Candidate Portal</CardTitle>
              <CardDescription>
                Take your examination or check your results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/candidate/login')}
                variant="secondary"
                className="w-full"
              >
                Candidate Login
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>About IoNbEc</CardTitle>
            </CardHeader>
            <CardContent className="text-left space-y-4">
              <p className="text-gray-600">
                The National Orthopaedic and Traumatology Board Examination (IoNbEc) is a comprehensive 
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