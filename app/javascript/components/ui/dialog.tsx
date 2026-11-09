import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) => (
  <Primitive.Title
    className={cn(
      "pr-8 text-lg font-semibold leading-7 tracking-[-0.01em]",
      className,
    )}
    {...props}
  />
);
export const DialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) => (
  <Primitive.Description
    className={cn("mt-1.5 text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
);
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <Primitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-popover p-6 text-popover-foreground shadow-dialog outline-none data-[state=open]:animate-dialog-in",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close
          aria-label="Fechar"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-5", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "-mx-6 -mb-6 mt-6 flex flex-col-reverse gap-2 border-t bg-muted/40 px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
