import { useNavigate } from 'react-router-dom'
import { useParticipantStore } from '@/store/participantStore'
import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyRound } from 'lucide-react'

export function TestCodeLogin() {
  const [state, setState] = useLocalStateSync({
    testCode: '',
    isLoading: false,
    error: ''
  })
  
  const navigate = useNavigate()
  const { loginWithTestCode } = useParticipantStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState.isLoading = true
    setState.error = ''
    
    try {
      await loginWithTestCode(state.testCode)
      navigate('/participant/exam')
    } catch (error) {
      console.error('Login failed:', error)
      setState.error = error instanceof Error ? error.message : 'Invalid test code. Please check and try again.'
    } finally {
      setState.isLoading = false
    }
  }

  const handleTestCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just convert to uppercase, don't auto-format
    // This allows users to paste codes with their original formatting
    const value = e.target.value.toUpperCase()
    setState.testCode = value
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Enter Test Code</CardTitle>
          <CardDescription className="text-center">
            Enter the unique code provided by your examiner to access your exam
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
              <Label htmlFor="testCode" className="text-center block">Test Code</Label>
              <Input
                id="testCode"
                type="text"
                placeholder="XXX-XXX-XXX"
                value={state.testCode}
                onChange={handleTestCodeChange}
                required
                className="text-center font-mono text-2xl py-6 tracking-wider"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                The code is not case-sensitive
              </p>
            </div>
            
            <Button
              type="submit"
              className="w-full py-6 text-lg"
              disabled={state.isLoading || state.testCode.trim().length < 3}
            >
              {state.isLoading ? 'Verifying code...' : 'Access Exam'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}