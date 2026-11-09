import type { ComponentProps, ReactNode } from "react";
import { Label } from "./ui/label";
import { Input, controlClass } from "./ui/input";
import { cn } from "../lib/utils";

/* Labelled form field: visible label, optional hint and inline error wired via aria-describedby. */
export function Field({
  label,
  id,
  hint,
  error,
  className,
  children,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string;
  children?: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", children ? className : undefined)}>
      <Label htmlFor={id} required={props.required}>
        {label}
      </Label>
      {children ?? (
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={className}
          {...props}
        />
      )}
      {hint && (
        <p id={hintId} className="text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* Kept for pages that build native selects/textareas inline. */
export const selectClass = `${controlClass} h-9 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%237d776f%22 stroke-width=%221.75%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9`;
export const textareaClass = `${controlClass} min-h-24 py-2 leading-relaxed`;
