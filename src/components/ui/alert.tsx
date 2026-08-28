import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * shadcn's Alert, restyled into The Invitation.
 *
 * Four upstream decisions are replaced because this world already decided them:
 * `rounded-lg` (the sheet is print, radius is 0), `bg-card` (there is one ground
 * and it is paper), `line-clamp-1` on the title (Khmer wraps and must never be
 * cut mid cluster), and `leading-relaxed` on the description (1.625, below the
 * 1.75 floor that keeps coeng subscripts off the next line).
 *
 * The upstream `destructive` variant is gone rather than restyled. DESIGN.md:
 * "No red. The palette has no error colour and the system does not invent one."
 * A variant that renders identically to the default is dead API pretending to be
 * a choice. Errors here are a note in plate ink with an alert glyph, and the
 * glyph is what makes it read as a warning.
 */
const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-x-3 gap-y-0.5 px-3 py-3 text-sm has-[>svg]:grid-cols-[1.25rem_1fr] sm:px-4 [&>svg]:size-4 [&>svg]:translate-y-1 [&>svg]:text-ink",
  {
    variants: {
      variant: {
        /** Stands on its own: the field container's 70 percent rule. */
        note: "border border-rule/70 bg-paper text-ink",
        /** Sits inside a panel that already draws its own border. */
        inset: "border-t border-hairline bg-paper text-ink",
      },
    },
    defaultVariants: {
      variant: "note",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("km col-start-2 text-sm font-semibold text-ink", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "km col-start-2 grid justify-items-start gap-1 text-sm text-rule",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
