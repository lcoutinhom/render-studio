import type { ComponentProps } from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "../../lib/utils";
export function Switch({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-gray-300 transition-colors duration-[var(--dur-fast)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 data-[state=checked]:bg-primary dark:bg-gray-700",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-xs transition-transform duration-[var(--dur-fast)] data-[state=checked]:translate-x-[17px] dark:data-[state=checked]:bg-gray-900" />
    </Primitive.Root>
  );
}
