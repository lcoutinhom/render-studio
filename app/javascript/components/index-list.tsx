import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "./ui/empty-state";
import { cn } from "../lib/utils";

/* Card-wrapped collection for resources with row actions. Rows stack on small screens. */
export function IndexList({
  children,
  empty,
  emptyIcon = Inbox,
  emptyAction,
  embedded = false,
}: {
  children: ReactNode;
  empty?: string;
  emptyIcon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  emptyAction?: ReactNode;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-card",
        embedded ? "rounded-b-lg" : "rounded-lg border shadow-card",
      )}
    >
      {empty ? (
        <EmptyState icon={emptyIcon} title={empty} action={emptyAction} compact={embedded} />
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </div>
  );
}
export function IndexRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        "relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5 [&_h2]:break-words [&_p]:break-words",
        className,
      )}
    >
      {children}
    </li>
  );
}
