import type { ComponentProps } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/utils";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "border-border bg-card",
  info: "border-info/25 bg-info-soft [&>svg]:text-info",
  success: "border-success/25 bg-success-soft [&>svg]:text-success",
  warning: "border-warning/30 bg-warning-soft [&>svg]:text-warning",
  danger: "border-destructive/25 bg-destructive-soft [&>svg]:text-destructive",
};
const icons = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

export function Alert({
  className,
  tone = "neutral",
  icon = true,
  role,
  children,
  ...props
}: ComponentProps<"div"> & { tone?: Tone; icon?: boolean }) {
  const Icon = icons[tone];
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn(
        "flex gap-3 rounded-lg border p-3.5 text-sm text-foreground [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon && <Icon aria-hidden="true" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
export function AlertTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("font-semibold leading-5", className)} {...props} />;
}
export function AlertDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("mt-1 text-muted-foreground", className)} {...props} />
  );
}
