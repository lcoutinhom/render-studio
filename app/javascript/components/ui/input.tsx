import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/* Shared control styling for inputs, selects and textareas. */
export const controlClass =
  "w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] placeholder:text-muted-foreground/80 hover:border-gray-600 focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ring)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 read-only:bg-muted/50 aria-invalid:border-destructive aria-invalid:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_18%,transparent)] dark:hover:border-gray-600";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        controlClass,
        "h-9 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium",
        props.type === "file" && "h-auto py-1.5",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        controlClass,
        "h-9 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%237d776f%22 stroke-width=%221.75%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClass, "min-h-24 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}
