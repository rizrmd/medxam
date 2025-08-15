import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck } from 'lucide-react'
import { useEffect } from 'react'

export function CommitteeLogin() {
  const [state, setState] = useLocalStateSync({
    username: '',
    password: '',
    isLoading: false,
    error: ''
  })
  
  const navigate = useNavigate()
  const { isAuthenticated, user, login } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const hasCommitteeRole = user.roles?.some(role => 
        role.name === 'Scorer / Committee' || role.name === 'scorer' || role.name === 'committee'
      )
      if (hasCommitteeRole) {
        navigate('/committee/deliveries')
      } else {
        navigate('/back-office/dashboard')
      }
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState.isLoading = true
    setState.error = ''
    
    try {
      await login(state.username, state.password)
      
      // Check user roles after successful login
      const userData = useAuthStore.getState().user
      const hasCommitteeRole = userData?.roles?.some(role => 
        role.name === 'Scorer / Committee' || role.name === 'scorer' || role.name === 'committee'
      )
      
      if (hasCommitteeRole) {
        navigate('/committee/deliveries')
      } else {
        setState.error = 'Access denied. Committee or Scorer role required.'
      }
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
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Committee & Scorer Login</CardTitle>
          <CardDescription className="text-center">
            Login to access exam delivery management and scoring tools
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={state.username}
                onChange={(e) => setState.username = e.target.value}
                required
                autoComplete="username"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
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
              disabled={state.isLoading || !state.username.trim() || !state.password.trim()}
            >
              {state.isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Need access? Contact your system administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}