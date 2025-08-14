import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export type DateFilterMode = 'exact' | 'month' | 'year' | 'range' | 'none'

export interface DateFilterValue {
  mode: DateFilterMode
  exactDate?: string
  month?: string
  year?: string
  startDate?: string
  endDate?: string
}

interface DateFilterProps {
  value: DateFilterValue
  onChange: (value: DateFilterValue) => void
  onClear?: () => void
  label?: string
  placeholder?: string
}

export function DateFilter({ 
  value, 
  onChange, 
  onClear,
  label = "Date Filter",
  placeholder = "Select date filter"
}: DateFilterProps) {
  const [localValue, setLocalValue] = useState<DateFilterValue>(value)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleModeChange = (mode: DateFilterMode) => {
    const newValue: DateFilterValue = { mode }
    
    // Reset other fields when mode changes
    if (mode === 'exact') {
      newValue.exactDate = localValue.exactDate || format(new Date(), 'yyyy-MM-dd')
    } else if (mode === 'month') {
      newValue.month = localValue.month || format(new Date(), 'yyyy-MM')
    } else if (mode === 'year') {
      newValue.year = localValue.year || format(new Date(), 'yyyy')
    } else if (mode === 'range') {
      newValue.startDate = localValue.startDate || format(new Date(), 'yyyy-MM-dd')
      newValue.endDate = localValue.endDate || format(new Date(), 'yyyy-MM-dd')
    }
    
    setLocalValue(newValue)
  }

  const handleApply = () => {
    onChange(localValue)
    setIsOpen(false)
  }

  const handleClear = () => {
    const clearedValue: DateFilterValue = { mode: 'none' }
    setLocalValue(clearedValue)
    onChange(clearedValue)
    onClear?.()
    setIsOpen(false)
  }

  const getDisplayText = () => {
    if (value.mode === 'none' || !value.mode) return placeholder
    
    switch (value.mode) {
      case 'exact':
        return value.exactDate ? format(new Date(value.exactDate), 'MMM dd, yyyy') : placeholder
      case 'month':
        return value.month ? format(new Date(value.month + '-01'), 'MMMM yyyy') : placeholder
      case 'year':
        return value.year ? `Year ${value.year}` : placeholder
      case 'range':
        if (value.startDate && value.endDate) {
          return `${format(new Date(value.startDate), 'MMM dd')} - ${format(new Date(value.endDate), 'MMM dd, yyyy')}`
        }
        return placeholder
      default:
        return placeholder
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{label}</Label>
            <Select
              value={localValue.mode || 'none'}
              onValueChange={(value) => handleModeChange(value as DateFilterMode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Filter</SelectItem>
                <SelectItem value="exact">Exact Date</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {localValue.mode === 'exact' && (
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Input
                type="date"
                value={localValue.exactDate || ''}
                onChange={(e) => setLocalValue({ ...localValue, exactDate: e.target.value })}
              />
            </div>
          )}

          {localValue.mode === 'month' && (
            <div className="space-y-2">
              <Label>Select Month</Label>
              <div className="flex gap-2">
                <Select
                  value={localValue.month?.split('-')[1] || ''}
                  onValueChange={(month) => {
                    const year = localValue.month?.split('-')[0] || currentYear.toString()
                    setLocalValue({ ...localValue, month: `${year}-${month}` })
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={localValue.month?.split('-')[0] || ''}
                  onValueChange={(year) => {
                    const month = localValue.month?.split('-')[1] || '01'
                    setLocalValue({ ...localValue, month: `${year}-${month}` })
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {localValue.mode === 'year' && (
            <div className="space-y-2">
              <Label>Select Year</Label>
              <Select
                value={localValue.year || ''}
                onValueChange={(year) => setLocalValue({ ...localValue, year })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {localValue.mode === 'range' && (
            <div className="space-y-2">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={localValue.startDate || ''}
                  onChange={(e) => setLocalValue({ ...localValue, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={localValue.endDate || ''}
                  onChange={(e) => setLocalValue({ ...localValue, endDate: e.target.value })}
                  min={localValue.startDate}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}