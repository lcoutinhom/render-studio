import type { ReactNode } from "react";
import { Tooltip as Primitive } from "radix-ui";

/* Supplementary hint only; never the sole carrier of information. */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Primitive.Provider delayDuration={300}>
      <Primitive.Root>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            side={side}
            sideOffset={6}
            className="z-[60] max-w-64 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-50 shadow-pop data-[state=delayed-open]:animate-fade-in dark:bg-gray-100 dark:text-gray-900"
          >
            {content}
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
