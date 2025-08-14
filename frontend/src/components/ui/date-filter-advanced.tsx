import * as React from "react"
import { Calendar, CalendarDays, CalendarRange, ChevronDown } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { formatShortDate } from "@/lib/date-utils"
import { INDONESIAN_MONTHS } from "@/lib/date-constants"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { CalendarEnhanced } from "@/components/ui/calendar-enhanced"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DateFilterMode = "exact" | "month" | "year" | "range"

export interface DateFilterValue {
  mode: DateFilterMode
  date?: Date
  dateRange?: DateRange
  month?: { month: number; year: number }
  year?: number
}

interface DateFilterProps {
  value?: DateFilterValue
  onChange?: (value: DateFilterValue | undefined) => void
  placeholder?: string
  className?: string
}

export function DateFilterAdvanced({
  value,
  onChange,
  placeholder = "Select date filter",
  className,
}: DateFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<DateFilterMode>(value?.mode || "exact")
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value?.date)
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(value?.dateRange)
  const [selectedMonth, setSelectedMonth] = React.useState(value?.month || { month: new Date().getMonth(), year: new Date().getFullYear() })
  const [selectedYear, setSelectedYear] = React.useState(value?.year || new Date().getFullYear())

  // Auto-apply when exact date is selected
  React.useEffect(() => {
    if (mode === "exact" && selectedDate) {
      onChange?.({ mode: "exact", date: selectedDate })
      if (open) {
        setTimeout(() => setOpen(false), 100)
      }
    }
  }, [selectedDate, mode])

  // Auto-apply when month is changed
  React.useEffect(() => {
    if (mode === "month") {
      onChange?.({ mode: "month", month: selectedMonth })
    }
  }, [selectedMonth, mode])

  // Auto-apply when year is changed
  React.useEffect(() => {
    if (mode === "year") {
      onChange?.({ mode: "year", year: selectedYear })
    }
  }, [selectedYear, mode])

  // Auto-apply when range is selected (both dates)
  React.useEffect(() => {
    if (mode === "range" && selectedRange?.from && selectedRange?.to) {
      onChange?.({ mode: "range", dateRange: selectedRange })
      if (open) {
        setTimeout(() => setOpen(false), 100)
      }
    }
  }, [selectedRange, mode])

  const handleClear = () => {
    setSelectedDate(undefined)
    setSelectedRange(undefined)
    onChange?.(undefined)
    setOpen(false)
  }

  const getDisplayText = () => {
    if (!value) return placeholder

    switch (value.mode) {
      case "exact":
        return value.date ? formatShortDate(value.date, false) : placeholder
      case "month":
        if (value.month) {
          const date = new Date(value.month.year, value.month.month)
          return `${months[value.month.month]} ${value.month.year}`
        }
        return placeholder
      case "year":
        return value.year?.toString() || placeholder
      case "range":
        if (value.dateRange?.from) {
          if (value.dateRange.to) {
            return `${formatShortDate(value.dateRange.from, false)} - ${formatShortDate(value.dateRange.to, false)}`
          }
          return formatShortDate(value.dateRange.from, false)
        }
        return placeholder
    }
  }

  const months = INDONESIAN_MONTHS

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {getDisplayText()}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as DateFilterMode)}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Exact Date
                  </div>
                </SelectItem>
                <SelectItem value="month">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Month
                  </div>
                </SelectItem>
                <SelectItem value="year">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Year
                  </div>
                </SelectItem>
                <SelectItem value="range">
                  <div className="flex items-center">
                    <CalendarRange className="mr-2 h-4 w-4" />
                    Date Range
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="default" className="h-9 px-3" onClick={handleClear}>
              Clear
            </Button>
          </div>

          <div className="border-t pt-3">
            {mode === "exact" && (
              <CalendarEnhanced
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    // Ensure the date is set at noon to avoid timezone issues
                    const adjustedDate = new Date(date)
                    adjustedDate.setHours(12, 0, 0, 0)
                    setSelectedDate(adjustedDate)
                  } else {
                    setSelectedDate(undefined)
                  }
                }}
                allowArbitraryYear={true}
                initialFocus
              />
            )}

            {mode === "month" && (
              <div className="space-y-2">
                <Select 
                  value={selectedMonth.month.toString()} 
                  onValueChange={(v) => setSelectedMonth({ ...selectedMonth, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={month} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedMonth.year.toString()} 
                  onValueChange={(v) => setSelectedMonth({ ...selectedMonth, year: parseInt(v) })}
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

            {mode === "year" && (
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
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
            )}

            {mode === "range" && (
              <CalendarComponent
                mode="range"
                selected={selectedRange}
                onSelect={setSelectedRange}
                numberOfMonths={2}
                initialFocus
              />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function getDateFilterRange(filter: DateFilterValue): { from: Date; to: Date } {
  switch (filter.mode) {
    case "exact":
      if (filter.date) {
        const start = new Date(filter.date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(filter.date)
        end.setHours(23, 59, 59, 999)
        return { from: start, to: end }
      }
      break
    case "month":
      if (filter.month) {
        const date = new Date(filter.month.year, filter.month.month)
        return {
          from: startOfMonth(date),
          to: endOfMonth(date)
        }
      }
      break
    case "year":
      if (filter.year) {
        const date = new Date(filter.year, 0)
        return {
          from: startOfYear(date),
          to: endOfYear(date)
        }
      }
      break
    case "range":
      if (filter.dateRange?.from) {
        return {
          from: filter.dateRange.from,
          to: filter.dateRange.to || filter.dateRange.from
        }
      }
      break
  }
  
  return { from: new Date(), to: new Date() }
}