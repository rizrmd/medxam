import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Timer, Play } from 'lucide-react'
import { format } from 'date-fns'

interface DeliveryScheduleProps {
  delivery: any
  selectedDate: string
  selectedTime: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

export function DeliverySchedule({
  delivery,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange
}: DeliveryScheduleProps) {
  return (
    <div className="pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Exam Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => onTimeChange(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time Zone</Label>
              <Select defaultValue="UTC+7">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC+7">WIB (UTC+7)</SelectItem>
                  <SelectItem value="UTC+8">WITA (UTC+8)</SelectItem>
                  <SelectItem value="UTC+9">WIT (UTC+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Registration Deadline</Label>
              <Input
                type="datetime-local"
                defaultValue={
                  delivery?.registration_deadline 
                    ? format(new Date(delivery.registration_deadline), "yyyy-MM-dd'T'HH:mm")
                    : format(new Date(), "yyyy-MM-dd'T'23:59")
                }
              />
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Start Configuration</h4>
            <div className="p-4 rounded-lg bg-muted mb-4">
              <div className="flex items-start gap-3">
                {delivery?.automatic_start ? (
                  <>
                    <Timer className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">Automatic Start (Strict Schedule)</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The exam will start automatically when the scheduled time is reached. 
                        Participants will be able to access the exam immediately at the scheduled time.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-900">Manual Start Required</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        An admin or committee member must manually start the exam. 
                        Participants will not be able to access the exam until it is manually started.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <h4 className="font-medium mb-3">Schedule Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled Start:</span>
                <span className="font-medium">
                  {selectedDate && selectedTime 
                    ? format(new Date(`${selectedDate}T${selectedTime}`), 'PPP p')
                    : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated End:</span>
                <span className="font-medium">
                  {selectedDate && selectedTime && delivery?.duration
                    ? format(
                        new Date(new Date(`${selectedDate}T${selectedTime}`).getTime() + (delivery.duration * 60000)),
                        'PPP p'
                      )
                    : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{delivery?.duration || 120} minutes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}