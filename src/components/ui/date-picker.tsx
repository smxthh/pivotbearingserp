
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date | string | undefined
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    disabled = false,
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Convert string to Date if necessary, handle empty strings
    const parsedDate = typeof value === 'string' && value.trim() !== '' ? new Date(value) : value;
    // Validate that the date is a valid Date object
    const dateValue = parsedDate instanceof Date && !isNaN(parsedDate.getTime()) ? parsedDate : undefined;

    const handleSelect = (date: Date | undefined) => {
        onChange?.(date);
        setOpen(false); // Auto-close after selection
    };

    return (
        <Popover modal={true} open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    disabled={disabled}
                    className={cn(
                        "w-full min-w-0 justify-start text-left font-normal text-sm h-10 overflow-hidden",
                        !dateValue && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                        {dateValue ? format(dateValue, "dd MMM yyyy") : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={handleSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
