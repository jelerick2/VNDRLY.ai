import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

const LoaderIcon = Loader2Icon as React.ComponentType<React.SVGProps<SVGSVGElement>>

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
