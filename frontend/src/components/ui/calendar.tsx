import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { INDONESIAN_MONTHS } from "@/lib/date-constants"

const indonesianLabels = {
  labelMonthDropdown: () => "Bulan",
  labelYearDropdown: () => "Tahun",
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout="dropdown-months"
      fromYear={1900}
      toYear={2100}
      formatters={{
        formatMonthDropdown: (month) => INDONESIAN_MONTHS[month.getMonth()],
      }}
      labels={indonesianLabels}
      classNames={{
        root: "rdp",
        months: "rdp-months flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "rdp-month space-y-4",
        month_caption: "rdp-month_caption flex justify-center pt-1 relative items-center",
        caption_label: "rdp-caption_label text-sm font-medium",
        dropdowns: "rdp-dropdowns flex gap-2",
        dropdown_month: "rdp-dropdown_month",
        dropdown_year: "rdp-dropdown_year",
        dropdown: cn(
          "appearance-none border rounded px-2 py-1 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        ),
        nav: "rdp-nav flex items-center space-x-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
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
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="h-4 w-4" />
          return <ChevronRight className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }