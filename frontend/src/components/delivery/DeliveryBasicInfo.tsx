import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Package, Settings, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

interface DeliveryBasicInfoProps {
  delivery: any
  deliveryName: string
  onNameChange: (name: string) => void
  onExamChange?: (examId: string) => void
  onGroupChange?: (groupId: string) => void
}

export function DeliveryBasicInfo({ 
  delivery, 
  deliveryName, 
  onNameChange,
  onExamChange,
  onGroupChange 
}: DeliveryBasicInfoProps) {
  const [exams, setExams] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [description, setDescription] = useState(delivery?.description || '')

  useEffect(() => {
    fetchExamsAndGroups()
  }, [])

  const fetchExamsAndGroups = async () => {
    try {
      const [examsResponse, groupsResponse] = await Promise.all([
        apiClient.exams.list(),
        apiClient.groups.list()
      ])

      if ((examsResponse as any).data?.items) {
        setExams((examsResponse as any).data.items)
      }
      if ((groupsResponse as any).data?.items) {
        setGroups((groupsResponse as any).data.items)
      }
    } catch (err) {
      console.error('Failed to fetch exams and groups:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      case 'ongoing':
        return 'bg-orange-100 text-orange-800'
      case 'finished':
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryName">Delivery Name</Label>
            <Input
              id="deliveryName"
              value={deliveryName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter delivery name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="exam">Associated Exam</Label>
            <Select 
              value={delivery?.exam_id?.toString() || ''} 
              onValueChange={onExamChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id.toString()}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="group">Target Group</Label>
            <Select 
              value={delivery?.group_id?.toString() || ''} 
              onValueChange={onGroupChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter delivery description..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Delivery Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(delivery?.status)}`}>
                {delivery?.status || 'pending'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{delivery?.duration || 120} minutes</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Auto-start</Label>
            <Select defaultValue={delivery?.automatic_start ? 'scheduled' : 'disabled'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Manual start</SelectItem>
                <SelectItem value="scheduled">Auto-start at scheduled time</SelectItem>
                <SelectItem value="on-login">Start when first participant logs in</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Late Entry Policy</Label>
            <Select defaultValue="allowed">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allowed">Allow late entry</SelectItem>
                <SelectItem value="grace-15">15 min grace period</SelectItem>
                <SelectItem value="grace-30">30 min grace period</SelectItem>
                <SelectItem value="strict">No late entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}