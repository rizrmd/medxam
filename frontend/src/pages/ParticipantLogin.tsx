import { useNavigate } from 'react-router-dom'
import { useParticipantStore } from '@/store/participantStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound } from 'lucide-react'

export function ParticipantLogin() {
  const [state, setState] = useLocalStateSync({
    registrationNumber: '',
    password: '',
    isLoading: false,
    error: ''
  })
  
  const navigate = useNavigate()
  const { login } = useParticipantStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState.isLoading = true
    setState.error = ''
    
    try {
      await login(state.registrationNumber, state.password)
      navigate('/participant/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
      setState.error = error instanceof Error ? error.message : 'Login failed. Please check your credentials.'
    } finally {
      setState.isLoading = false
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Participant Login</CardTitle>
          <CardDescription className="text-center">
            Access your profile and exam history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.error && (
            <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded">
              {state.error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                type="text"
                placeholder="Enter your registration number"
                value={state.registrationNumber}
                onChange={(e) => setState.registrationNumber = e.target.value}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={state.password}
                onChange={(e) => setState.password = e.target.value}
                required
                autoComplete="current-password"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Signing in...' : 'Log in'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Use your registration number and password provided by the examination board.</p>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Have a test code for an exam?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/exam/code')}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Enter Test Code
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}