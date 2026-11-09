import { Link } from "@inertiajs/react";
import type { RenderIssue } from "../lib/render-readiness";
export function RenderReadiness({
  issues,
  compact = false,
}: {
  issues: RenderIssue[];
  compact?: boolean;
}) {
  return (
    <section
      aria-label="Preparação para renderizar"
      className={
        compact ? "mt-2 space-y-1 text-xs" : "space-y-3 rounded-lg border p-4"
      }
    >
      <p className="font-medium">
        {issues.length
          ? `Falta resolver ${issues.length} pendência(s) para renderizar`
          : "Ambiente pronto para configurar a renderização"}
      </p>
      {issues.length > 0 && (
        <ul className="list-disc space-y-2 pl-5">
          {issues.map((issue, index) => (
            <li key={index}>
              {issue.message}{" "}
              <Link
                className="font-medium text-primary underline"
                href={issue.href}
              >
                {issue.action}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <p className="text-sm text-muted-foreground">
          Câmera própria, materiais personalizados e preset são opcionais. Sem
          essas escolhas, o sistema usa câmera automática, materiais do modelo e
          configurações padrão. Para escolher o enquadramento, cadastre uma
          câmera na aba Câmeras. Esta checagem não avalia se faltam móveis ou
          partes da geometria no arquivo.
        </p>
      )}
    </section>
  );
}
