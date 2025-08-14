import { useLocalStateSync } from '@/hooks/useLocalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CreateExamFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

export function CreateExamForm({ open, onOpenChange, onSubmit }: CreateExamFormProps) {
  const [state, setState] = useLocalStateSync({
    formData: {
      name: '',
      code: '',
      description: '',
      duration: '120',
      status: 'draft'
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(state.formData)
    setState.formData = { name: '', code: '', description: '', duration: '120', status: 'draft' }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Exam</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Exam Name *</Label>
              <Input
                id="name"
                value={state.formData.name}
                onChange={(e) => setState.formData = { ...state.formData, name: e.target.value }}
                placeholder="Enter exam name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Exam Code *</Label>
              <Input
                id="code"
                value={state.formData.code}
                onChange={(e) => setState.formData = { ...state.formData, code: e.target.value }}
                placeholder="Enter exam code"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={state.formData.duration}
                onChange={(e) => setState.formData = { ...state.formData, duration: e.target.value }}
                placeholder="120"
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={state.formData.status} onValueChange={(value) => setState.formData = { ...state.formData, status: value }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={state.formData.description}
                onChange={(e) => setState.formData = { ...state.formData, description: e.target.value }}
                placeholder="Enter exam description"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Exam</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}