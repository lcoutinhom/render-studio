import { Link, router } from "@inertiajs/react";
import { ImageIcon, Video, Box, Download, ArrowUpRight } from "lucide-react";
import { kindLabels, fileSize, type RenderOutput } from "../types/outputs";
export function ProjectOutputs({
  outputs,
  total,
  page = 1,
  href,
}: {
  outputs: RenderOutput[];
  total?: number;
  page?: number;
  href?: string;
}) {
  return (
    <div className="space-y-4">
      {!outputs.length && (
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <ImageIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Sua galeria começa aqui</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione fotografias e inicie uma renderização para ver os
            resultados.
          </p>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {outputs.map((output) => (
          <article
            key={output.id}
            className="overflow-hidden rounded-lg border bg-card"
          >
            <Link
              href={`/outputs/${output.id}`}
              className="group relative flex aspect-video items-center justify-center overflow-hidden bg-muted/40"
              aria-label={`Abrir ${output.filename}`}
            >
              {output.preview_url &&
              (output.kind === "image" || output.kind === "panorama") ? (
                <img
                  src={output.preview_url}
                  alt={output.environment_name || output.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : output.kind === "video" ? (
                <Video className="size-12 text-muted-foreground" />
              ) : (
                <Box className="size-12 text-muted-foreground" />
              )}
              <span className="absolute left-3 top-3 rounded-md bg-black/65 px-2 py-1 text-xs text-white">
                {kindLabels[output.kind]}
              </span>
            </Link>
            <div className="space-y-3 p-4">
              <Link
                className="block truncate text-sm font-medium"
                href={`/outputs/${output.id}`}
              >
                {output.filename}
              </Link>
              <p className="text-xs text-muted-foreground">
                {kindLabels[output.kind]} · {fileSize(output.byte_size)} ·{" "}
                {new Date(output.created_at).toLocaleString("pt-BR")}
              </p>
              <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs">
                <Link
                  className="inline-flex items-center gap-1 text-primary"
                  href={`/outputs/${output.id}`}
                >
                  Abrir resultado <ArrowUpRight className="size-3.5" />
                </Link>
                <a
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  href={output.download_url}
                >
                  <Download className="size-3.5" /> Baixar
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {href && total !== undefined && total > 20 && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded border px-3 py-2 text-sm disabled:opacity-40"
            onClick={() =>
              router.get(
                href,
                { outputs_page: page - 1 },
                { preserveState: true, preserveScroll: true },
              )
            }
          >
            Resultados anteriores
          </button>
          <span className="text-sm">
            Página {page} de {Math.ceil(total / 20)}
          </span>
          <button
            type="button"
            disabled={page * 20 >= total}
            className="rounded border px-3 py-2 text-sm disabled:opacity-40"
            onClick={() =>
              router.get(
                href,
                { outputs_page: page + 1 },
                { preserveState: true, preserveScroll: true },
              )
            }
          >
            Próximos resultados
          </button>
        </div>
      )}
    </div>
  );
}
