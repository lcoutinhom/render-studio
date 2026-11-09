import { Box } from "lucide-react";
export function Brand({
  compact = false,
  subtitle = false,
}: {
  compact?: boolean;
  subtitle?: boolean;
}) {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Box aria-hidden="true" strokeWidth={1.75} />
      </span>
      {!compact && (
        <span className="brand-name leading-tight">
          Render Studio
          {subtitle && <small>Estúdio de renderização</small>}
        </span>
      )}
    </span>
  );
}
