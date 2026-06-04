import { cn } from "@/lib/utils"

// shadcn-style skeleton: a pulsing neutral placeholder block. Tune size/shape
// with className (e.g. h-4 w-24 rounded-full).
function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

export { Skeleton }
