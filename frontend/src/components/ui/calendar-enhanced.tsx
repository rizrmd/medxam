import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INDONESIAN_MONTHS } from "@/lib/date-constants"

export type CalendarEnhancedProps = React.ComponentProps<typeof DayPicker> & {
  allowArbitraryYear?: boolean
}

function CalendarEnhanced({
  className,
  classNames,
  showOutsideDays = true,
  allowArbitraryYear = false,
  ...props
}: CalendarEnhancedProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    props.selected instanceof Date ? props.selected : 
    props.defaultMonth || 
    new Date()
  )
  const [customYear, setCustomYear] = React.useState<string>("")

  const CustomCaption: React.FC<any> = (props) => {
    // Use the displayMonth from props if available, otherwise use currentMonth
    const monthToDisplay = props?.displayMonth || currentMonth
    
    if (!monthToDisplay || !(monthToDisplay instanceof Date)) {
      return null
    }
    
    const currentYear = monthToDisplay.getFullYear()
    const currentMonthIndex = monthToDisplay.getMonth()

    const handlePreviousMonth = () => {
      const newDate = new Date(currentYear, currentMonthIndex - 1)
      setCurrentMonth(newDate)
    }

    const handleNextMonth = () => {
      const newDate = new Date(currentYear, currentMonthIndex + 1)
      setCurrentMonth(newDate)
    }

    return (
      <div className="flex items-center justify-between w-full px-2 py-2">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-2">
          <Select
            value={currentMonthIndex.toString()}
            onValueChange={(value) => {
              const newMonth = parseInt(value)
              const newDate = new Date(currentYear, newMonth)
              setCurrentMonth(newDate)
            }}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDONESIAN_MONTHS.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {allowArbitraryYear ? (
            <Input
              type="number"
              value={customYear || currentYear}
              onChange={(e) => setCustomYear(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const year = parseInt(customYear || currentYear.toString())
                  if (!isNaN(year) && year >= 1900 && year <= 2100) {
                    const newDate = new Date(year, currentMonthIndex)
                    setCurrentMonth(newDate)
                    setCustomYear("")
                  }
                }
              }}
              onBlur={() => {
                if (customYear) {
                  const year = parseInt(customYear)
                  if (!isNaN(year) && year >= 1900 && year <= 2100) {
                    const newDate = new Date(year, currentMonthIndex)
                    setCurrentMonth(newDate)
                  }
                  setCustomYear("")
                }
              }}
              className="w-20 h-8 text-center"
              placeholder={currentYear.toString()}
              min={1900}
              max={2100}
            />
          ) : (
            <Select
              value={currentYear.toString()}
              onValueChange={(value) => {
                const newYear = parseInt(value)
                const newDate = new Date(newYear, currentMonthIndex)
                setCurrentMonth(newDate)
              }}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 201 }, (_, i) => 1900 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      components={{
        MonthCaption: CustomCaption,
      }}
      classNames={{
        root: "rdp",
        months: "rdp-months flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "rdp-month space-y-4",
        month_caption: "rdp-month_caption",
        caption_label: "hidden",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_grid: "rdp-month_grid w-full border-collapse space-y-1",
        weekdays: "rdp-weekdays flex",
        weekday: "rdp-weekday text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "rdp-week flex w-full mt-2",
        day: "rdp-day",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
CalendarEnhanced.displayName = "CalendarEnhanced"

export { CalendarEnhanced }