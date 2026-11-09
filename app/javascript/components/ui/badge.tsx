import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";
const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground [--dot:var(--color-gray-400)]",
  success: "border-success/20 bg-success-soft text-success [--dot:var(--success)]",
  warning: "border-warning/25 bg-warning-soft text-warning [--dot:var(--warning)]",
  danger: "border-destructive/20 bg-destructive-soft text-destructive [--dot:var(--destructive)]",
  info: "border-info/20 bg-info-soft text-info [--dot:var(--info)]",
  accent: "border-brand-500/25 bg-accent text-accent-foreground [--dot:var(--color-brand-500)]",
};

/* Status always pairs color with a dot and a text label (never color alone). */
export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone; dot?: boolean; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span aria-hidden="true" className="relative flex size-1.5">
          {pulse && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--dot)] opacity-60" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-[var(--dot)]" />
        </span>
      )}
      {children}
    </span>
  );
}

const statusTones: Record<string, BadgeTone> = {
  active: "success",
  completed: "success",
  succeeded: "success",
  ready: "success",
  confirmed: "success",
  processing: "info",
  running: "info",
  queued: "neutral",
  pending: "neutral",
  draft: "neutral",
  archived: "neutral",
  canceled: "neutral",
  cancelled: "neutral",
  partially_completed: "warning",
  stale: "warning",
  failed: "danger",
  error: "danger",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  const tone = statusTones[status] ?? "neutral";
  const live = status === "processing" || status === "running";
  return (
    <Badge tone={tone} dot pulse={live} className={className}>
      {label}
    </Badge>
  );
}
