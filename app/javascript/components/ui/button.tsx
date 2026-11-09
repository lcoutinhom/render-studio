import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-[var(--dur-fast)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-busy:cursor-progress [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:translate-y-px",
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:translate-y-px",
        outline:
          "border-gray-300 bg-card text-foreground shadow-xs hover:border-gray-400 hover:bg-muted/60 dark:border-gray-700 dark:hover:border-gray-600",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-gray-200 dark:hover:bg-gray-800",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        link: "h-auto min-h-0 border-transparent bg-transparent px-0 py-0 text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground",
        mono: "border-transparent bg-foreground text-background",
      },
      size: {
        default: "h-9 px-3.5",
        md: "h-9 px-3.5",
        sm: "h-8 px-2.5 text-[13px]",
        lg: "h-11 px-5 text-[15px]",
      },
      mode: { default: "", icon: "aspect-square px-0" },
    },
    compoundVariants: [
      { mode: "icon", size: ["default", "md"], className: "w-9" },
      { mode: "icon", size: "sm", className: "w-8" },
      { mode: "icon", size: "lg", className: "w-11" },
    ],
    defaultVariants: { variant: "primary", size: "md", mode: "default" },
  },
);

function Button({
  asChild = false,
  variant,
  size,
  mode,
  loading = false,
  className,
  type,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, mode }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          {mode === "icon" ? null : children}
        </>
      ) : (
        children
      )}
    </Component>
  );
}

export { Button, buttonVariants };
