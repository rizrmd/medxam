import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Login() {
  const [state, setState] = useLocalStateSync({
    username: '',
    password: '',
    remember: false,
    isLoading: false,
    error: ''
  })
  
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState.isLoading = true
    setState.error = ''
    
    try {
      await login(state.username, state.password)
      navigate('/back-office/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
      setState.error = error instanceof Error ? error.message : 'Login failed'
    } finally {
      setState.isLoading = false
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in - MedXam</CardTitle>
          <CardDescription className="text-center">
            National Orthopaedic and Traumatology Board Examination
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
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={state.remember}
                onCheckedChange={(checked) => setState.remember = checked as boolean}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={state.isLoading}
            >
              {state.isLoading ? 'Signing in...' : 'Log in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}