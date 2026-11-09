import { Link } from "@inertiajs/react";
import type { ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";

/* Metric tile. Shows only real values supplied by the backend. */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number | string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  href?: string;
  hint?: string;
  tone?: "neutral" | "danger" | "info" | "success";
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <Icon
            aria-hidden
            className={cn(
              "size-4 text-muted-foreground",
              tone === "danger" && Number(value) > 0 && "text-destructive",
              tone === "info" && Number(value) > 0 && "text-info",
              tone === "success" && "text-success",
            )}
          />
        )}
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-[34px] tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      {(hint || href) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {hint}
          {href && (
            <ArrowUpRight
              aria-hidden
              className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          )}
        </p>
      )}
    </>
  );
  const classes = cn(
    "group block rounded-lg border bg-card p-4 shadow-card sm:p-5",
    href && "transition-colors hover:border-gray-300 dark:hover:border-gray-700",
    className,
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
